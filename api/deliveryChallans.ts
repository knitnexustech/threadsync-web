/**
 * deliveryChallans.ts
 * Feature: Delivery Challan — Phase 3
 *
 * API functions for Outward DCs, Inward Challans, and Driver details for DCs.
 * Spread into the `api` object in supabaseAPI.ts.
 */

import { supabase, supabaseAdmin } from '../supabaseClient';
import { User, DeliveryChallan, DCItem, hasPermission } from '../types';

// ── DC Number Generators ────────────────────────────────────────────────────

const today = () => {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
};

const generateDCNumber = async (companyId: string): Promise<string> => {
    const prefix = `DC-${today()}`;
    const { count } = await supabaseAdmin
        .from('delivery_challans')
        .select('*', { count: 'exact', head: true })
        .eq('sender_company_id', companyId)
        .like('dc_number', `${prefix}%`);
    const seq = String((count || 0) + 1).padStart(3, '0');
    return `${prefix}-${seq}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// OUTWARD DELIVERY CHALLAN
// ═══════════════════════════════════════════════════════════════════════════════

const DC_SELECT = `
    *,
    sender_company:companies!sender_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
    receiver_company:companies!receiver_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
    receiver_contact:contacts!receiver_contact_id(id, name, gst_number, address, state, pincode, phone),
    parent_order:orders!order_number(id, order_number, style_number)
`;

export const createDeliveryChallan = async (
    currentUser: User,
    params: {
        channel_id?:          string;
        receiver_company_id?: string;
        receiver_contact_id?: string;
        order_number?:        string;
        ref_order_number?:    string;
        items:                DCItem[];
        driver_name?:         string;
        driver_phone?:        string;
        driver_photo_url?:    string;
        notes?:               string;
        created_at?:          string;
    }
): Promise<DeliveryChallan> => {
    if (!hasPermission(currentUser.role, 'CREATE_DC')) {
        throw new Error('You do not have permission to create delivery challans');
    }
    if (!params.items?.length) throw new Error('At least one item is required');
    if (!params.receiver_company_id && !params.receiver_contact_id) {
        throw new Error('A recipient is required');
    }

    const dc_number = await generateDCNumber(currentUser.company_id);

    const { data, error } = await supabase
        .from('delivery_challans')
        .insert({
            ...params,
            dc_number,
            sender_company_id: currentUser.company_id,
            status: 'DELIVERED',
        })
        .select(DC_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as DeliveryChallan;
};

export const getDCsForCompany = async (currentUser: User): Promise<DeliveryChallan[]> => {
    const { data, error } = await supabase
        .from('delivery_challans')
        .select(DC_SELECT)
        .or(`sender_company_id.eq.${currentUser.company_id},receiver_company_id.eq.${currentUser.company_id}`)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as DeliveryChallan[];
};

export const getDCsForChannel = async (channelId: string): Promise<DeliveryChallan[]> => {
    const { data, error } = await supabase
        .from('delivery_challans')
        .select(DC_SELECT)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as DeliveryChallan[];
};

export const getDCsForOrder = async (orderId: string, orderNumber?: string): Promise<DeliveryChallan[]> => {
    // NOTE: Your DB column is named 'order_number' but stores the Order UUID.
    const { data, error } = await supabase
        .from('delivery_challans')
        .select(DC_SELECT)
        .eq('order_number', orderId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as DeliveryChallan[];
};

export const getDCById = async (dcId: string): Promise<DeliveryChallan | null> => {
    const { data, error } = await supabase
        .from('delivery_challans')
        .select(DC_SELECT)
        .eq('id', dcId)
        .single();

    if (error) return null;
    return data as DeliveryChallan;
};

export const markDCBilled = async (currentUser: User, dcId: string): Promise<void> => {
    const { error } = await supabase
        .from('delivery_challans')
        .update({ status: 'BILLED' })
        .eq('id', dcId)
        .eq('sender_company_id', currentUser.company_id); // only sender can bill it

    if (error) throw new Error(error.message);
};

export const markDCCancelled = async (currentUser: User, dcId: string): Promise<void> => {
    const { data: dc } = await supabase.from('delivery_challans').select('status').eq('id', dcId).single();
    if (dc?.status === 'BILLED') throw new Error('Cannot cancel a billed Delivery Challan.');

    const { error } = await supabase
        .from('delivery_challans')
        .update({ status: 'CANCELLED' })
        .eq('id', dcId)
        .eq('sender_company_id', currentUser.company_id);

    if (error) throw new Error(error.message);
};

export const updateDeliveryChallan = async (
    currentUser: User,
    dcId: string,
    updates: Partial<{
        receiver_company_id: string;
        receiver_contact_id: string;
        order_number:        string;
        ref_order_number:    string;
        items:               DCItem[];
        driver_name:         string;
        driver_phone:        string;
        driver_photo_url:    string;
        notes:               string;
        created_at:          string;
    }>
): Promise<DeliveryChallan> => {
    if (!hasPermission(currentUser.role, 'EDIT_DC')) {
        throw new Error('You do not have permission to edit delivery challans');
    }
    const { data: dc } = await supabase.from('delivery_challans').select('status').eq('id', dcId).single();
    if (dc?.status === 'BILLED') throw new Error('Cannot edit a billed Delivery Challan.');

    const { data, error } = await supabase
        .from('delivery_challans')
        .update(updates)
        .eq('id', dcId)
        .eq('sender_company_id', currentUser.company_id)
        .select(DC_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as DeliveryChallan;
};

export const deleteDeliveryChallan = async (currentUser: User, dcId: string): Promise<void> => {
    if (!hasPermission(currentUser.role, 'DELETE_DC')) {
        throw new Error('You do not have permission to delete delivery challans');
    }
    const { data: dc } = await supabase.from('delivery_challans').select('status').eq('id', dcId).single();
    if (dc?.status === 'BILLED') throw new Error('Cannot delete a billed Delivery Challan.');

    const { error } = await supabase
        .from('delivery_challans')
        .delete()
        .eq('id', dcId)
        .eq('sender_company_id', currentUser.company_id);

    if (error) throw new Error(error.message);
};



/**
 * Upload a driver photo to Supabase Storage.
 * Returns the public URL.
 */
export const uploadDriverPhoto = async (
    currentUser: User,
    file: File
): Promise<string> => {
    const ext  = file.name.split('.').pop() || 'jpg';
    const path = `driver-photos/${currentUser.company_id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from('ATTACHMENTS')
        .upload(path, file, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from('ATTACHMENTS').getPublicUrl(path);
    return urlData.publicUrl;
};
