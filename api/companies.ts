/**
 * companies.ts
 *
 * All API functions related to Company identity and settings.
 * This covers reading/updating company profile data:
 *   - Company name
 *   - GST number (verified identity)
 *   - Kramiz ID (auto-generated fallback identity)
 *   - Organization deletion
 *
 * Called via the main api object in supabaseAPI.ts — do not call directly.
 */

import { supabase, supabaseAdmin } from '../supabaseClient';
import { Company, User } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single company by its ID.
 * Used throughout the app to resolve company details from an ID.
 */
export const getCompany = async (id: string): Promise<Company | null> => {
    const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

    return (data as Company) || null;
};

/**
 * checkGSTAvailability — called on Step 1 of the signup wizard.
 *
 * Returns:
 *   available  — false if a company with this GST already exists on Kramiz
 *   prefill    — name/address/state/pincode if someone stored this GST in their
 *                contacts book, so Step 2 can be pre-filled for verification
 *
 * Privacy: the caller never learns WHO stored the contact — only the company
 * profile data (name, address, state, pincode) is returned.
 */
export const checkGSTAvailability = async (gstNumber: string): Promise<{
    available: boolean;
    prefill: { name: string; address?: string; state?: string; pincode?: string } | null;
}> => {
    const gst = gstNumber.trim().toUpperCase();

    // 1. Is this GST already a registered company?
    const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('gst_number', gst)
        .single();

    if (existingCompany) {
        return { available: false, prefill: null };
    }

    // 2. Is it in any contacts book? (for pre-fill — safe fields only)
    const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('name, address, state, pincode')
        .eq('gst_number', gst)
        .limit(1)
        .maybeSingle();

    return {
        available: true,
        prefill: contact
            ? { name: contact.name, address: contact.address, state: contact.state, pincode: contact.pincode }
            : null,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update the display name of a company.
 * Only Admins should be allowed to call this (enforced in the UI).
 */
export const updateCompanyName = async (
    companyId: string,
    newName: string
): Promise<void> => {
    if (!newName.trim()) throw new Error('Company name cannot be empty');

    const { error } = await supabase
        .from('companies')
        .update({ name: newName.trim() })
        .eq('id', companyId);

    if (error) throw new Error('Failed to update company name: ' + error.message);
};

/**
 * Update the GST number for a company.
 * Rules:
 *   - Must be exactly 15 characters
 *   - Only uppercase letters (A–Z) and digits (0–9)
 *   - Pass an empty string to clear / remove the GST number
 */
export const updateGSTNumber = async (
    companyId: string,
    gstNumber: string
): Promise<void> => {
    const trimmed = gstNumber.trim().toUpperCase();

    if (trimmed && !/^[A-Z0-9]{15}$/.test(trimmed)) {
        throw new Error(
            'GST number must be exactly 15 characters (uppercase letters and numbers only)'
        );
    }

    const { error } = await supabase
        .from('companies')
        .update({ gst_number: trimmed || null })
        .eq('id', companyId);

    if (error) throw new Error('Failed to update GST number: ' + error.message);
};

/**
 * Update the company's address profile fields in a single call.
 * All fields are optional — pass only what changed.
 * Pincode is validated as 6 digits if provided.
 */
export const updateCompanyProfile = async (
    companyId: string,
    profile: { address?: string; state?: string; pincode?: string }
): Promise<void> => {
    if (profile.pincode && !/^\d{6}$/.test(profile.pincode)) {
        throw new Error('PIN code must be exactly 6 digits');
    }

    const updates: Record<string, string | null> = {};
    if ('address' in profile) updates.address = profile.address?.trim() || null;
    if ('state'   in profile) updates.state   = profile.state?.trim()   || null;
    if ('pincode' in profile) updates.pincode  = profile.pincode?.trim() || null;

    const { error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId);

    if (error) throw new Error('Failed to update company profile: ' + error.message);
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Permanently delete an organization and all its data.
 * This is an irreversible action — only the ADMIN of the company can do this.
 * Uses supabaseAdmin to bypass RLS for the full cascade delete.
 */
export const deleteOrganization = async (
    currentUser: User,
    companyId: string
): Promise<void> => {
    if (currentUser.role !== 'ADMIN') {
        throw new Error('Only Admins can delete an organization');
    }
    if (currentUser.company_id !== companyId) {
        throw new Error('Unauthorized: you can only delete your own organization');
    }

    const { error } = await supabaseAdmin
        .from('companies')
        .delete()
        .eq('id', companyId);

    if (error) throw new Error('Failed to delete organization: ' + error.message);
};
