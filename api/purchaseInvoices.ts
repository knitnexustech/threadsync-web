/**
 * purchaseInvoices.ts
 * Feature: Purchase Invoices (Bills received from vendors)
 * Table: purchase_invoices
 */

import { supabase } from '../supabaseClient';
import { User, Invoice, InvoiceItem, GSTType, GSTRate, hasPermission } from '../types';

const calculateTotals = (items: InvoiceItem[], gstRate?: GSTRate) => {
    const subtotal   = items.reduce((sum, it) => sum + it.amount, 0);
    const gst_amount = gstRate ? parseFloat(((subtotal * gstRate) / 100).toFixed(2)) : 0;
    return { subtotal, gst_amount, total_amount: parseFloat((subtotal + gst_amount).toFixed(2)) };
};

const INVOICE_SELECT = `
    *,
    seller_company:companies!seller_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
    seller_contact:contacts!seller_contact_id(id, name, gst_number, address, state, pincode, phone),
    buyer_company:companies!buyer_company_id(id, name, gst_number, address, state, pincode, kramiz_id)
`;

// ── CREATE ───────────────────────────────────────────────────────────────────

export const createPurchaseInvoice = async (
    currentUser: User,
    params: {
        seller_company_id?: string;   // optional — if from a partner
        seller_contact_id?: string;   // optional — if from a manual contact
        invoice_number:     string;   // vendor's original invoice number
        order_id?:          string;
        channel_id?:        string;
        linked_dc_ids?:     string[];
        items:              InvoiceItem[];
        gst_type?:          GSTType;
        gst_rate?:          GSTRate;
        due_date?:          string;
        notes?:             string;
        created_at?:        string;
    }
): Promise<Invoice> => {
    if (!hasPermission(currentUser.role, 'CREATE_INVOICE')) {
        throw new Error('You do not have permission to record purchase invoices');
    }
    if (!params.seller_company_id && !params.seller_contact_id) {
        throw new Error('Seller is required (select a partner or contact)');
    }

    const { subtotal, gst_amount, total_amount } = calculateTotals(params.items, params.gst_rate);

    const { data, error } = await supabase
        .from('purchase_invoices')
        .insert({
            invoice_number:    params.invoice_number,
            buyer_company_id:  currentUser.company_id,
            created_by:        currentUser.id,
            linked_dc_ids:     params.linked_dc_ids ?? [],
            subtotal,
            gst_amount,
            total_amount,
            status:            'DRAFT',
            ...params,
        })
        .select(INVOICE_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as Invoice;
};

// ── READ ─────────────────────────────────────────────────────────────────────

export const getPurchaseInvoices = async (currentUser: User): Promise<Invoice[]> => {
    const { data, error } = await supabase
        .from('purchase_invoices')
        .select(INVOICE_SELECT)
        .eq('buyer_company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Invoice[];
};

export const updatePurchaseInvoice = async (
    currentUser: User,
    invoiceId: string,
    updates: Partial<{
        seller_company_id: string;
        seller_contact_id: string;
        invoice_number:    string;
        order_id:          string;
        items:              InvoiceItem[];
        gst_type:          GSTType;
        gst_rate:          GSTRate;
        due_date:          string;
        notes:             string;
        created_at:        string;
    }>
): Promise<Invoice> => {
    const { data, error } = await supabase
        .from('purchase_invoices')
        .update(updates)
        .eq('id', invoiceId)
        .eq('buyer_company_id', currentUser.company_id)
        .select(INVOICE_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as Invoice;
};

export const deletePurchaseInvoice = async (currentUser: User, invoiceId: string): Promise<void> => {
    const { error } = await supabase
        .from('purchase_invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('buyer_company_id', currentUser.company_id);

    if (error) throw new Error(error.message);
};
