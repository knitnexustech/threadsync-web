/**
 * ContactsPage.tsx
 * Feature: Contacts Book (Phase 2.5)
 *
 * The "Contacts" sub-tab inside Settings → Partners.
 * Shows all manually added companies in three groups:
 *
 *   🟢 Now on Kramiz — have linked_company_id (joined since last check)
 *   📨 Invited        — WhatsApp invite sent, not yet registered
 *   📋 Contacts       — added but not yet invited
 *
 * Used by: features/partnerships/PartnershipsPage.tsx
 */

import React from 'react';
import { User } from '../../types';
import { useContacts }      from './useContacts';
import { ContactCard }      from './components/ContactCard';
import { AddContactModal }  from './components/AddContactModal';

interface ContactsPageProps {
    currentUser: User;
}

export const ContactsPage: React.FC<ContactsPageProps> = ({ currentUser }) => {
    const canManage = currentUser.role === 'ADMIN';

    const {
        contacts, isLoading,
        newOnKramiz, invited, uncontacted,
        isAdding, editingId, form, setForm,
        isGSTValid, isPINValid, handleGSTInput, handlePINInput,
        openAdd, openEdit, closeModal, handleSave,
        handleInvite, handleConnectLinked, handleDelete,
        isSaving,
    } = useContacts(currentUser);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                {/* ── Header ────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-black text-gray-900">Contact Book</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Companies you work with — on Kramiz or not
                        </p>
                    </div>
                    {canManage && (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-[#008069] text-white rounded-xl text-sm font-black shadow-md hover:bg-[#006a57] transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Contact
                        </button>
                    )}
                </div>

                {/* ── Empty state ────────────────────────────────────────────── */}
                {contacts.length === 0 && (
                    <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 text-center">
                        <p className="text-4xl mb-3">📋</p>
                        <p className="font-black text-gray-700 mb-1">No contacts yet</p>
                        <p className="text-sm text-gray-400 mb-5">
                            Add companies you work with — even if they're not on Kramiz yet.
                            You can invite them later and use their details on Delivery Challans.
                        </p>
                        {canManage && (
                            <button
                                onClick={openAdd}
                                className="px-6 py-3 bg-[#008069] text-white rounded-xl text-sm font-black shadow-md hover:bg-[#006a57] transition-all"
                            >
                                Add your first contact →
                            </button>
                        )}
                    </div>
                )}

                {/* ── Now on Kramiz ─────────────────────────────────────────── */}
                {newOnKramiz.length > 0 && (
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-green-200">
                        <h3 className="text-sm font-black text-green-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Just Joined Kramiz
                            <span className="ml-1 text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                                {newOnKramiz.length}
                            </span>
                        </h3>
                        <p className="text-xs text-gray-400 mb-3">
                            These contacts recently signed up on Kramiz. Send them a partnership invite to connect.
                        </p>
                        <div className="space-y-2">
                            {newOnKramiz.map(c => (
                                <ContactCard
                                    key={c.id}
                                    contact={c}
                                    canManage={canManage}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onInvite={handleInvite}
                                    onConnect={handleConnectLinked}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Invited ───────────────────────────────────────────────── */}
                {invited.length > 0 && (
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-black text-amber-700 mb-3 flex items-center gap-2">
                            📨 Invite Sent
                            <span className="ml-1 text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                                {invited.length}
                            </span>
                        </h3>
                        <div className="space-y-2">
                            {invited.map(c => (
                                <ContactCard
                                    key={c.id}
                                    contact={c}
                                    canManage={canManage}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onInvite={handleInvite}
                                    onConnect={handleConnectLinked}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── All contacts (uncontacted) ────────────────────────────── */}
                {uncontacted.length > 0 && (
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-black text-gray-600 mb-3">
                            📋 All Contacts
                        </h3>
                        <div className="space-y-2">
                            {uncontacted.map(c => (
                                <ContactCard
                                    key={c.id}
                                    contact={c}
                                    canManage={canManage}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onInvite={handleInvite}
                                    onConnect={handleConnectLinked}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* ── Add / Edit Modal ────────────────────────────────────────── */}
            {isAdding && (
                <AddContactModal
                    form={form}
                    setForm={setForm}
                    isEditing={!!editingId}
                    isSaving={isSaving}
                    isGSTValid={isGSTValid}
                    isPINValid={isPINValid}
                    handleGSTInput={handleGSTInput}
                    handlePINInput={handlePINInput}
                    onSave={handleSave}
                    onClose={closeModal}
                />
            )}
        </>
    );
};
