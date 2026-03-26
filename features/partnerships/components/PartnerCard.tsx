/**
 * PartnerCard.tsx
 * Feature: Handshake Protocol (Phase 2)
 *
 * Displays a single active (accepted) partner company.
 */

import React from 'react';
import { Company } from '../../../types';

interface PartnerCardProps {
    partner: Company;
}

export const PartnerCard: React.FC<PartnerCardProps> = ({ partner }) => {
    return (
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            {/* Avatar */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-xl font-black text-green-700 shrink-0 border border-green-200">
                {partner.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 truncate">{partner.name}</p>
                    <span className="shrink-0 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        ✓ Connected
                    </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {partner.kramiz_id && (
                        <span className="text-[10px] font-mono text-gray-400">
                            {partner.kramiz_id}
                        </span>
                    )}
                    {partner.gst_number && (
                        <span className="text-[10px] font-mono text-gray-400">
                            · GST {partner.gst_number}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
