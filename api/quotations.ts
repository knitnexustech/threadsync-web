/**
 * quotations.ts
 * Feature: Rate Quotation — Phase 3
 *
 * A Quotation is a rate quote sent BEFORE a formal invoice.
 * It uses the same InvoiceItem structure so rates and GST are consistent.
 *
 * Status lifecycle:
 *   DRAFT → SENT → ACCEPTED | REJECTED
 *
 * valid_until: the buyer must accept/reject before this date.
 *
 * Key difference from Invoice:
 *   - Has ACCEPTED / REJECTED states (buyer can respond)
 *   - Has valid_until (expiry)
 *   - No linked_dc_ids (quotes are pre-dispatch)
 *
 * Permissions: same as invoices (CREATE_QUOTATION etc.)
 *
 * Spread into the `api` object in supabaseAPI.ts.
 */

import { supabase, supabaseAdmin } from '../supabaseClient';
import { User, Quotation, InvoiceItem, GSTType, GSTRate, hasPermission } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const todayStamp = (): string => {
    const d  = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
};

const generateQuotationNumber = async (companyId: string): Promise<string> => {
    const prefix = `QT-${todayStamp()}`;
    const { count } = await supabaseAdmin
        .from('quotations')
        .select('*', { count: 'exact', head: true })
        .eq('sender_company_id', companyId)
        .like('quotation_number', `${prefix}%`);
    const seq = String((count || 0) + 1).padStart(3, '0');
    return `${prefix}-${seq}`;
};

const calculateTotals = (
    items: InvoiceItem[],
    gstRate?: GSTRate
): { subtotal: number; gst_amount: number; total_amount: number } => {
    const subtotal   = items.reduce((sum, it) => sum + it.amount, 0);
    const gst_amount = gstRate ? parseFloat(((subtotal * gstRate) / 100).toFixed(2)) : 0;
    return { subtotal, gst_amount, total_amount: parseFloat((subtotal + gst_amount).toFixed(2)) };
};

// ── Shared select fragment ────────────────────────────────────────────────────

const QUOTATION_SELECT = `
    *,
    sender_company:companies!sender_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
    receiver_company:companies!receiver_company_id(id, name, gst_number, address, state, pincode, kramiz_id)
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════════

export const createQuotation = async (
    currentUser: User,
    params: {
        receiver_company_id?: string;
        receiver_contact_id?: string;
        order_id?:            string;
        channel_id?:          string;
        items:                InvoiceItem[];
        gst_type?:            GSTType;
        gst_rate?:            GSTRate;
        valid_until?:         string;
        notes?:               string;
    }
): Promise<Quotation> => {
    if (!hasPermission(currentUser.role, 'CREATE_QUOTATION')) {
        throw new Error('You do not have permission to create quotations');
    }
    if (!params.receiver_company_id && !params.receiver_contact_id) {
        throw new Error('A recipient (partner or contact) is required');
    }
    if (!params.items?.length) {
        throw new Error('At least one line item is required');
    }

    const quotation_number                       = await generateQuotationNumber(currentUser.company_id);
    const { subtotal, gst_amount, total_amount } = calculateTotals(params.items, params.gst_rate);

    const { data, error } = await supabase
        .from('quotations')
        .insert({
            quotation_number,
            sender_company_id: currentUser.company_id,
            created_by:        currentUser.id,
            subtotal,
            gst_amount:        params.gst_rate ? gst_amount : null,
            total_amount,
            status:            'DRAFT',
            ...params,
        })
        .select(QUOTATION_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as Quotation;
};

// ═══════════════════════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════════════════════

/** All quotations sent by the current company. */
export const getQuotationsSent = async (currentUser: User): Promise<Quotation[]> => {
    const { data, error } = await supabase
        .from('quotations')
        .select(QUOTATION_SELECT)
        .eq('sender_company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Quotation[];
};

/** All quotations received by the current company. */
export const getQuotationsReceived = async (currentUser: User): Promise<Quotation[]> => {
    const { data, error } = await supabase
        .from('quotations')
        .select(QUOTATION_SELECT)
        .eq('receiver_company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Quotation[];
};

/** Single quotation by ID. Returns null if not found. */
export const getQuotationById = async (quotationId: string): Promise<Quotation | null> => {
    const { data, error } = await supabase
        .from('quotations')
        .select(QUOTATION_SELECT)
        .eq('id', quotationId)
        .single();

    if (error) return null;
    return data as Quotation;
};

/** All quotations linked to a specific Purchase Order. */
export const getQuotationsForOrder = async (orderId: string): Promise<Quotation[]> => {
    const { data, error } = await supabase
        .from('quotations')
        .select(QUOTATION_SELECT)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Quotation[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

/** Update a quotation (sender only). Recalculates totals if items change. */
export const updateQuotation = async (
    currentUser: User,
    quotationId: string,
    updates: Partial<{
        receiver_company_id: string;
        receiver_contact_id: string;
        items:               InvoiceItem[];
        gst_type:            GSTType;
        gst_rate:            GSTRate;
        valid_until:         string;
        notes:               string;
        status:              'DRAFT' | 'SENT';
    }>
): Promise<Quotation> => {
    if (!hasPermission(currentUser.role, 'EDIT_QUOTATION')) {
        throw new Error('You do not have permission to edit quotations');
    }

    let calculatedFields: Partial<{ subtotal: number; gst_amount: number | null; total_amount: number }> = {};
    if (updates.items) {
        const { subtotal, gst_amount, total_amount } = calculateTotals(updates.items, updates.gst_rate);
        calculatedFields = {
            subtotal,
            gst_amount: updates.gst_rate ? gst_amount : null,
            total_amount,
        };
    }

    const { data, error } = await supabase
        .from('quotations')
        .update({ ...updates, ...calculatedFields, updated_at: new Date().toISOString() })
        .eq('id', quotationId)
        .eq('sender_company_id', currentUser.company_id)
        .select(QUOTATION_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as Quotation;
};

/** Mark a quotation as SENT. */
export const markQuotationSent = async (
    currentUser: User,
    quotationId: string
): Promise<void> => {
    const { error } = await supabase
        .from('quotations')
        .update({ status: 'SENT', updated_at: new Date().toISOString() })
        .eq('id', quotationId)
        .eq('sender_company_id', currentUser.company_id);

    if (error) throw new Error(error.message);
};

/**
 * Respond to a quotation as the RECEIVER.
 * Only ACCEPTED or REJECTED are valid responses.
 */
export const respondToQuotation = async (
    currentUser: User,
    quotationId:  string,
    response:     'ACCEPTED' | 'REJECTED'
): Promise<void> => {
    const { error } = await supabase
        .from('quotations')
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq('id', quotationId)
        .eq('receiver_company_id', currentUser.company_id); // only receiver can respond

    if (error) throw new Error(error.message);
};

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════════

/** Delete a quotation (sender only). */
export const deleteQuotation = async (
    currentUser: User,
    quotationId: string
): Promise<void> => {
    if (!hasPermission(currentUser.role, 'DELETE_QUOTATION')) {
        throw new Error('You do not have permission to delete quotations');
    }

    const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId)
        .eq('sender_company_id', currentUser.company_id);

    if (error) throw new Error(error.message);
};
