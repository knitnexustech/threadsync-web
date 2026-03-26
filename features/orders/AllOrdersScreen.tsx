/**
 * AllOrdersScreen.tsx
 * Feature: Orders
 *
 * Shows a scrollable list of all Purchase Orders for the current company.
 * Has a + button (if the user has CREATE_PO permission) that opens the NewPOForm.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Order, hasPermission } from '../../types';
import { api } from '../../supabaseAPI';
import { SubScreenHeader, EmptyState, StatusBadge } from './shared';

interface AllOrdersScreenProps {
    currentUser: User;
    onBack: () => void;
}

const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all';

export const AllOrdersScreen: React.FC<AllOrdersScreenProps> = ({ currentUser, onBack }) => {
    const qc = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [orderNo, setOrderNo] = useState('');
    const [styleNo, setStyleNo] = useState('');

    const { data: orders = [], isLoading } = useQuery<Order[]>({
        queryKey: ['orders', currentUser.id],
        queryFn: () => api.getOrders(currentUser),
    });

    const createMutation = useMutation({
        mutationFn: () => api.createOrder(currentUser, orderNo.trim(), styleNo.trim(), []),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['orders'] });
            setCreating(false);
            setOrderNo('');
            setStyleNo('');
        },
        onError: (e: any) => alert(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteOrder(currentUser, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (e: any) => alert(e.message),
    });

    const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete order ${name}? This action cannot be undone.`)) {
            deleteMutation.mutate(id);
        }
    };

    const canCreate = hasPermission(currentUser.role, 'CREATE_ORDER');
    const canDelete = hasPermission(currentUser.role, 'DELETE_ORDER');

    // ── Create form ────────────────────────────────────────────────────────────
    if (creating) return (
        <div className="flex flex-col h-full w-full bg-[#f0f2f5]">
            <SubScreenHeader title="New Order" onBack={() => setCreating(false)} />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
                <div className="max-w-4xl mx-auto space-y-6 w-full">
                    <div className="bg-white rounded-2xl p-5 md:p-8 border border-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] space-y-5">
                        <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Order Number</label>
                        <input
                            value={orderNo}
                            onChange={e => setOrderNo(e.target.value)}
                            placeholder="e.g. PO-2024-001"
                            className={inputCls}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] text-gray-400 mb-1">Style Number</label>
                        <input
                            value={styleNo}
                            onChange={e => setStyleNo(e.target.value)}
                            placeholder="e.g. STY-BLUE-42"
                            className={inputCls}
                        />
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                        An Overview chat will be created automatically after the order is saved.
                    </p>
                    <button
                        onClick={() => createMutation.mutate()}
                        disabled={!orderNo.trim() || !styleNo.trim() || createMutation.isPending}
                        className="w-full py-3 bg-[#008069] text-white rounded-xl font-medium shadow-sm hover:bg-[#006a57] disabled:opacity-40 transition-all"
                    >
                        {createMutation.isPending ? 'Creating…' : 'Create Order'}
                    </button>
                </div>
                </div>
            </div>
        </div>
    );

    // ── List ───────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full w-full bg-[#f0f2f5]">
            <SubScreenHeader
                title="My Orders"
                onBack={onBack}
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-4xl mx-auto space-y-6 w-full">
                    {isLoading ? (
                        <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
                    ) : orders.length === 0 ? (
                        <EmptyState icon="📦" title="No orders yet" subtitle="Tap + to create your first order" />
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                        {orders.map(order => (
                            <div
                                key={order.id}
                                className="bg-white p-4 md:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-12 h-12 bg-[#e7f3f1] rounded-2xl flex items-center justify-center text-xl shadow-sm text-[#008069]">📦</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 group-hover:text-[#008069] transition-colors">{order.order_number}</h3>
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">Style: {order.style_number}</p>
                                    </div>
                                </div>

                                {canDelete && (
                                    <button
                                        onClick={(e) => handleDelete(e, order.id, order.order_number)}
                                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="Delete Order"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
