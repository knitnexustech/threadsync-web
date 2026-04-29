
import { supabase, supabaseAdmin } from './supabaseClient';
import {
    Company, User, Order, Channel, Message,
    AttachedFile, UserRole, ChannelMember, OrderMember,
    hasPermission, ChannelType, Partnership
} from './types';

// Feature-specific API modules — add new features here as separate files
import * as partnershipApi     from './api/partnerships';
import * as companyApi         from './api/companies';
import * as contactsApi        from './api/contacts';
import * as deliveryChallanApi from './api/deliveryChallans';
import * as inwardChallanApi   from './api/inwardChallans';
import * as salesInvoiceApi    from './api/salesInvoices';
import * as purchaseInvoiceApi from './api/purchaseInvoices';
import * as expensesApi        from './api/expenses';
import * as partnerUtils     from './services/partnerUtils';

// ============================================
// AUTHENTICATION
// ============================================

export const api = {

    login: async (phone: string, passcode: string) => {
        // Validate phone number format (must be exactly 10 digits)
        if (!/^\d{10}$/.test(phone)) {
            throw new Error('Phone number must be exactly 10 digits');
        }

        // Validate passcode format (must be exactly 4 digits)
        if (!/^\d{4}$/.test(passcode)) {
            throw new Error('Passcode must be exactly 4 digits');
        }

        // Find user by phone
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .single();

        if (userError || !user) {
            throw new Error('Invalid phone number');
        }

        // Check passcode
        if (user.passcode !== passcode) {
            throw new Error('Invalid passcode');
        }

        // Get company
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', user.company_id)
            .single();

        if (companyError) {
            throw new Error('Company not found');
        }

        return { user: user as User, company: company as Company };
    },

    signup: async (params: {
        companyName: string;
        gstNumber?: string;
        address?: string;
        state?: string;
        pincode?: string;
        adminName: string;
        phone: string;
        passcode: string;
    }) => {
        const { companyName, gstNumber, address, state, pincode, adminName, phone, passcode } = params;

        if (!/^\d{10}$/.test(phone)) throw new Error('Phone number must be exactly 10 digits');
        if (!/^\d{4}$/.test(passcode))  throw new Error('Passcode must be exactly 4 digits');
        if (pincode && !/^\d{6}$/.test(pincode)) throw new Error('PIN code must be 6 digits');

        // Block duplicate phone numbers
        const { data: existingUser } = await supabaseAdmin
            .from('users').select('id').eq('phone', phone).single();
        if (existingUser) throw new Error('This phone number is already registered');

        // Block duplicate GST (in case they bypassed the Step 1 check)
        if (gstNumber) {
            const { data: existingCompany } = await supabaseAdmin
                .from('companies').select('id').eq('gst_number', gstNumber).single();
            if (existingCompany) throw new Error('This GST number is already registered on Kramiz');
        }

        // Generate a unique Kramiz ID like KRMZ-8A2F9
        const kramizId = 'KRMZ-' + Math.random().toString(36).substring(2, 7).toUpperCase();

        // Create the company
        const { data: newCompany, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert({
                name:       companyName.trim(),
                kramiz_id:  kramizId,
                gst_number: gstNumber || null,
                address:    address?.trim()  || null,
                state:      state?.trim()    || null,
                pincode:    pincode?.trim()  || null,
            })
            .select()
            .single();

        if (companyError) throw new Error('Failed to create company: ' + companyError.message);

        // Create the admin user
        const { data: newUser, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                company_id: newCompany.id,
                name:       adminName.trim(),
                phone,
                passcode,
                role: 'ADMIN',
            })
            .select()
            .single();

        if (userError) throw new Error('Failed to create user: ' + userError.message);

        // ── Contacts & Channels Auto-Bridge ─────────────────────────────────
        await partnerUtils.bridgeContactToCompany(newCompany.id);

        return { user: newUser as User, company: newCompany as Company, kramizId };
    },

    // ============================================
    // ORDERS
    // ============================================

    getOrders: async (currentUser: User): Promise<Order[]> => {
        if (!currentUser) throw new Error('User not authenticated');

        // Robust visibility: Match by creator ID, company UUID, or company Name (fallback)
        const filters = [`created_by.eq.${currentUser.id}`];
        
        if (currentUser.company_id) {
            filters.push(`manufacturer_id.eq.${currentUser.company_id}`);
        }
        
        // If we have the company name, try to match orders where manufacturer_id might be 
        // linked to a company with that name (rare fallback)
        if (currentUser.company?.name) {
             // We can't easily join-filter in a single .or() in Supabase without complex RPC,
             // so we rely on the UUID being correctly synced now.
        }

        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                manufacturer_company:companies!manufacturer_id(*)
            `)
            .or(filters.join(','))
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []) as Order[];
    },

    createOrder: async (currentUser: User, orderNumber: string, styleNumber: string, teamMemberIds: string[]): Promise<Order> => {
        if (!hasPermission(currentUser.role, 'CREATE_ORDER')) {
            throw new Error('You do not have permission to create orders');
        }

        const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
                manufacturer_id: currentUser.company_id,
                order_number: orderNumber,
                style_number: styleNumber,
                status: 'PENDING',
                image_url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=100&h=100',
                created_by: currentUser.id
            })
            .select()
            .single();

        if (orderError) throw new Error('Failed to create order: ' + orderError.message);

        const { data: overviewChannel, error: channelError } = await supabase
            .from('channels')
            .insert({
                order_id: newOrder.id,
                name: 'Overview',
                type: 'OVERVIEW',
                status: 'IN_PROGRESS',
                vendor_id: null
            })
            .select()
            .single();

        if (channelError) throw new Error('Failed to create overview channel: ' + channelError.message);

        const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', currentUser.company_id)
            .eq('role', 'ADMIN');

        const adminIds = (admins || []).map(a => a.id);
        const allMemberIds = Array.from(new Set([...teamMemberIds, ...adminIds, currentUser.id]));

        if (allMemberIds.length > 0) {
            const channelMembers = allMemberIds.map(userId => ({
                channel_id: overviewChannel.id,
                user_id: userId,
                added_by: currentUser.id
            }));

            const { error: memberError } = await supabase
                .from('channel_members')
                .insert(channelMembers);

            if (memberError) {
                console.error('Failed to add default members:', memberError);
                // We don't necessarily throw here to avoid failing the whole order creation,
                // but we log it. In a production app, we might want a retry or more robust sync.
            }
        }

        return newOrder as Order;
    },

    /**
     * Ensures an 'Overview' channel exists for an order.
     * Useful for orders created before this logic was automated or if creation failed midway.
     */
    deleteChannel: async (currentUser: User, channelId: string) => {
        const isAdmin = ['ADMIN', 'SENIOR_MANAGER', 'SENIOR_MERCHANDISER'].includes(currentUser.role);
        if (!isAdmin) throw new Error('You do not have permission to delete groups');

        // Delete associated data manually to be safe (though DB should handle cascade)
        await supabase.from('channel_members').delete().eq('channel_id', channelId);
        await supabase.from('messages').delete().eq('channel_id', channelId);
        await supabase.from('channel_specs').delete().eq('channel_id', channelId);
        await supabase.from('channel_files').delete().eq('channel_id', channelId);

        const { error } = await supabase
            .from('channels')
            .delete()
            .eq('id', channelId);

        if (error) throw new Error('Failed to delete: ' + error.message);
    },

    repairOrderOverview: async (currentUser: User, orderId: string) => {
        // 1. Initial check
        const { data: existing } = await supabase
            .from('channels')
            .select('id')
            .eq('order_id', orderId)
            .eq('type', 'OVERVIEW')
            .maybeSingle();

        if (existing) return existing;

        try {
            // 2. Try to create it. If another process beat us to it, the DB unique index (from infra/fix_duplicate_overview.sql)
            // will catch it, or the check above will miss it in a race condition.
            const { data: newChannel, error: channelError } = await supabase
                .from('channels')
                .insert({
                    order_id: orderId,
                    name: 'Overview',
                    type: 'OVERVIEW',
                    status: 'IN_PROGRESS',
                    vendor_id: null
                })
                .select()
                .single();

            // If we hit a unique constraint error (code 23505), just fetch existing and return
            if (channelError) {
                const { data: retryExisting } = await supabase
                    .from('channels')
                    .select('id')
                    .eq('order_id', orderId)
                    .eq('type', 'OVERVIEW')
                    .maybeSingle();
                if (retryExisting) return retryExisting;
                throw new Error('Failed to repair overview channel: ' + channelError.message);
            }

            // 3. Add default members
            const { data: admins } = await supabase
                .from('users')
                .select('id')
                .eq('company_id', currentUser.company_id)
                .eq('role', 'ADMIN');

            const { data: poData } = await supabase
                .from('orders')
                .select('created_by')
                .eq('id', orderId)
                .single();

            const poCreatorId = poData?.created_by;
            const adminIds = (admins || []).map(a => a.id);
            const allMemberIds = Array.from(new Set([...adminIds, currentUser.id, ...(poCreatorId ? [poCreatorId] : [])]));

            if (allMemberIds.length > 0) {
                const channelMembers = allMemberIds.map(userId => ({
                    channel_id: newChannel.id,
                    user_id: userId,
                    added_by: currentUser.id
                }));
                await supabase.from('channel_members').insert(channelMembers);
            }

            return newChannel;
        } catch (err) {
            console.error('[Repair] Conflict or failure:', err);
            // Fallback second check
            const { data: finalCheck } = await supabase.from('channels').select('id').eq('order_id', orderId).eq('type', 'OVERVIEW').maybeSingle();
            return finalCheck;
        }
    },

    deleteOrder: async (currentUser: User, orderId: string) => {
        if (!hasPermission(currentUser.role, 'DELETE_ORDER')) {
            throw new Error('You do not have permission to delete orders');
        }

        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId)
            .eq('manufacturer_id', currentUser.company_id);

        if (error) throw new Error('Failed to delete order: ' + error.message);
    },

    updateOrderStatus: async (orderId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'): Promise<Order> => {
        const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as Order;
    },

    updateOrder: async (currentUser: User, orderId: string, updates: Partial<Order>) => {
        if (!hasPermission(currentUser.role, 'EDIT_ORDER')) {
            throw new Error('You do not have permission to edit orders');
        }

        const allowedUpdates: any = {};
        if (updates.order_number !== undefined) allowedUpdates.order_number = updates.order_number;
        if (updates.style_number !== undefined) allowedUpdates.style_number = updates.style_number;
        if (updates.status !== undefined) allowedUpdates.status = updates.status;
        if (updates.image_url !== undefined) allowedUpdates.image_url = updates.image_url;

        const { data, error } = await supabase
            .from('orders')
            .update(allowedUpdates)
            .eq('id', orderId)
            .eq('manufacturer_id', currentUser.company_id)
            .select()
            .single();

        if (error) throw new Error('Failed to update order: ' + error.message);
        return data as Order;
    },

    // ============================================
    // CHANNELS
    // ============================================

    getChannels: async (currentUser: User, orderId: string) => {
        const { data, error } = await supabase
            .from('channels')
            .select(`
                *,
                channel_members!inner(user_id, last_read_at),
                channel_specs(*),
                channel_files(*),
                messages(content, created_at)
            `)
            .eq('order_id', orderId)
            .eq('channel_members.user_id', currentUser.id)
            .order('created_at', { foreignTable: 'messages', ascending: false });

        if (error) throw new Error(error.message);

        return (data || []).map(channel => ({
            ...channel,
            specs: channel.channel_specs || [],
            files: (channel.channel_files || []).map((f: any) => ({
                ...f,
                uploadedBy: f.uploaded_by,
                uploadedAt: f.uploaded_at
            })),
            last_read_at: (channel.channel_members?.[0] as any)?.last_read_at,
            last_message: (() => {
                const raw = (channel.messages?.[0] as any)?.content || '';
                if (raw.startsWith('[IMAGE]')) return 'Photo';
                if (raw.startsWith('[FILE]')) return 'File';
                if (raw.startsWith('[AUDIO]')) return 'Audio';
                if (raw.startsWith('[DELETED]')) return 'Message deleted';
                return raw || null;
            })()
        })) as Channel[];
    },

    getAllChannels: async (currentUser: User) => {
        const { data, error } = await supabase
            .from('channels')
            .select(`
                *,
                channel_members!inner(user_id, last_read_at),
                channel_specs(*),
                channel_files(*),
                messages(content, created_at),
                order:order_id(*),
                vendor:vendor_id(id, name)
            `)
            .eq('channel_members.user_id', currentUser.id)
            .order('created_at', { foreignTable: 'messages', ascending: false });

        if (error) throw new Error(error.message);

        return (data || []).map(channel => ({
            ...channel,
            specs: channel.channel_specs || [],
            files: (channel.channel_files || []).map((f: any) => ({
                ...f,
                uploadedBy: f.uploaded_by,
                uploadedAt: f.uploaded_at
            })),
            last_read_at: (channel.channel_members?.[0] as any)?.last_read_at,
            last_message: (() => {
                const raw = (channel.messages?.[0] as any)?.content || '';
                if (raw.startsWith('[IMAGE]')) return 'Photo';
                if (raw.startsWith('[FILE]')) return 'File';
                if (raw.startsWith('[AUDIO]')) return 'Audio';
                if (raw.startsWith('[DELETED]')) return 'Message deleted';
                return raw || null;
            })()
        })) as Channel[];
    },

    createChannel: async (currentUser: User, orderId: string, name: string, vendorId?: string | null, contactId?: string | null): Promise<Channel> => {
        if (!hasPermission(currentUser.role, 'CREATE_CHANNEL')) {
            throw new Error('You do not have permission to create groups');
        }

        const { data: newChannel, error: channelError } = await supabase
            .from('channels')
            .insert({
                order_id: orderId,
                name: name,
                vendor_id: vendorId || null,
                contact_id: contactId || null,
                type: (vendorId || contactId) ? 'VENDOR' : 'INTERNAL',
                status: 'ACTIVE'
            })
            .select()
            .single();

        if (channelError) throw new Error(channelError.message);

        // Auto-add default members (Our Admins + Partner Admins + Current User + Order Creator)
        const { data: ourAdmins } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', currentUser.company_id)
            .eq('role', 'ADMIN');

        let partnerAdminIds: string[] = [];
        if (vendorId) {
            const { data: pAdmins } = await supabase
                .from('users')
                .select('id')
                .eq('company_id', vendorId)
                .eq('role', 'ADMIN');
            if (pAdmins) partnerAdminIds = pAdmins.map(a => a.id);
        }

        const { data: poData } = await supabase
            .from('orders')
            .select('created_by')
            .eq('id', orderId)
            .single();

        const poCreatorId = poData?.created_by;
        const ourAdminIds = (ourAdmins || []).map(a => a.id);
        
        const allMemberIds = Array.from(new Set([
            ...ourAdminIds, 
            ...partnerAdminIds, 
            currentUser.id, 
            ...(poCreatorId ? [poCreatorId] : [])
        ]));

        if (allMemberIds.length > 0) {
            const channelMembers = allMemberIds.map(userId => ({
                channel_id: newChannel.id,
                user_id: userId,
                added_by: currentUser.id
            }));
            await supabase.from('channel_members').insert(channelMembers);
        }

        return { ...newChannel, specs: [], files: [] } as Channel;
    },

    updateChannelStatus: async (channelId: string, status: string) => {
        const { data, error } = await supabase
            .from('channels')
            .update({ status })
            .eq('id', channelId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    updateChannel: async (currentUser: User, channelId: string, updates: Partial<Channel>) => {
        if (!hasPermission(currentUser.role, 'EDIT_CHANNEL')) {
            throw new Error('You do not have permission to edit channels');
        }

        const allowedUpdates: any = {};
        if (updates.name !== undefined) allowedUpdates.name = updates.name;
        if (updates.type !== undefined) allowedUpdates.type = updates.type;
        if (updates.status !== undefined) allowedUpdates.status = updates.status;
        if (updates.vendor_id !== undefined) allowedUpdates.vendor_id = updates.vendor_id;
        if (updates.due_date !== undefined) allowedUpdates.due_date = updates.due_date;

        const { data, error } = await supabase
            .from('channels')
            .update(allowedUpdates)
            .eq('id', channelId)
            .select()
            .single();

        if (error) throw new Error('Failed to update channel: ' + error.message);
        return data;
    },

    // ============================================
    // CHANNEL MEMBERS
    // ============================================

    getChannelMembers: async (channelId: string) => {
        const { data, error } = await supabase
            .from('channel_members')
            .select(`
                *,
                users!user_id (*, companies!company_id(name))
            `)
            .eq('channel_id', channelId);

        if (error) throw new Error(error.message);
        return (data || []).map(cm => ({
            ...cm.users,
            company: cm.users.companies
        })).filter(Boolean) as User[];
    },

    addChannelMember: async (currentUser: User, channelId: string, userId: string) => {
        if (!hasPermission(currentUser.role, 'ADD_CHANNEL_MEMBER')) {
            throw new Error('You do not have permission to add channel members');
        }

        const { data: existing } = await supabase
            .from('channel_members')
            .select('id')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .single();

        if (existing) throw new Error('User is already a member');

        const { data, error } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channelId,
                user_id: userId,
                added_by: currentUser.id
            })
            .select()
            .single();

        if (error) throw new Error('Failed to add member: ' + error.message);
        return data as ChannelMember;
    },

    removeChannelMember: async (currentUser: User, channelId: string, userId: string) => {
        if (!hasPermission(currentUser.role, 'REMOVE_CHANNEL_MEMBER')) {
            throw new Error('You do not have permission to remove channel members');
        }

        const { error } = await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', userId);

        if (error) throw new Error('Failed to remove member: ' + error.message);
    },

    markChannelAsRead: async (currentUser: User, channelId: string) => {
        await supabase
            .from('channel_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('channel_id', channelId)
            .eq('user_id', currentUser.id);
    },

    // ============================================
    // MESSAGES
    // ============================================

    getMessages: async (currentUser: User, channelId: string) => {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                users!user_id (*)
            `)
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);

        return (data || []).map(msg => ({
            ...msg,
            timestamp: msg.created_at,
            user: msg.users
        })) as Message[];
    },

    sendMessage: async (currentUser: User, channelId: string, content: string, isSystem = false) => {
        // Log for debugging
        console.log('Sending message to DB:', { channelId, content, isSystem });

        const { data, error } = await supabase
            .from('messages')
            .insert({
                channel_id: channelId,
                user_id: currentUser.id,
                content: content, // Reverting to plain string
                is_system_update: isSystem
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            throw new Error('Failed to send message: ' + error.message);
        }

        return {
            ...data,
            timestamp: data.created_at
        } as Message;
    },

    getMessage: async (messageId: string) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('id', messageId)
            .single();

        if (error) throw new Error('Message not found');
        return { ...data, timestamp: data.created_at } as Message;
    },

    editMessage: async (currentUser: User, messageId: string, newContent: string) => {
        const message = await api.getMessage(messageId);
        if (message.user_id !== currentUser.id) throw new Error('Not your message');

        const { data, error } = await supabase
            .from('messages')
            .update({ content: newContent })
            .eq('id', messageId)
            .select()
            .single();

        if (error) throw new Error('Failed to edit: ' + error.message);
        return { ...data, timestamp: data.created_at } as Message;
    },

    deleteMessage: async (currentUser: User, messageId: string) => {
        const message = await api.getMessage(messageId);
        if (message.user_id !== currentUser.id) throw new Error('Not your message');

        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) throw new Error('Failed to delete: ' + error.message);
    },

    // ============================================
    // FILES
    // ============================================

    uploadFile: async (file: File, bucket: string = 'spec-files') => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) throw new Error('Upload error: ' + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return publicUrl;
    },

    addFileToChannel: async (currentUser: User, channelId: string, fileName: string, url: string = '#') => {
        const { data, error } = await supabase
            .from('channel_files')
            .insert({
                channel_id: channelId,
                name: fileName,
                url: url,
                type: fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE',
                uploaded_by: currentUser.name
            })
            .select()
            .single();

        if (error) throw new Error('Failed to add file: ' + error.message);
        return {
            ...data,
            uploadedBy: data.uploaded_by,
            uploadedAt: data.uploaded_at
        } as AttachedFile;
    },

    deleteFileFromChannel: async (channelId: string, fileId: string) => {
        await supabase.from('channel_files').delete().eq('id', fileId).eq('channel_id', channelId);
    },

    renameFile: async (fileId: string, newName: string) => {
        const { error } = await supabase
            .from('channel_files')
            .update({ name: newName })
            .eq('id', fileId);

        if (error) throw new Error('Failed to rename file: ' + error.message);
    },

    // ============================================
    // SPECS
    // ============================================

    addSpecToChannel: async (currentUser: User, channelId: string, content: string) => {
        const { data, error } = await supabase
            .from('channel_specs')
            .insert({ channel_id: channelId, content, created_by: currentUser.id })
            .select()
            .single();

        if (error) throw new Error('Failed to add spec');
        return data;
    },

    deleteSpecFromChannel: async (channelId: string, specId: string) => {
        await supabase.from('channel_specs').delete().eq('id', specId).eq('channel_id', channelId);
    },

    getChannelSpecs: async (channelId: string) => {
        const { data, error } = await supabase
            .from('channel_specs')
            .select('*')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false });

        if (error) throw new Error('Failed to fetch specs');
        return data || [];
    },

    // ============================================
    // USERS & TEAMS
    // ============================================

    createTeamMember: async (currentUser: User, name: string, phone: string, passcode: string, role: UserRole) => {
        if (!hasPermission(currentUser.role, 'ADD_TEAM_MEMBER')) throw new Error('Admin only');
        if (!/^\d{10}$/.test(phone)) throw new Error('10 digits phone required');
        if (!/^\d{4}$/.test(passcode)) throw new Error('4 digits passcode required');

        const { data: existingUser } = await supabase.from('users').select('id').eq('phone', phone).single();
        if (existingUser) throw new Error('Phone already registered');

        const { data, error } = await supabase.from('users').insert({
            company_id: currentUser.company_id, name, phone, passcode, role
        }).select().single();

        if (error) throw new Error('Failed to create team member: ' + error.message);
        return data as User;
    },

    updatePasscode: async (userId: string, oldPasscode: string, newPasscode: string) => {
        if (!/^\d{4}$/.test(newPasscode)) throw new Error('4 digits required');
        const { data: user } = await supabase.from('users').select('passcode').eq('id', userId).single();
        if (!user || user.passcode !== oldPasscode) throw new Error('Current passcode incorrect');

        const { error } = await supabase.from('users').update({ passcode: newPasscode }).eq('id', userId);
        if (error) throw new Error('Failed to update');
    },

    updateUserRole: async (currentUser: User, userId: string, newRole: UserRole) => {
        if (!hasPermission(currentUser.role, 'CHANGE_USER_ROLE')) throw new Error('Admin only');
        if (userId === currentUser.id) throw new Error('Cannot change own role');

        const { data, error } = await supabase.from('users').update({ role: newRole }).eq('id', userId).eq('company_id', currentUser.company_id).select().single();
        if (error) throw new Error('Failed to update role');
        return data as User;
    },

    getTeamMembers: async (currentUser: User) => {
        const { data, error } = await supabase.from('users').select('*').eq('company_id', currentUser.company_id).order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        return data as User[];
    },

    deleteTeamMember: async (currentUser: User, userId: string) => {
        if (currentUser.role !== 'ADMIN') throw new Error('Only admins can delete team members');
        if (currentUser.id === userId) throw new Error('You cannot delete yourself');

        // To "delete" but keep messages:
        // We clear the company_id, name, and phone (using a unique placeholder for phone)
        const { error } = await supabase
            .from('users')
            .update({
                company_id: null,
                name: 'Former Member',
                phone: `DELETED_${userId}_${Date.now()}`,
                passcode: 'DELETED'
            })
            .eq('id', userId)
            .eq('company_id', currentUser.company_id);

        if (error) throw new Error('Failed to delete team member');
        return true;
    },

    createVendor: async (name: string, phone: string, adminName: string) => {
        if (!/^\d{10}$/.test(phone)) throw new Error('10 digits phone required');
        const { data: existing } = await supabaseAdmin.from('users').select('id').eq('phone', phone).single();
        if (existing) throw new Error('Phone registered');

        const { data: newCompany, error: companyError } = await supabaseAdmin.from('companies').insert({ name, type: 'VENDOR' }).select().single();
        if (companyError) throw new Error('Failed to create vendor');

        const passcode = phone.slice(-4);
        const { error: userError } = await supabaseAdmin.from('users').insert({ company_id: newCompany.id, name: adminName, phone, passcode, role: 'ADMIN' });
        if (userError) {
            await supabaseAdmin.from('companies').delete().eq('id', newCompany.id);
            throw new Error('Failed to create admin');
        }
        return newCompany as Company;
    },

    getVendors: async () => {
        const { data, error } = await supabase.from('companies').select('*, users(name, phone, role)').eq('type', 'VENDOR').order('name', { ascending: true });
        if (error) throw new Error(error.message);
        return (data || []).map(company => {
            const admin = (company.users as any[])?.find(u => u.role === 'ADMIN');
            return { ...company, adminName: admin?.name || 'No Admin', adminPhone: admin?.phone || 'No Phone' };
        });
    },

    getUser: async (id: string) => {
        const { data } = await supabase
            .from('users')
            .select('*, company:companies(*)')
            .eq('id', id)
            .single();
        return (data || null) as User | null;
    },

    savePushSubscription: async (userId: string, subscription: PushSubscription) => {
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                subscription_json: subscription.toJSON()
            }, { onConflict: 'user_id, subscription_json' });

        if (error) throw new Error('Failed to save push subscription: ' + error.message);
    },

    saveNativePushToken: async (userId: string, token: string) => {
        const { error } = await supabase
            .from('native_push_tokens')
            .upsert({
                user_id: userId,
                token: token,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, token' });

        if (error) {
            console.error('[Supabase] Failed to save push token:', error.message);
        } else {
            console.log('[Supabase] Push token saved successfully');
        }
    },

    // ================================================================
    // FEATURE MODULES
    // Add all new Phase features as separate files in client/api/
    // Then import and spread them here — callers use api.xxx() as usual
    // ================================================================
    ...companyApi,         // → client/api/companies.ts
    ...partnershipApi,     // → client/api/partnerships.ts
    ...contactsApi,        // → client/api/contacts.ts         (Phase 2.5)
    ...deliveryChallanApi, // → client/api/deliveryChallans.ts (Phase 3)
    ...inwardChallanApi,   // → client/api/inwardChallans.ts   (Phase 3)
    ...salesInvoiceApi,    // → client/api/salesInvoices.ts
    ...purchaseInvoiceApi, // → client/api/purchaseInvoices.ts
    ...expensesApi,        // → client/api/expenses.ts

    ensureDemoData: async (currentUser: User) => {
        // 1. Check if Order #505 exists
        const { data: existingOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('manufacturer_id', currentUser.company_id)
            .eq('order_number', '505')
            .single();

        if (existingOrder) return; // Data already exists

        // 2. Create Order #505 (this also creates the Overview channel automatically in createOrder)
        await api.createOrder(
            currentUser,
            '505',
            'S-BLUE-101',
            [] // No additional team members for now
        );
    },
};
