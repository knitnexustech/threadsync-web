/**
 * PartnershipsPage.tsx
 * Feature: Partners (Phase 2 + Phase 2.5)
 *
 * The Partners tab inside Settings. Two sub-tabs:
 *
 *   Connected  — Kramiz-registered partners (Handshake Protocol)
 *                Pending invites, Search, Active partners list
 *
 *   Contacts   — Manual contacts book (offline companies + invite flow)
 *                Add, edit, invite to Kramiz, connect when they join
 *
 * Only ADMIN users can manage (send/accept/reject invites, add contacts).
 * Non-admins see the active partners list read-only.
 *
 * Used by: SettingsPage.tsx → PARTNERS section
 */

import React, { useState } from 'react';
import { User } from '../../types';
import { usePartnerships }   from './usePartnerships';
import { SearchCompanyPanel } from './components/SearchCompanyPanel';
import { PendingInviteCard }  from './components/PendingInviteCard';
import { PartnerCard }        from './components/PartnerCard';
import { ContactsPage }       from '../contacts/ContactsPage';

type PartnersTab = 'connected' | 'contacts';

interface PartnershipsPageProps {
    currentUser: User;
}

export const PartnershipsPage: React.FC<PartnershipsPageProps> = ({ currentUser }) => {
    const canManage = currentUser.role === 'ADMIN';
    const [activeTab, setActiveTab] = useState<PartnersTab>('connected');

    const {
        searchQuery, setSearchQuery,
        searchResult, searchError,
        isSearching, handleSearch, clearSearch,
        partners, loadingPartners,
        pendingInvites, loadingInvites,
        sendInvite, isSendingInvite, inviteSent,
        acceptInvite, isAccepting,
        rejectInvite, isRejecting,
    } = usePartnerships(currentUser);

    const isProcessing       = isAccepting || isRejecting;
    const pendingCount       = pendingInvites.length;

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

            {/* ── Sub-tab bar ─────────────────────────────────────────────── */}
            <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
                <button
                    onClick={() => setActiveTab('connected')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'connected'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    🤝 Connected
                    {pendingCount > 0 && (
                        <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full">
                            {pendingCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('contacts')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === 'contacts'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    📋 Contacts
                </button>
            </div>

            {/* ── Connected tab ───────────────────────────────────────────── */}
            {activeTab === 'connected' && (
                <div className="space-y-5">

                    {/* Pending Invites */}
                    {canManage && (
                        <>
                            {loadingInvites ? (
                                <div className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
                            ) : pendingCount > 0 ? (
                                <section className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100">
                                    <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-base">📨</div>
                                        Pending Invites
                                        <span className="ml-1 text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">
                                            {pendingCount}
                                        </span>
                                    </h2>
                                    <div className="space-y-3">
                                        {pendingInvites.map(invite => (
                                            <PendingInviteCard
                                                key={invite.id}
                                                invite={invite}
                                                onAccept={acceptInvite}
                                                onReject={rejectInvite}
                                                isProcessing={isProcessing}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ) : null}
                        </>
                    )}

                    {/* Search / Connect */}
                    {canManage && (
                        <SearchCompanyPanel
                            searchQuery={searchQuery}
                            onQueryChange={setSearchQuery}
                            onSearch={handleSearch}
                            onClear={clearSearch}
                            isSearching={isSearching}
                            searchResult={searchResult}
                            searchError={searchError}
                            onSendInvite={sendInvite}
                            isSendingInvite={isSendingInvite}
                            inviteSent={inviteSent}
                        />
                    )}

                    {/* Active Partners list */}
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center text-base">🤝</div>
                            Your Partners
                            {!loadingPartners && (
                                <span className="ml-1 text-xs text-gray-400 font-normal">
                                    {partners.length === 0 ? 'None yet' : `${partners.length} connected`}
                                </span>
                            )}
                        </h2>

                        {loadingPartners ? (
                            <div className="space-y-3">
                                {[1, 2].map(i => <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />)}
                            </div>
                        ) : partners.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-3xl mb-2">🤝</p>
                                <p className="text-sm font-bold text-gray-500">No partners yet</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {canManage
                                        ? 'Search by GST or Kramiz ID above, or invite from your Contacts tab'
                                        : 'Ask your Admin to connect with partner companies'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {partners.map(partner => (
                                    <PartnerCard key={partner.id} partner={partner} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* ── Contacts tab ────────────────────────────────────────────── */}
            {activeTab === 'contacts' && (
                <ContactsPage currentUser={currentUser} />
            )}
        </div>
    );
};
