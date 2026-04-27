/**
 * SearchCompanyPanel.tsx
 * Feature: Handshake Protocol (Phase 2)
 *
 * Allows an admin to search for another company by:
 *   - GST number (15-char alphanumeric)
 *   - Kramiz ID (starts with KRMZ-)
 *
 * On a successful match, shows the company card and a "Send Invite" button.
 */

import React from 'react';
import { Company } from '../../../types';

interface SearchCompanyPanelProps {
    searchQuery: string;
    onQueryChange: (v: string) => void;
    onSearch: () => void;
    onClear: () => void;
    isSearching: boolean;
    searchResult: Company | null;
    searchError: string | null;
    onSendInvite: (companyId: string) => void;
    isSendingInvite: boolean;
    inviteSent: boolean;
}

export const SearchCompanyPanel: React.FC<SearchCompanyPanelProps> = ({
    searchQuery, onQueryChange, onSearch, onClear,
    isSearching, searchResult, searchError,
    onSendInvite, isSendingInvite, inviteSent,
}) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onSearch();
    };

    return (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-lg">🔗</div>
                Connect with a Partner
            </h2>
            <p className="text-xs text-gray-400 mb-5">
                Search by GST number or Kramiz ID to send a connection invite
            </p>

            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => onQueryChange(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                    onKeyDown={handleKeyDown}
                    placeholder="GST number or KRMZ-XXXXX"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all"
                    maxLength={20}
                />
                <div className="flex gap-2">
                    {searchQuery && (
                        <button
                            onClick={onClear}
                            className="px-3 py-3 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 rounded-xl border border-gray-100 sm:border-transparent sm:bg-transparent"
                            title="Clear"
                        >
                            ✕
                        </button>
                    )}
                    <button
                        onClick={onSearch}
                        disabled={!searchQuery.trim() || isSearching}
                        className="px-6 py-3 bg-[#008069] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#006a57] disabled:opacity-40 transition-all flex justify-center items-center gap-2 flex-1 sm:flex-none"
                    >
                        {isSearching ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                        ) : '🔍'}
                        Search
                    </button>
                </div>
            </div>

            {/* Hint */}
            {!searchResult && !searchError && (
                <p className="text-[11px] text-gray-400 mt-2">
                    Tip: Kramiz IDs start with <span className="font-mono font-bold">KRMZ-</span> — find it in your partner's Settings page
                </p>
            )}

            {/* Error state */}
            {searchError && (
                <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                    <span className="text-red-400 text-lg mt-0.5">⚠</span>
                    <p className="text-sm text-red-600">{searchError}</p>
                </div>
            )}

            {/* Result card */}
            {searchResult && (
                <div className="mt-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white border border-green-200 shadow-sm flex items-center justify-center text-2xl font-black text-green-700">
                                {searchResult.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-black text-gray-900 text-base">{searchResult.name}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {searchResult.kramiz_id && (
                                        <span className="text-[10px] font-mono bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">
                                            {searchResult.kramiz_id}
                                        </span>
                                    )}
                                    {searchResult.gst_number && (
                                        <span className="text-[10px] font-mono bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <span>✓</span> {searchResult.gst_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => onSendInvite(searchResult.id)}
                            disabled={isSendingInvite || inviteSent}
                            className="shrink-0 px-5 py-2.5 bg-[#008069] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#006a57] disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {isSendingInvite ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                            ) : inviteSent ? '✓ Sent' : '📨 Send Invite'}
                        </button>
                    </div>
                    {inviteSent && (
                        <p className="text-xs text-green-600 mt-3 font-medium">
                            ✓ Invite sent! They'll see it in their Settings → Partners tab.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
};
