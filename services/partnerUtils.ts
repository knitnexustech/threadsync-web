/**
 * partnerUtils.ts
 * 
 * Standard utility for resolving "Transaction Parties" across all document types.
 * Every document (DC, IC, Invoice) has a FROM and a TO.
 * This utility abstracts whether the participant is a Kramiz Company or a Manual Contact.
 */

import { Company, Contact, DeliveryChallan, InwardChallan, Invoice } from '../types';
import { supabaseAdmin } from '../supabaseClient';

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

/**
 * Finds any manual contacts with a specific GST or phone and "bridges" them to a real company.
 * This includes updating groups (channels) to include the new company's staff.
 */
export const bridgeContactToCompany = async (companyId: string) => {
    try {
        // 1. Get details of the company to bridge
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

        if (!company) return;

        // 2. Get admins of the company (to match by phone)
        const { data: admins } = await supabaseAdmin
            .from('users')
            .select('id, phone')
            .eq('company_id', companyId)
            .eq('role', 'ADMIN');
        
        const adminIds = (admins || []).map(a => a.id);
        const adminPhones = (admins || []).map(a => a.phone).filter(Boolean);

        // 3. Find all contacts that were manually created for this identity
        // We match by GST or by any of the admin phone numbers.
        let filterParts: string[] = [];
        if (company.gst_number) filterParts.push(`gst_number.eq.${company.gst_number}`);
        if (adminPhones.length > 0) filterParts.push(`phone.in.(${adminPhones.join(',')})`);

        if (filterParts.length === 0) return;

        const { data: contactsToBridge } = await supabaseAdmin
            .from('contacts')
            .select('id, owner_company_id')
            .or(filterParts.join(','))
            .is('linked_company_id', null);

        if (!contactsToBridge || contactsToBridge.length === 0) return;

        for (const contact of contactsToBridge) {
            // A. Link the contact record itself
            await supabaseAdmin
                .from('contacts')
                .update({
                    linked_company_id: company.id,
                    name:    company.name,
                    address: company.address,
                    state:   company.state,
                    pincode: company.pincode,
                })
                .eq('id', contact.id);

            // B. Find all channels linked to this contact
            const { data: channels } = await supabaseAdmin
                .from('channels')
                .select('id')
                .eq('contact_id', contact.id);

            if (channels && channels.length > 0) {
                console.log(`[Auto-Bridge] Found ${channels.length} channels for contact ${contact.id}`);
                for (const chan of channels) {
                    // i. Update the channel record
                    await supabaseAdmin
                        .from('channels')
                        .update({
                            vendor_id:  company.id,
                            contact_id: null,
                            type:       'VENDOR'
                        })
                        .eq('id', chan.id);

                    // ii. Add new company admins to the channel so they can see it
                    if (adminIds.length > 0) {
                        const newMembers = adminIds.map(uid => ({
                            channel_id: chan.id,
                            user_id:    uid,
                            added_by:   uid // Self-join as system entry
                        }));
                        
                        await supabaseAdmin
                            .from('channel_members')
                            .upsert(newMembers, { onConflict: 'channel_id, user_id' });
                    }
                }
            }
            console.log(`[Auto-Bridge] Successfully bridged contact ${contact.id} to company ${company.id}`);
        }
    } catch (err) {
        console.error('[Auto-Bridge] Failure:', err);
    }
};
