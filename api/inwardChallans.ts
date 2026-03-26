/**
 * inwardChallans.ts
 * Feature: Inward Challan — Phase 3
 *
 * An Inward Challan (IC) is created by the RECEIVER when goods arrive.
 * It is the counterpart to an Outward Delivery Challan (DC).
 *
 * Key concepts:
 *   - A receiver creates an IC to formally acknowledge what arrived
 *   - An IC can optionally be linked to an existing DC (linked_dc_id)
 *   - If items are short or damaged, discrepancies are recorded in free text
 *   - IC number is auto-generated per company per day: IC-260322-001
 *
 * Functions:
 *   createInwardChallan         — create a new IC
 *   getInwardChallansReceived   — all ICs where you are the receiver
 *   getInwardChallansSent       — all ICs where you are the sender (someone received from you)
 *   getInwardChallanById        — single IC with full detail
 *   getInwardChallansForChannel — ICs linked to a specific chat channel
 *   getICLinkedToDC             — fetch IC that was created against a specific outward DC
 *   updateInwardChallan         — edit an IC (only receiver, before it's confirmed)
 *   deleteInwardChallan         — delete an IC (only receiver, within same day)
 *
 * Spread into the `api` object in supabaseAPI.ts.
 */

import { supabase, supabaseAdmin } from '../supabaseClient';
import { User, InwardChallan, DCItem } from '../types';

// ── IC Number Generator ─────────────────────────────────────────────────────

const todayStamp = (): string => {
    const d  = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
};

const generateICNumber = async (receiverCompanyId: string): Promise<string> => {
    const prefix = `IC-${todayStamp()}`;
    const { count } = await supabaseAdmin
        .from('inward_challans')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_company_id', receiverCompanyId)
        .like('ic_number', `${prefix}%`);
    const seq = String((count || 0) + 1).padStart(3, '0');
    return `${prefix}-${seq}`;
};

// ── Shared select fragment ──────────────────────────────────────────────────

const IC_SELECT = `
    *,
    sender_company:companies!sender_company_id(
        id, name, gst_number, kramiz_id, address, state, pincode
    ),
    receiver_company:companies!receiver_company_id(
        id, name, gst_number, kramiz_id
    )
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new Inward Challan.
 * The current user's company is always the RECEIVER.
 * sender_company_id is required — who sent the goods.
 */
export const createInwardChallan = async (
    currentUser: User,
    params: {
        channel_id?:        string;   // optional — link to a chat
        linked_dc_id?:      string;   // optional — the outward DC this responds to
        sender_company_id?: string;   // optional — if from a Kramiz partner
        sender_contact_id?: string;   // optional — if from a manual contact
        order_number?:      string;   // your internal order ref
        ref_order_number?:  string;   // sender's order ref (from their DC)
        items_received:     DCItem[]; // what actually arrived
        discrepancies?:     string;   // free-text: shortages, damage, wrong items
        notes?:             string;
        created_at?:        string;
    }
): Promise<InwardChallan> => {
    if (!params.items_received?.length) {
        throw new Error('At least one item is required on an Inward Challan');
    }
    if (!params.sender_company_id && !params.sender_contact_id) {
        throw new Error('Sender is required (select a partner or contact)');
    }

    const ic_number = await generateICNumber(currentUser.company_id);

    const { data, error } = await supabase
        .from('inward_challans')
        .insert({
            ic_number,
            receiver_company_id: currentUser.company_id,
            ...params,
        })
        .select(IC_SELECT)
        .single();

    if (error) throw new Error(error.message);

    // If linked to a DC, mark that DC as RECEIVED
    if (params.linked_dc_id) {
        await supabase
            .from('delivery_challans')
            .update({ status: 'RECEIVED' })
            .eq('id', params.linked_dc_id);
    }

    return data as InwardChallan;
};


// ═══════════════════════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All Inward Challans where the current company is the RECEIVER.
 * Sorted newest-first.
 */
export const getInwardChallansReceived = async (
    currentUser: User
): Promise<InwardChallan[]> => {
    const { data, error } = await supabase
        .from('inward_challans')
        .select(IC_SELECT)
        .eq('receiver_company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as InwardChallan[];
};

/**
 * All Inward Challans where the current company is the SENDER
 * (i.e., the receiver acknowledged goods that came from you).
 * Useful to see "which of my DC dispatches have been formally receipted".
 */
export const getInwardChallansSent = async (
    currentUser: User
): Promise<InwardChallan[]> => {
    const { data, error } = await supabase
        .from('inward_challans')
        .select(IC_SELECT)
        .eq('sender_company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as InwardChallan[];
};

/**
 * Single Inward Challan by ID. Returns null if not found.
 */
export const getInwardChallanById = async (
    icId: string
): Promise<InwardChallan | null> => {
    const { data, error } = await supabase
        .from('inward_challans')
        .select(IC_SELECT)
        .eq('id', icId)
        .single();

    if (error) return null;
    return data as InwardChallan;
};

/**
 * All Inward Challans linked to a specific chat channel.
 */
export const getInwardChallansForChannel = async (
    channelId: string
): Promise<InwardChallan[]> => {
    const { data, error } = await supabase
        .from('inward_challans')
        .select(IC_SELECT)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as InwardChallan[];
};

/**
 * Fetch the Inward Challan that was created against a specific outward DC.
 * Returns null if the receiver hasn't receipted it yet.
 * Used to show "Receipted ✓" on a DC card when the IC exists.
 */
export const getICLinkedToDC = async (
    dcId: string
): Promise<InwardChallan | null> => {
    const { data, error } = await supabase
        .from('inward_challans')
        .select(IC_SELECT)
        .eq('linked_dc_id', dcId)
        .maybeSingle();

    if (error) return null;
    return data as InwardChallan | null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update an Inward Challan.
 * Only the receiver company can update their own IC.
 * Typically used to correct item quantities or add discrepancy notes.
 */
export const updateInwardChallan = async (
    currentUser: User,
    icId: string,
    updates: Partial<{
        items_received:    DCItem[];
        discrepancies:     string;
        notes:             string;
        order_number:      string;
        ref_order_number:  string;
    }>
): Promise<InwardChallan> => {
    const { data, error } = await supabase
        .from('inward_challans')
        .update(updates)
        .eq('id', icId)
        .eq('receiver_company_id', currentUser.company_id) // safety: only receiver
        .select(IC_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as InwardChallan;
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delete an Inward Challan.
 * Only the receiver company can delete. No date restriction enforced here
 * (can be enforced in the UI if needed).
 */
export const deleteInwardChallan = async (
    currentUser: User,
    icId: string
): Promise<void> => {
    const { error } = await supabase
        .from('inward_challans')
        .delete()
        .eq('id', icId)
        .eq('receiver_company_id', currentUser.company_id);

    if (error) throw new Error(error.message);
};
