
import { supabase, supabaseAdmin } from './supabaseClient';
import {
    Company, User, PurchaseOrder, Channel, Message,
    AttachedFile, UserRole, ChannelMember, POMember,
    hasPermission
} from './types';

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

    signup: async (companyName: string, companyType: 'MANUFACTURER' | 'VENDOR', name: string, phone: string, passcode: string) => {
        // Validate phone number format (must be exactly 10 digits)
        if (!/^\d{10}$/.test(phone)) {
            throw new Error('Phone number must be exactly 10 digits');
        }

        // Validate passcode format (must be exactly 4 digits)
        if (!/^\d{4}$/.test(passcode)) {
            throw new Error('Passcode must be exactly 4 digits');
        }

        // Check if phone number already exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('phone', phone)
            .single();

        if (existingUser) {
            throw new Error('Phone number already registered');
        }

        // Create new company
        const { data: newCompany, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert({
                name: companyName,
                type: companyType
            })
            .select()
            .single();

        if (companyError) {
            throw new Error('Failed to create company: ' + companyError.message);
        }

        // Create admin user for the company
        const { data: newUser, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                company_id: newCompany.id,
                name: name,
                phone: phone,
                passcode: passcode,
                role: 'ADMIN'
            })
            .select()
            .single();

        if (userError) {
            throw new Error('Failed to create user: ' + userError.message);
        }

        return { user: newUser as User, company: newCompany as Company };
    },

    // ============================================
    // PURCHASE ORDERS
    // ============================================

    getPOs: async (currentUser: User) => {
        if (!currentUser) throw new Error('User not authenticated');

        const userCompany = await api.getCompany(currentUser.company_id);

        if (userCompany?.type === 'MANUFACTURER') {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*')
                .eq('manufacturer_id', currentUser.company_id)
                .order('created_at', { ascending: false });

            if (error) throw new Error(error.message);
            return data as PurchaseOrder[];
        } else {
            const { data: channels, error: channelError } = await supabase
                .from('channels')
                .select('po_id')
                .eq('vendor_id', currentUser.company_id);

            if (channelError) throw new Error(channelError.message);

            const poIds = [...new Set(channels.map(ch => ch.po_id))];
            if (poIds.length === 0) return [];

            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*')
                .in('id', poIds)
                .order('created_at', { ascending: false });

            if (error) throw new Error(error.message);
            return data as PurchaseOrder[];
        }
    },

    createPO: async (currentUser: User, orderNumber: string, styleNumber: string, teamMemberIds: string[]) => {
        if (!hasPermission(currentUser.role, 'CREATE_PO')) {
            throw new Error('You do not have permission to create purchase orders');
        }

        const { data: newPO, error: poError } = await supabase
            .from('purchase_orders')
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

        if (poError) throw new Error('Failed to create PO: ' + poError.message);

        const { data: overviewChannel, error: channelError } = await supabase
            .from('channels')
            .insert({
                po_id: newPO.id,
                name: 'Overview',
                type: 'OVERVIEW',
                status: 'IN_PROGRESS',
                completion_percentage: 0,
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

            if (memberError) console.error('Failed to add default members:', memberError);
        }

        return newPO as PurchaseOrder;
    },

    updatePOStatus: async (poId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
        const { data, error } = await supabase
            .from('purchase_orders')
            .update({ status })
            .eq('id', poId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as PurchaseOrder;
    },

    updatePO: async (currentUser: User, poId: string, updates: Partial<PurchaseOrder>) => {
        if (!hasPermission(currentUser.role, 'EDIT_PO')) {
            throw new Error('You do not have permission to edit purchase orders');
        }

        const allowedUpdates: any = {};
        if (updates.order_number !== undefined) allowedUpdates.order_number = updates.order_number;
        if (updates.style_number !== undefined) allowedUpdates.style_number = updates.style_number;
        if (updates.status !== undefined) allowedUpdates.status = updates.status;
        if (updates.image_url !== undefined) allowedUpdates.image_url = updates.image_url;

        const { data, error } = await supabase
            .from('purchase_orders')
            .update(allowedUpdates)
            .eq('id', poId)
            .eq('manufacturer_id', currentUser.company_id)
            .select()
            .single();

        if (error) throw new Error('Failed to update PO: ' + error.message);
        return data as PurchaseOrder;
    },

    deletePO: async (currentUser: User, poId: string) => {
        if (!hasPermission(currentUser.role, 'DELETE_PO')) {
            throw new Error('You do not have permission to delete purchase orders');
        }

        const { error } = await supabase
            .from('purchase_orders')
            .delete()
            .eq('id', poId)
            .eq('manufacturer_id', currentUser.company_id);

        if (error) throw new Error('Failed to delete PO: ' + error.message);
    },

    // ============================================
    // CHANNELS
    // ============================================

    getChannels: async (currentUser: User, poId: string) => {
        const userCompany = await api.getCompany(currentUser.company_id);

        let query = supabase
            .from('channels')
            .select(`
                *,
                channel_members!inner(user_id, last_read_at),
                channel_specs(*),
                channel_files(*)
            `)
            .eq('po_id', poId)
            .eq('channel_members.user_id', currentUser.id);

        if (userCompany?.type === 'VENDOR') {
            query = query.eq('vendor_id', currentUser.company_id);
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) throw new Error(error.message);

        return (data || []).map(channel => ({
            ...channel,
            specs: channel.channel_specs || [],
            files: channel.channel_files || [],
            last_read_at: (channel.channel_members?.[0] as any)?.last_read_at
        })) as Channel[];
    },

    getAllChannels: async (currentUser: User) => {
        const { data, error } = await supabase
            .from('channels')
            .select(`
                *,
                channel_members!inner(user_id, last_read_at),
                channel_specs(*),
                channel_files(*)
            `)
            .eq('channel_members.user_id', currentUser.id);

        if (error) throw new Error(error.message);

        return (data || []).map(channel => ({
            ...channel,
            specs: channel.channel_specs || [],
            files: channel.channel_files || [],
            last_read_at: (channel.channel_members?.[0] as any)?.last_read_at
        })) as Channel[];
    },

    createChannel: async (currentUser: User, poId: string, name: string, vendorId: string, channelType: string = 'KNITTING') => {
        if (!hasPermission(currentUser.role, 'CREATE_CHANNEL')) {
            throw new Error('You do not have permission to create channels');
        }

        const { data: newChannel, error } = await supabase
            .from('channels')
            .insert({
                po_id: poId,
                name: name,
                type: channelType,
                status: 'PENDING',
                completion_percentage: 0,
                vendor_id: vendorId || null
            })
            .select()
            .single();

        if (error) throw new Error('Failed to create channel: ' + error.message);

        const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('company_id', currentUser.company_id)
            .eq('role', 'ADMIN');

        let allMemberIds = (admins || []).map(a => a.id);
        allMemberIds.push(currentUser.id);

        if (vendorId) {
            const { data: vendorAdmins } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('company_id', vendorId)
                .eq('role', 'ADMIN');

            if (vendorAdmins && vendorAdmins.length > 0) {
                allMemberIds = [...allMemberIds, ...vendorAdmins.map(a => a.id)];
            }
        }

        const uniqueMemberIds = Array.from(new Set(allMemberIds));
        if (uniqueMemberIds.length > 0) {
            const channelMembers = uniqueMemberIds.map(userId => ({
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
        if (updates.completion_percentage !== undefined) allowedUpdates.completion_percentage = updates.completion_percentage;
        if (updates.vendor_id !== undefined) allowedUpdates.vendor_id = updates.vendor_id;

        const { data, error } = await supabase
            .from('channels')
            .update(allowedUpdates)
            .eq('id', channelId)
            .select()
            .single();

        if (error) throw new Error('Failed to update channel: ' + error.message);
        return data;
    },

    deleteChannel: async (currentUser: User, channelId: string) => {
        if (!hasPermission(currentUser.role, 'DELETE_CHANNEL')) {
            throw new Error('You do not have permission to delete channels');
        }

        const { error } = await supabase
            .from('channels')
            .delete()
            .eq('id', channelId);

        if (error) throw new Error('Failed to delete channel: ' + error.message);
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
        const { data, error } = await supabase
            .from('messages')
            .insert({
                channel_id: channelId,
                user_id: currentUser.id,
                content: content,
                is_system_update: isSystem
            })
            .select()
            .single();

        if (error) throw new Error('Failed to send message: ' + error.message);

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
        return { ...data, uploadedAt: data.uploaded_at } as AttachedFile;
    },

    deleteFileFromChannel: async (channelId: string, fileId: string) => {
        await supabase.from('channel_files').delete().eq('id', fileId).eq('channel_id', channelId);
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

        if (error) throw new Error('Failed to create team member');
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

    getPartners: async (currentUser: User) => {
        const userCompany = await api.getCompany(currentUser.company_id);
        if (!userCompany) return [];
        if (userCompany.type === 'MANUFACTURER') {
            const { data: channels } = await supabase.from('channels').select('vendor_id, channel_members!inner(user_id)').eq('channel_members.user_id', currentUser.id).not('vendor_id', 'is', null);
            const vendorIds = [...new Set((channels || []).map(ch => ch.vendor_id).filter(Boolean))];
            if (vendorIds.length === 0) return [];
            const { data } = await supabase.from('companies').select('*').in('id', vendorIds);
            return (data || []) as Company[];
        } else {
            const { data: channels } = await supabase.from('channels').select('po_id, channel_members!inner(user_id)').eq('channel_members.user_id', currentUser.id);
            const poIds = [...new Set((channels || []).map(ch => ch.po_id))];
            if (poIds.length === 0) return [];
            const { data: pos } = await supabase.from('purchase_orders').select('manufacturer_id').in('id', poIds);
            const mfgIds = [...new Set((pos || []).map(po => po.manufacturer_id))];
            if (mfgIds.length === 0) return [];
            const { data } = await supabase.from('companies').select('*').in('id', mfgIds);
            return (data || []) as Company[];
        }
    },

    getCompany: async (id: string) => {
        const { data } = await supabase.from('companies').select('*').eq('id', id).single();
        return (data || null) as Company | null;
    },

    getUser: async (id: string) => {
        const { data } = await supabase.from('users').select('*').eq('id', id).single();
        return (data || null) as User | null;
    },

    updateCompanyName: async (companyId: string, newName: string) => {
        const { error } = await supabase
            .from('companies')
            .update({ name: newName })
            .eq('id', companyId);
        if (error) throw error;
        return true;
    }
};
