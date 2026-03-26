/**
 * PendingInviteCard.tsx
 * Feature: Handshake Protocol (Phase 2)
 *
 * Displays a single incoming partnership invite.
 * Shows the requesting company's details and Accept / Decline buttons.
 */

import React from 'react';
import { Partnership } from '../../../types';

interface PendingInviteCardProps {
    invite: Partnership;
    onAccept: (partnershipId: string) => void;
    onReject: (partnershipId: string) => void;
    isProcessing: boolean;
}

export const PendingInviteCard: React.FC<PendingInviteCardProps> = ({
    invite, onAccept, onReject, isProcessing,
}) => {
    // The requester company is populated via the Supabase join in getPendingInvites()
    const requester = (invite as any).requester as {
        id: string;
        name: string;
        gst_number?: string;
        kramiz_id?: string;
    } | null;

    if (!requester) return null;

    const timeAgo = (() => {
        if (!invite.created_at) return '';
        const diff = Date.now() - new Date(invite.created_at).getTime();
        const mins = Math.floor(diff / 60_000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    })();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
            {/* Company avatar + info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 shadow-sm flex items-center justify-center text-2xl font-black text-amber-700 shrink-0">
                    {requester.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="font-black text-gray-900 truncate">{requester.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {requester.kramiz_id && (
                            <span className="text-[10px] font-mono bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                                {requester.kramiz_id}
                            </span>
                        )}
                        {requester.gst_number && (
                            <span className="text-[10px] font-mono bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span>✓</span> {requester.gst_number}
                            </span>
                        )}
                        {timeAgo && (
                            <span className="text-[10px] text-gray-400">{timeAgo}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
                <button
                    onClick={() => onReject(invite.id)}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
                >
                    ✕ Decline
                </button>
                <button
                    onClick={() => onAccept(invite.id)}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-[#008069] text-white hover:bg-[#006a57] rounded-xl text-sm font-bold shadow-md disabled:opacity-40 transition-all"
                >
                    ✓ Accept
                </button>
            </div>
        </div>
    );
};
