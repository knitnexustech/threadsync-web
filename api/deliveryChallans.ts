/**
 * deliveryChallans.ts
 * Feature: Delivery Challan — Phase 3
 *
 * API functions for Outward DCs, Inward Challans, and Driver profiles.
 * Spread into the `api` object in supabaseAPI.ts.
 */

import { supabase, supabaseAdmin } from '../supabaseClient';
import { User, DeliveryChallan, Driver, DCItem } from '../types';

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
    if (!params.items?.length) throw new Error('At least one item is required');
    if (!params.receiver_company_id && !params.receiver_contact_id) {
        throw new Error('A recipient is required');
    }

    const dc_number = await generateDCNumber(currentUser.company_id);

    const { data, error } = await supabase
        .from('delivery_challans')
        .insert({
            dc_number,
            sender_company_id: currentUser.company_id,
            ...params,
        })
        .select(`
            *,
            sender_company:companies!sender_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
            receiver_company:companies!receiver_company_id(id, name, gst_number, address, state, pincode, kramiz_id)
        `)
        .single();

    if (error) throw new Error(error.message);
    return data as DeliveryChallan;
};

export const getDCsForCompany = async (currentUser: User): Promise<DeliveryChallan[]> => {
    const { data, error } = await supabase
        .from('delivery_challans')
        .select(`
            *,
            sender_company:companies!sender_company_id(id, name, gst_number, kramiz_id),
            receiver_company:companies!receiver_company_id(id, name, gst_number, kramiz_id)
        `)
        .or(`sender_company_id.eq.${currentUser.company_id},receiver_company_id.eq.${currentUser.company_id}`)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as DeliveryChallan[];
};

export const getDCsForChannel = async (channelId: string): Promise<DeliveryChallan[]> => {
    const { data, error } = await supabase
        .from('delivery_challans')
        .select(`
            *,
            sender_company:companies!sender_company_id(id, name, gst_number, kramiz_id),
            receiver_company:companies!receiver_company_id(id, name, gst_number, kramiz_id)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as DeliveryChallan[];
};

export const getDCById = async (dcId: string): Promise<DeliveryChallan | null> => {
    const { data, error } = await supabase
        .from('delivery_challans')
        .select(`
            *,
            sender_company:companies!sender_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
            receiver_company:companies!receiver_company_id(id, name, gst_number, address, state, pincode, kramiz_id)
        `)
        .eq('id', dcId)
        .single();

    if (error) return null;
    return data as DeliveryChallan;
};

export const markDCReceived = async (currentUser: User, dcId: string): Promise<void> => {
    const { error } = await supabase
        .from('delivery_challans')
        .update({ status: 'RECEIVED' })
        .eq('id', dcId)
        .eq('receiver_company_id', currentUser.company_id); // only receiver can mark

    if (error) throw new Error(error.message);
};

export const markDCDisputed = async (currentUser: User, dcId: string): Promise<void> => {
    const { error } = await supabase
        .from('delivery_challans')
        .update({ status: 'DISPUTED' })
        .eq('id', dcId);

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
    const { data, error } = await supabase
        .from('delivery_challans')
        .update(updates)
        .eq('id', dcId)
        .eq('sender_company_id', currentUser.company_id)
        .select(`
            *,
            sender_company:companies!sender_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
            receiver_company:companies!receiver_company_id(id, name, gst_number, address, state, pincode, kramiz_id)
        `)
        .single();

    if (error) throw new Error(error.message);
    return data as DeliveryChallan;
};

export const deleteDeliveryChallan = async (currentUser: User, dcId: string): Promise<void> => {
    const { error } = await supabase
        .from('delivery_challans')
        .delete()
        .eq('id', dcId)
        .eq('sender_company_id', currentUser.company_id);

    if (error) throw new Error(error.message);
};

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

export const getDrivers = async (currentUser: User): Promise<Driver[]> => {
    const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Driver[];
};

export const saveDriver = async (
    currentUser: User,
    driver: { name: string; phone?: string; photo_url?: string }
): Promise<Driver> => {
    const { data, error } = await supabase
        .from('drivers')
        .insert({ company_id: currentUser.company_id, ...driver })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as Driver;
};

export const deleteDriver = async (currentUser: User, driverId: string): Promise<void> => {
    const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId)
        .eq('company_id', currentUser.company_id);

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
        .from('attachments')
        .upload(path, file, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
    return urlData.publicUrl;
};
