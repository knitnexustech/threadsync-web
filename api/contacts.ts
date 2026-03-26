/**
 * contacts.ts
 * API Module: Contacts Book (Phase 2.5)
 *
 * Manages manually added contacts — companies that may or may not be on Kramiz.
 * A contact can be:
 *   - Purely manual (not on Kramiz, used for DC generation)
 *   - Invited (WhatsApp link sent, not yet registered)
 *   - Linked (they joined Kramiz → linked_company_id is set)
 *
 * Uses named exports so `...contactsApi` spreads cleanly into the api object.
 */

import { supabase } from '../supabaseClient';
import { Contact, User } from '../types';

// Fetch all contacts owned by the current company
export const getContacts = async (currentUser: User): Promise<Contact[]> => {
    const { data, error } = await supabase
        .from('contacts')
        .select('*, linked_company:linked_company_id(id, name, gst_number, kramiz_id, address, state, pincode)')
        .eq('owner_company_id', currentUser.company_id)
        .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as Contact[];
};

// Create a new manual contact
export const createContact = async (
    currentUser: User,
    contact: Pick<Contact, 'name' | 'gst_number' | 'address' | 'state' | 'pincode' | 'phone' | 'notes'>
): Promise<Contact> => {
    if (!contact.name.trim()) throw new Error('Contact name is required');

    const { data, error } = await supabase
        .from('contacts')
        .insert({
            owner_company_id: currentUser.company_id,
            ...contact,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') throw new Error('A contact with this GST number already exists');
        throw new Error('Failed to create contact: ' + error.message);
    }

    return data as Contact;
};

// Update an existing contact's details
export const updateContact = async (
    currentUser: User,
    contactId: string,
    updates: Partial<Pick<Contact, 'name' | 'gst_number' | 'address' | 'state' | 'pincode' | 'phone' | 'notes'>>
): Promise<Contact> => {
    const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contactId)
        .eq('owner_company_id', currentUser.company_id)
        .select()
        .single();

    if (error) throw new Error('Failed to update contact: ' + error.message);
    return data as Contact;
};

// Delete a contact
export const deleteContact = async (currentUser: User, contactId: string): Promise<void> => {
    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('owner_company_id', currentUser.company_id);

    if (error) throw new Error('Failed to delete contact: ' + error.message);
};

// Mark a contact as "invite sent" — records the timestamp
export const markInviteSent = async (currentUser: User, contactId: string): Promise<void> => {
    const { error } = await supabase
        .from('contacts')
        .update({ invite_sent_at: new Date().toISOString() })
        .eq('id', contactId)
        .eq('owner_company_id', currentUser.company_id);

    if (error) throw new Error('Failed to mark invite: ' + error.message);
};

// Link a contact to a registered Kramiz company
export const linkContactToCompany = async (
    currentUser: User,
    contactId: string,
    kramizCompanyId: string
): Promise<void> => {
    const { error } = await supabase
        .from('contacts')
        .update({ linked_company_id: kramizCompanyId })
        .eq('id', contactId)
        .eq('owner_company_id', currentUser.company_id);

    if (error) throw new Error('Failed to link contact: ' + error.message);
};
