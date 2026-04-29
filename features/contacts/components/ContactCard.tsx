/**
 * ContactCard.tsx
 * Feature: Contacts Book (Phase 2.5)
 *
 * Displays a single manual contact entry.
 *
 * States a contact can be in:
 *   - Uncontacted: just stored, no invite sent
 *   - Invited: WhatsApp link sent, awaiting signup
 *   - Linked (joined): has a Kramiz account — show "Connect" button
 *
 * Used by: features/contacts/ContactsPage.tsx
 */

import React from 'react';
import { Contact } from '../../../types';

interface ContactCardProps {
    contact:           Contact;
    canManage:         boolean;
    onEdit:            (c: Contact) => void;
    onDelete:          (c: Contact) => void;
    onInvite:          (c: Contact) => void;
    onConnect:         (c: Contact) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
    contact, canManage, onEdit, onDelete, onInvite, onConnect,
}) => {
    const isLinked   = !!contact.linked_company_id;
    const isInvited  = !!contact.invite_sent_at && !isLinked;

    // Initials avatar
    const initials = contact.name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

    return (
        <div className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
            isLinked  ? 'border-green-200 bg-green-50/30' :
            isInvited ? 'border-amber-100' :
                        'border-gray-100'
        }`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">

                <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                        isLinked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                        {initials || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <p className="font-black text-gray-900 text-sm truncate">{contact.name}</p>

                            {contact.isPartner && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full uppercase tracking-widest">
                                    Partner ✓
                                </span>
                            )}
                            {isLinked && !contact.isPartner && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full uppercase tracking-widest">
                                    On Kramiz ✓
                                </span>
                            )}
                            {isInvited && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full uppercase tracking-widest">
                                    Invited
                                </span>
                            )}
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 font-medium">
                            {contact.gst_number && (
                                <span className="font-mono tracking-wider">{contact.gst_number}</span>
                            )}
                            {contact.phone && <span className="whitespace-nowrap">📞 {contact.phone}</span>}
                            {contact.state && <span className="whitespace-nowrap">📍 {contact.state}{contact.pincode ? ` — ${contact.pincode}` : ''}</span>}
                        </div>

                        {contact.address && (
                            <p className="text-xs text-gray-400 mt-0.5 break-words line-clamp-2">{contact.address}</p>
                        )}
                        {contact.notes && (
                            <p className="text-xs text-gray-400 italic mt-0.5 truncate">{contact.notes}</p>
                        )}
                    </div>
                </div>

                {/* Actions (admin only) */}
                {canManage && (
                    <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-start sm:items-end gap-2 sm:gap-1.5 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-gray-100 sm:border-0">
                        <div className="flex-1 sm:hidden"></div> {/* Spacer on mobile */}
                        <div className="flex gap-1 order-2 sm:order-1">
                            <button
                                onClick={() => onEdit(contact)}
                                className="p-1.5 text-gray-400 hover:text-[#008069] hover:bg-green-50 rounded-lg transition-all"
                                title="Edit"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onDelete(contact)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Primary action */}
                        {contact.isPartner ? (
                            <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 uppercase tracking-tight order-1 sm:order-2">
                                Connected
                            </span>
                        ) : (contact as any).isPendingPartner ? (
                            <span className="px-3 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg border border-amber-100 uppercase tracking-tight order-1 sm:order-2">
                                Request Sent
                            </span>
                        ) : isLinked ? (
                            <button
                                onClick={() => onConnect(contact)}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-black rounded-lg hover:bg-green-700 transition-all whitespace-nowrap order-1 sm:order-2"
                            >
                                Connect →
                            </button>
                        ) : contact.phone ? (
                            <button
                                onClick={() => onInvite(contact)}
                                className="px-3 py-1.5 bg-[#25D366] text-white text-xs font-black rounded-lg hover:bg-[#128C7E] transition-all whitespace-nowrap order-1 sm:order-2"
                            >
                                {isInvited ? 'Resend Invite' : 'Invite to Kramiz'}
                            </button>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};
