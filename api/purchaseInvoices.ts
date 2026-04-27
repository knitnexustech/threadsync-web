/**
 * purchaseInvoices.ts
 * Feature: Purchase Invoices (Bills received from vendors)
 * Table: purchase_invoices
 */

import { supabase } from '../supabaseClient';
import { User, Invoice, InvoiceItem, GSTType, GSTRate, hasPermission } from '../types';

const calculateTotals = (items: InvoiceItem[], gstRate?: GSTRate, gstType?: GSTType) => {
    const subtotal   = items.reduce((sum, it) => sum + it.amount, 0);
    const isNoGST    = gstType === 'NONE';
    const gst_amount = isNoGST ? 0 : (gstRate ? parseFloat(((subtotal * gstRate) / 100).toFixed(2)) : 0);
    return { subtotal, gst_amount, total_amount: parseFloat((subtotal + gst_amount).toFixed(2)) };
};

const INVOICE_SELECT = `
    *,
    seller_company:companies!seller_company_id(id, name, gst_number, address, state, pincode, kramiz_id)
`;

// ── CREATE ───────────────────────────────────────────────────────────────────

export const createPurchaseInvoice = async (
    currentUser: User,
    params: {
        seller_company_id?: string;   // Platform Partner
        seller_name?:       string;   // Manual Vendor Name
        invoice_number:     string;   // The vendor's bill number
        order_id?:          string;
        items:              InvoiceItem[];
        gst_type?:          GSTType;
        gst_rate?:          GSTRate;
        due_date?:          string;
        notes?:             string;
        created_at?:        string;
    }
): Promise<Invoice> => {
    if (!hasPermission(currentUser.role, 'CREATE_PURCHASE_INVOICE')) {
        throw new Error('Permission denied: Cannot record purchase invoices');
    }

    if (!params.seller_company_id && !params.seller_name) {
        throw new Error('Please select a partner or enter a vendor name');
    }

    const { subtotal, gst_amount, total_amount } = calculateTotals(params.items, params.gst_rate, params.gst_type);

    const { data, error } = await supabase
        .from('purchase_invoices')
        .insert({
            created_by:        currentUser.id,
            buyer_company_id:  currentUser.company_id, // ALWAYS use UUID for visibility
            seller_company_id: params.seller_company_id || null,
            seller_name:       params.seller_name || null,
            invoice_number:    params.invoice_number,
            order_id:          params.order_id || null,
            items:             params.items,
            subtotal,
            gst_amount,
            total_amount,
            gst_type:          params.gst_type || 'NONE',
            gst_rate:          params.gst_rate || 0,
            due_date:          params.due_date || null,
            notes:             params.notes || '',
            created_at:        params.created_at || new Date().toISOString()
        })
        .select(INVOICE_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as Invoice;
};

// ── READ ─────────────────────────────────────────────────────────────────────

export const getPurchaseInvoices = async (currentUser: User): Promise<Invoice[]> => {
    // Build filter parts based on available user data
    const filters = [`created_by.eq.${currentUser.id}`];
    
    if (currentUser.company_id) {
        filters.push(`buyer_company_id.eq.${currentUser.company_id}`);
    }
    
    if (currentUser.company?.name) {
        filters.push(`buyer_company_id.eq."${currentUser.company.name}"`);
    }

    const { data, error } = await supabase
        .from('purchase_invoices')
        .select(INVOICE_SELECT)
        .or(filters.join(','))
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Invoice[];
};

export const updatePurchaseInvoice = async (
    currentUser: User,
    invoiceId: string,
    updates: Partial<{
        seller_company_id: string;
        seller_name:       string;
        buyer_company_id:  string;
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
    if (!hasPermission(currentUser.role, 'EDIT_PURCHASE_INVOICE')) {
        throw new Error('You do not have permission to edit purchase invoices');
    }
    let finalUpdates: any = { 
        ...updates,
        gst_type: updates.gst_type === 'NONE' ? null : updates.gst_type,
        gst_rate: updates.gst_type === 'NONE' ? null : updates.gst_rate,
    };

    if (updates.items) {
        const { subtotal, gst_amount, total_amount } = calculateTotals(updates.items, updates.gst_rate, updates.gst_type);
        finalUpdates.subtotal = subtotal;
        finalUpdates.gst_amount = gst_amount;
        finalUpdates.total_amount = total_amount;
    }

    const { data, error } = await supabase
        .from('purchase_invoices')
        .update(finalUpdates)
        .eq('id', invoiceId)
        .or(`created_by.eq.${currentUser.id},buyer_company_id.eq.${currentUser.company_id}`)
        .select(INVOICE_SELECT)
        .single();

    if (error) throw new Error(error.message);
    return data as Invoice;
};

export const deletePurchaseInvoice = async (currentUser: User, invoiceId: string): Promise<void> => {
    if (!hasPermission(currentUser.role, 'DELETE_PURCHASE_INVOICE')) {
        throw new Error('You do not have permission to delete purchase invoices');
    }
    const { error } = await supabase
        .from('purchase_invoices')
        .delete()
        .eq('id', invoiceId)
        .or(`created_by.eq.${currentUser.id},buyer_company_id.eq.${currentUser.company_id}`);

    if (error) throw new Error(error.message);
};

export const getPurchaseInvoicesForOrder = async (orderId: string, orderNumber?: string): Promise<Invoice[]> => {
    // Purchase Invoices use order_id (UUID)
    const { data, error } = await supabase
        .from('purchase_invoices')
        .select(INVOICE_SELECT)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Invoice[];
};
