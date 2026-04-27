/**
 * partnerUtils.ts
 * 
 * Standard utility for resolving "Transaction Parties" across all document types.
 * Every document (DC, IC, Invoice) has a FROM and a TO.
 * This utility abstracts whether the participant is a Kramiz Company or a Manual Contact.
 */

import { Company, Contact, DeliveryChallan, InwardChallan, Invoice } from '../types';

export interface UnifiedPartner {
    id:      string;
    name:    string;
    gst?:    string;
    address?: string;
    state?:   string;
    pincode?: string;
    isPlatform: boolean; // True if it's a registered Kramiz company
    raw?: any;
}

/**
 * Resolves the "Source" (From) of a document.
 */
export const resolveFrom = (doc: DeliveryChallan | InwardChallan | Invoice): UnifiedPartner | null => {
    // 1. Delivery Challan (Outward): From is always the sender (usually us)
    if ('dc_number' in doc) {
        return wrapPartner(doc.sender_company);
    }

    // 2. Inward Challan (Received): From is the sender
    if ('ic_number' in doc) {
        return wrapPartner(doc.sender_company, doc.sender_contact);
    }

    // 3. Invoice: From is the seller
    if ('invoice_number' in doc) {
        // For Purchase Invoices, we might have a textual seller_name
        const sellerNameFallback = (doc as any).seller_name;
        return wrapPartner(doc.seller_company, (doc as any).seller_contact, sellerNameFallback);
    }

    return null;
};

/**
 * Resolves the "Destination" (To) of a document.
 */
export const resolveTo = (doc: DeliveryChallan | InwardChallan | Invoice): UnifiedPartner | null => {
    // 1. Delivery Challan: To is the receiver
    if ('dc_number' in doc) {
        return wrapPartner(doc.receiver_company, doc.receiver_contact);
    }

    // 2. Inward Challan: To is the receiver (usually us)
    if ('ic_number' in doc) {
        return wrapPartner(doc.receiver_company);
    }

    // 3. Invoice: To is the buyer
    if ('invoice_number' in doc) {
        // For Purchase Invoices, buyer_company_id might be a textual name (e.g. "Jain Button House")
        const rawBuyerName = (typeof doc.buyer_company_id === 'string' && doc.buyer_company_id.length < 30) ? doc.buyer_company_id : undefined;
        return wrapPartner(doc.buyer_company, doc.buyer_contact, rawBuyerName);
    }

    return null;
};

/**
 * Helper to normalize Company or Contact into a UnifiedPartner
 */
function wrapPartner(comp?: Company, cont?: Contact, fallbackName?: string): UnifiedPartner | null {
    // Priority 1: Use the manually saved contact details if present.
    if (cont) {
        return {
            id:         cont.id,
            name:       cont.name,
            gst:        cont.gst_number,
            address:    cont.address,
            state:      cont.state,
            pincode:    cont.pincode,
            isPlatform: !!cont.linked_company_id,
            raw:        cont
        };
    }

    // Priority 2: Use platform company details if no manual contact is linked.
    if (comp) {
        return {
            id:         comp.id,
            name:       comp.name,
            gst:        comp.gst_number,
            address:    comp.address,
            state:      comp.state,
            pincode:    comp.pincode,
            isPlatform: true,
            raw:        comp
        };
    }

    // Priority 3: Fallback to a raw text name (for offline traders/manual entries)
    if (fallbackName && fallbackName.length > 0) {
        return {
            id:         'manual',
            name:       fallbackName,
            isPlatform: false
        };
    }

    return null;
}
