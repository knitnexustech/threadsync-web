/**
 * useContacts.ts
 * Feature: Contacts Book (Phase 2.5)
 *
 * Manages all state for the manual contacts list:
 *   - Fetching contacts (with linked Kramiz company detection)
 *   - Creating, updating, deleting contacts
 *   - Marking invite sent
 *   - Linking to a Kramiz partner after they join
 *
 * Used by: features/contacts/ContactsPage.tsx
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../supabaseAPI';
import { Contact, User } from '../../types';

const BLANK_FORM = {
    name:       '',
    gst_number: '',
    address:    '',
    state:      '',
    pincode:    '',
    phone:      '',
    notes:      '',
};

export type ContactForm = typeof BLANK_FORM;

export const useContacts = (currentUser: User) => {
    const queryClient = useQueryClient();
    const qKey = ['contacts', currentUser.company_id];

    // ── State ──────────────────────────────────────────────────────────────────

    const [isAdding, setIsAdding]     = useState(false);  // controls Add modal visibility
    const [editingId, setEditingId]   = useState<string | null>(null);
    const [form, setForm]             = useState<ContactForm>(BLANK_FORM);

    // ── Query ──────────────────────────────────────────────────────────────────

    const { data: contacts = [], isLoading } = useQuery<Contact[]>({
        queryKey: qKey,
        queryFn:  () => api.getContacts(currentUser),
        refetchInterval: 60_000, // poll every 60s for "joined Kramiz" badge updates
    });

    const { data: allPartnerships = [] } = useQuery({
        queryKey: ['all-partnerships', currentUser.company_id],
        queryFn:  () => api.getAllPartnerships(currentUser),
    });

    // ── Helpers ────────────────────────────────────────────────────────────────

    const invalidate = () => queryClient.invalidateQueries({ queryKey: qKey });

    // GST validation for the form (empty is OK)
    const isGSTValid = form.gst_number === '' || /^[A-Z0-9]{15}$/.test(form.gst_number);
    const isPINValid = form.pincode    === '' || /^\d{6}$/.test(form.pincode);

    const handleGSTInput = (value: string) => {
        const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (cleaned.length <= 15) setForm(f => ({ ...f, gst_number: cleaned }));
    };

    const handlePINInput = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 6) setForm(f => ({ ...f, pincode: cleaned }));
    };

    const openAdd = () => {
        setForm(BLANK_FORM);
        setEditingId(null);
        setIsAdding(true);
    };

    const openEdit = (contact: Contact) => {
        setForm({
            name:       contact.name       || '',
            gst_number: contact.gst_number || '',
            address:    contact.address    || '',
            state:      contact.state      || '',
            pincode:    contact.pincode    || '',
            phone:      contact.phone      || '',
            notes:      contact.notes      || '',
        });
        setEditingId(contact.id);
        setIsAdding(true); // reuse the same modal
    };

    const closeModal = () => {
        setIsAdding(false);
        setEditingId(null);
        setForm(BLANK_FORM);
    };

    // ── Mutations ──────────────────────────────────────────────────────────────

    const createMutation = useMutation({
        mutationFn: () => api.createContact(currentUser, form),
        onSuccess:  () => { invalidate(); closeModal(); },
        onError:    (err: any) => alert(err.message || 'Failed to save contact'),
    });

    const updateMutation = useMutation({
        mutationFn: () => api.updateContact(currentUser, editingId!, form),
        onSuccess:  () => { invalidate(); closeModal(); },
        onError:    (err: any) => alert(err.message || 'Failed to update contact'),
    });

    const deleteMutation = useMutation({
        mutationFn: (contactId: string) => api.deleteContact(currentUser, contactId),
        onSuccess:  () => invalidate(),
        onError:    (err: any) => alert(err.message || 'Failed to delete contact'),
    });

    const markInviteMutation = useMutation({
        mutationFn: (contactId: string) => api.markInviteSent(currentUser, contactId),
        onSuccess:  () => invalidate(),
    });

    // ── Actions ────────────────────────────────────────────────────────────────

    const handleSave = () => {
        if (!form.name.trim()) { alert('Contact name is required'); return; }
        if (!isGSTValid)        { alert('GST must be exactly 15 characters'); return; }
        if (!isPINValid)        { alert('PIN code must be exactly 6 digits'); return; }
        editingId ? updateMutation.mutate() : createMutation.mutate();
    };

    /**
     * Generates a WhatsApp invite link for the contact and marks it as sent.
     * The invite deep-links to the Kramiz signup page — the receiver signs up
     * with their GST and the system auto-links the contact record.
     */
    const handleInvite = (contact: Contact) => {
        const gstHint = contact.gst_number ? `&gst=${contact.gst_number}` : '';
        const signupUrl = `${window.location.origin}/?signup=true${gstHint}`;
        const message = encodeURIComponent(
            `Hi ${contact.name},\n\nWe use Kramiz to manage our production orders digitally. ` +
            `Join us on Kramiz to receive and share delivery challans, track orders, and more.\n\n` +
            `Sign up here: ${signupUrl}\n\n` +
            `(It's free and only takes 2 minutes)`
        );
        window.open(`https://wa.me/${contact.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
        markInviteMutation.mutate(contact.id);
    };

    /**
     * When a contact has joined Kramiz (linked_company_id is set),
     * send them a partnership invite so they show up in Connected partners.
     */
    const handleConnectLinked = async (contact: Contact) => {
        if (!contact.linked_company_id) return;
        try {
            await api.sendPartnershipRequest(currentUser, contact.linked_company_id);
            alert(`Partnership invite sent to ${contact.name}! They'll see it in their Partners tab.`);
        } catch (err: any) {
            alert(err.message || 'Failed to send partnership invite');
        }
    };

    const handleDelete = (contact: Contact) => {
        if (!confirm(`Delete "${contact.name}" from your contacts? This cannot be undone.`)) return;
        deleteMutation.mutate(contact.id);
    };

    // ── Derived lists ──────────────────────────────────────────────────────────

    const activePartnerIds = allPartnerships
        .filter(p => p.status === 'ACCEPTED')
        .map(p => (p.requester_id === currentUser.company_id ? p.receiver_id : p.requester_id));

    const pendingPartnerIds = allPartnerships
        .filter(p => p.status === 'PENDING')
        .map(p => (p.requester_id === currentUser.company_id ? p.receiver_id : p.requester_id));
    
    // Map contacts to include isPartner and isPendingPartner flags
    const processedContacts = contacts.map(c => ({
        ...c,
        isPartner: c.linked_company_id ? activePartnerIds.includes(c.linked_company_id) : false,
        isPendingPartner: c.linked_company_id ? pendingPartnerIds.includes(c.linked_company_id) : false
    }));

    const newOnKramiz = processedContacts.filter(c => c.linked_company_id && !c.isPartner);
    const invited     = processedContacts.filter(c => c.invite_sent_at && !c.linked_company_id);
    const uncontacted = processedContacts.filter(c => !c.linked_company_id || (c.linked_company_id && c.isPartner));
    const linked      = processedContacts.filter(c => c.linked_company_id);

    return {
        // Data
        contacts: processedContacts, isLoading,
        newOnKramiz, invited, uncontacted, linked,

        // Modal state
        isAdding, editingId, form, setForm,

        // Field helpers
        isGSTValid, isPINValid, handleGSTInput, handlePINInput,

        // Actions
        openAdd, openEdit, closeModal, handleSave, handleInvite,
        handleConnectLinked, handleDelete,

        // Loading flags
        isSaving:   createMutation.isPending || updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};
