/**
 * DCCard.tsx
 * Feature: Delivery Challan (Phase 3)
 *
 * Renders a DC as a rich card inside the chat message stream.
 * Message content format: [DC:{dc_id}]
 *
 * States:
 *   PENDING  — receiver sees "Mark Received" + "Raise Dispute" buttons
 *   RECEIVED — green "Received ✓" badge
 *   DISPUTED — red "Disputed" badge
 *
 * Used by: ChatRoom message renderer
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../../supabaseAPI';
import { DeliveryChallan, User } from '../../../types';

interface DCCardProps {
    dcId:        string;
    currentUser: User;
    onStatusChange?: () => void;  // refresh parent message list
}

const STATUS_STYLES: Record<string, string> = {
    PENDING:  'bg-amber-100 text-amber-700',
    RECEIVED: 'bg-green-100 text-green-700',
    DISPUTED: 'bg-red-100  text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
    PENDING:  '⏳ Awaiting Confirmation',
    RECEIVED: '✓  Received',
    DISPUTED: '⚠  Disputed',
};

export const DCCard: React.FC<DCCardProps> = ({ dcId, currentUser, onStatusChange }) => {
    const [dc, setDC]         = useState<DeliveryChallan | null>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing]   = useState(false);

    useEffect(() => {
        api.getDCById(dcId).then(data => { setDC(data); setLoading(false); });
    }, [dcId]);

    const isReceiver = dc?.receiver_company_id === currentUser.company_id;

    const handleMarkReceived = async () => {
        if (!dc || acting) return;
        setActing(true);
        try {
            await api.markDCReceived(currentUser, dc.id);
            setDC(d => d ? { ...d, status: 'RECEIVED' } : d);
            onStatusChange?.();
        } catch (err: any) { alert(err.message); }
        finally { setActing(false); }
    };

    const handleDispute = async () => {
        if (!dc || acting) return;
        if (!confirm('Mark this DC as disputed? This will notify the sender.')) return;
        setActing(true);
        try {
            await api.markDCDisputed(currentUser, dc.id);
            setDC(d => d ? { ...d, status: 'DISPUTED' } : d);
            onStatusChange?.();
        } catch (err: any) { alert(err.message); }
        finally { setActing(false); }
    };

    if (loading) {
        return <div className="h-32 w-72 bg-gray-100 rounded-2xl animate-pulse" />;
    }

    if (!dc) {
        return <div className="text-xs text-gray-400 italic">DC not found</div>;
    }

    return (
        <div className="w-80 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-base">📦</span>
                            <p className="font-black text-gray-900 text-sm">{dc.dc_number}</p>
                        </div>
                        <p className="text-xs text-gray-400">
                            {dc.sender_company?.name ?? 'Unknown sender'}
                            <span className="mx-1">→</span>
                            {dc.receiver_company?.name ?? 'Contact'}
                        </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLES[dc.status]}`}>
                        {STATUS_LABEL[dc.status]}
                    </span>
                </div>

                {(dc.order_number || dc.ref_order_number) && (
                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                        {dc.order_number     && <span>Order: <strong className="text-gray-600">{dc.order_number}</strong></span>}
                        {dc.ref_order_number && <span>Ref: <strong className="text-gray-600">{dc.ref_order_number}</strong></span>}
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Items</p>
                <div className="space-y-1">
                    {dc.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 truncate flex-1">{item.description}</span>
                            <span className="font-mono font-bold text-gray-900 ml-2 flex-shrink-0">
                                {item.quantity} <span className="font-normal text-gray-400 text-xs">{item.unit}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Driver */}
            {(dc.driver_name || dc.driver_phone) && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                    {dc.driver_photo_url ? (
                        <img src={dc.driver_photo_url} alt="Driver" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold flex-shrink-0">
                            🚚
                        </div>
                    )}
                    <div className="min-w-0">
                        {dc.driver_name  && <p className="text-xs font-bold text-gray-700 truncate">{dc.driver_name}</p>}
                        {dc.driver_phone && <p className="text-xs text-gray-400">+91 {dc.driver_phone}</p>}
                    </div>
                </div>
            )}

            {/* Notes */}
            {dc.notes && (
                <div className="px-4 pb-3 pt-1">
                    <p className="text-xs text-gray-400 italic">{dc.notes}</p>
                </div>
            )}

            {/* Receiver actions */}
            {isReceiver && dc.status === 'PENDING' && (
                <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-gray-100">
                    <button
                        onClick={handleDispute}
                        disabled={acting}
                        className="flex-1 py-2 border-2 border-red-200 text-red-500 rounded-xl text-xs font-black hover:bg-red-50 disabled:opacity-40 transition-all"
                    >
                        Dispute
                    </button>
                    <button
                        onClick={handleMarkReceived}
                        disabled={acting}
                        className="flex-[2] py-2 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 disabled:opacity-40 transition-all"
                    >
                        {acting ? 'Updating...' : '✓ Mark Received'}
                    </button>
                </div>
            )}
        </div>
    );
};
