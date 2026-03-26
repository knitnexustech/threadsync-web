/**
 * QuickOrderForm.tsx
 * Feature: Purchase Orders (Phase 1)
 *
 * Simple slide-up form for quick creation of a new Purchase Order.
 * Creates a PO with minimal fields (Order #, Style #) and its auto-overview group.
 */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '../../../types';
import { api } from '../../../supabaseAPI';

interface QuickOrderFormProps {
    currentUser: User;
    onClose:     () => void;
}

export const QuickOrderForm: React.FC<QuickOrderFormProps> = ({ currentUser, onClose }) => {
    const qc = useQueryClient();
    const [orderNo, setOrderNo]   = useState('');
    const [styleNo, setStyleNo]   = useState('');
    const [saving, setSaving]     = useState(false);

    const handleCreate = async () => {
        if (!orderNo.trim() || !styleNo.trim()) return alert('Fill in both fields');
        setSaving(true);
        try {
            await api.createOrder(currentUser, orderNo.trim(), styleNo.trim(), []);
            qc.invalidateQueries({ queryKey: ['orders'] });
            alert(`Order #${orderNo} created!`);
            onClose();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
            <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-none">
                    <h3 className="text-lg font-bold text-gray-900">New Order</h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
                </div>

                <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Order Number</label>
                        <input value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="e.g. PO-2024-001" className={inputCls} autoFocus />
                    </div>
                    <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Style Number</label>
                        <input value={styleNo} onChange={e => setStyleNo(e.target.value)} placeholder="e.g. STY-BLUE-42" className={inputCls} />
                    </div>
                    <p className="text-[11px] text-gray-400">An Overview chat will be created automatically.</p>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex gap-3 flex-none">
                    <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-2xl text-sm font-medium hover:bg-gray-50 transition-all">Cancel</button>
                    <button
                        onClick={handleCreate}
                        disabled={!orderNo.trim() || !styleNo.trim() || saving}
                        className="flex-[2] py-3 bg-[#008069] text-white rounded-2xl text-sm font-medium shadow-sm hover:bg-[#006a57] disabled:opacity-40 transition-all"
                    >
                        {saving ? 'Creating…' : 'Create Order'}
                    </button>
                </div>
            </div>
        </div>
    );
};
