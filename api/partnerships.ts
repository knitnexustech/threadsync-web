/**
 * partnerships.ts
 *
 * All API functions related to the B2B Handshake Protocol.
 * A partnership is a verified, bidirectional link between two companies.
 * Flow: Search company → Send invite → Other side accepts/rejects.
 *
 * Called via the main api object in supabaseAPI.ts — do not call directly.
 */

import { supabase } from '../supabaseClient';
import { Company, User, Partnership, hasPermission } from '../types';
import { bridgeContactToCompany } from '../services/partnerUtils';

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find a company by GST number or Kramiz ID.
 * Used in the "Connect with a Partner" search flow.
 * - If the query starts with "KRMZ-" → search by kramiz_id
 * - Otherwise → search by gst_number
 */
export const searchCompany = async (query: string): Promise<Company | null> => {
    const trimmed = query.trim().toUpperCase();
    const field = trimmed.startsWith('KRMZ-') ? 'kramiz_id' : 'gst_number';

    const { data } = await supabase
        .from('companies')
        .select('id, name, gst_number, kramiz_id')
        .eq(field, trimmed)
        .single();

    return (data as Company) || null;
};

// ─────────────────────────────────────────────────────────────────────────────
// INVITATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a partnership invitation to another company.
 * Only ADMIN and roles with MANAGE_PARTNERSHIPS permission can do this.
 */
export const sendPartnershipRequest = async (
    currentUser: User,
    targetCompanyId: string
): Promise<Partnership> => {
    if (!hasPermission(currentUser.role, 'SEND_PARTNERSHIP_INVITE')) {
        throw new Error('You do not have permission to send partnership requests');
    }
    if (targetCompanyId === currentUser.company_id) {
        throw new Error('You cannot partner with your own company');
    }

    const { data, error } = await supabase
        .from('partnerships')
        .insert({
            requester_id: currentUser.company_id,
            receiver_id: targetCompanyId,
        })
        .select()
        .single();

    if (error) throw new Error('Failed to send request: ' + error.message);
    return data as Partnership;
};

/**
 * Accept an incoming partnership request.
 * Only the receiving company's users can accept.
 */
export const acceptPartnershipRequest = async (
    currentUser: User,
    partnershipId: string
): Promise<Partnership> => {
    if (!hasPermission(currentUser.role, 'ACCEPT_PARTNERSHIP_INVITE')) {
        throw new Error('You do not have permission to accept partnership requests');
    }
    const { data, error } = await supabase
        .from('partnerships')
        .update({ status: 'ACCEPTED' })
        .eq('id', partnershipId)
        .eq('receiver_id', currentUser.company_id)
        .select()
        .single();

    if (error) throw new Error('Failed to accept: ' + error.message);

    // ── Auto-Bridge Logic ───────────────────────────────────────────────────
    // When accepting a partnership, bridge BOTH companies' identities.
    // This ensures that if A has a contact for B, OR B has a contact for A,
    // they both get upgraded to real platform connections.
    try {
        // Bridge the requester (A)
        await bridgeContactToCompany(data.requester_id);
        // Bridge the receiver (B)
        await bridgeContactToCompany(data.receiver_id);
    } catch (bridgeErr) {
        console.error('Non-critical Auto-Bridge failure:', bridgeErr);
    }

    return data as Partnership;
};

/**
 * Reject an incoming partnership request.
 * Only the receiving company's users can reject.
 */
export const rejectPartnershipRequest = async (
    currentUser: User,
    partnershipId: string
): Promise<Partnership> => {
    const { data, error } = await supabase
        .from('partnerships')
        .update({ status: 'REJECTED' })
        .eq('id', partnershipId)
        .eq('receiver_id', currentUser.company_id)
        .select()
        .single();

    if (error) throw new Error('Failed to reject: ' + error.message);
    return data as Partnership;
};

// ─────────────────────────────────────────────────────────────────────────────
// READING PARTNERSHIPS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all incoming PENDING invites for the current company.
 * Used to show the "You have X new connection requests" badge/list.
 */
export const getPendingInvites = async (currentUser: User): Promise<Partnership[]> => {
    const { data, error } = await supabase
        .from('partnerships')
        .select('*, requester:requester_id(id, name, gst_number, kramiz_id)')
        .eq('receiver_id', currentUser.company_id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Partnership[];
};

/**
 * Get all ACCEPTED partner companies for the current user's company.
 * Returns the "other side" company object in each accepted partnership.
 * Used in: Sidebar PARTNERS tab, group creation partner picker.
 */
export const getPartners = async (currentUser: User): Promise<Company[]> => {
    const { data, error } = await supabase
        .from('partnerships')
        .select(
            'requester_id, receiver_id,' +
            'requester:requester_id(id, name, gst_number, kramiz_id),' +
            'receiver:receiver_id(id, name, gst_number, kramiz_id)'
        )
        .eq('status', 'ACCEPTED')
        .or(`requester_id.eq.${currentUser.company_id},receiver_id.eq.${currentUser.company_id}`);

    if (error) throw new Error(error.message);

    // For each partnership, return the company that is NOT the current user's company
    return (data || [])
        .map((p: any) => {
            const isRequester = p.requester_id === currentUser.company_id;
            return isRequester ? p.receiver : p.requester;
        })
        .filter(Boolean) as Company[];
};

/**
 * Get ALL partnership records involving the current company.
 * Used to check if a request already exists (Pending/Accepted/Rejected)
 * to avoid duplicate key errors.
 */
export const getAllPartnerships = async (currentUser: User): Promise<Partnership[]> => {
    const { data, error } = await supabase
        .from('partnerships')
        .select('*, requester:requester_id(id, name), receiver:receiver_id(id, name)')
        .or(`requester_id.eq.${currentUser.company_id},receiver_id.eq.${currentUser.company_id}`);

    if (error) throw new Error(error.message);
    return (data || []) as Partnership[];
};

/**
 * Alias of getPartners — used specifically for the group/channel creation
 * dropdown to make intent clear at the call site.
 */
export const getAcceptedPartners = async (currentUser: User): Promise<Company[]> => {
    return getPartners(currentUser);
};
