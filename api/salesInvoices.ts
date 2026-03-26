/**
 * salesInvoices.ts
 * Feature: Sales Invoices (Bills issued to customers)
 * Table: sales_invoices
 */

import { supabase, supabaseAdmin } from '../supabaseClient';
import { User, Invoice, InvoiceItem, GSTType, GSTRate, hasPermission } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const todayStamp = (): string => {
    const d  = new Date();
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
};

const generateSalesInvoiceNumber = async (companyId: string): Promise<string> => {
    const prefix = `INV-${todayStamp()}`;
    const { count } = await supabaseAdmin
        .from('sales_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('seller_company_id', companyId)
        .like('invoice_number', `${prefix}%`);
    const seq = String((count || 0) + 1).padStart(3, '0');
    return `${prefix}-${seq}`;
};

const calculateTotals = (items: InvoiceItem[], gstRate?: GSTRate) => {
    const subtotal   = items.reduce((sum, it) => sum + it.amount, 0);
    const gst_amount = gstRate ? parseFloat(((subtotal * gstRate) / 100).toFixed(2)) : 0;
    return { subtotal, gst_amount, total_amount: parseFloat((subtotal + gst_amount).toFixed(2)) };
};

const INVOICE_SELECT = `
    *,
    seller_company:companies!seller_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
    buyer_company:companies!buyer_company_id(id, name, gst_number, address, state, pincode, kramiz_id),
    buyer_contact:contacts!buyer_contact_id(id, name, gst_number, address, state, pincode, phone)
`;

// ── CREATE ───────────────────────────────────────────────────────────────────

export const createSalesInvoice = async (
    currentUser: User,
    params: {
        seller_company_id:  string;   // usually currentUser.company_id
        invoice_number?:    string;   // auto-generated if omitted
        buyer_company_id?:  string;   // kramiz partner
        buyer_contact_id?:  string;   // offline contact
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
        throw new Error('You do not have permission to create invoices');
    }
    const inv_no = params.invoice_number || await generateSalesInvoiceNumber(currentUser.company_id);
    const { subtotal, gst_amount, total_amount } = calculateTotals(params.items, params.gst_rate);

    const { data, error } = await supabase
        .from('sales_invoices')
        .insert({
            invoice_number:    inv_no,
            seller_company_id: params.seller_company_id || currentUser.company_id,
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

export const getSalesInvoices = async (currentUser: User): Promise<Invoice[]> => {
    const { data, error } = await supabase
        .from('sales_invoices')
        .select(INVOICE_SELECT)
        .eq('seller_company_id', currentUser.company_id)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Invoice[];
};

export const updateSalesInvoice = async (
    currentUser: User,
    invoiceId: string,
    updates: Partial<{
        buyer_company_id:  string;
        buyer_contact_id:  string;
        order_id:          string;
        items:              InvoiceItem[];
        gst_type:          GSTType;
        gst_rate:          GSTRate;
        due_date:          string;
        notes:             string;
        created_at:        string;
    }>
): Promise<Invoice> => {
    let finalUpdates: any = { ...updates };
    if (updates.items || updates.gst_rate !== undefined) {
        // Recalculate totals if items or GST rate changed
        // We'd need the full items list if only one item changed, 
        // but for now we assume updates.items contains the full list.
    }

    const { data, error } = await supabase
        .from('sales_invoices')
        .update(finalUpdates)
        .eq('id', invoiceId)
        .eq('seller_company_id', currentUser.company_id)
        .select(INVOICE_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as Invoice;
};

export const deleteSalesInvoice = async (currentUser: User, invoiceId: string): Promise<void> => {
    const { error } = await supabase
        .from('sales_invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('seller_company_id', currentUser.company_id);

    if (error) throw new Error(error.message);
};
