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
import { OrderFinancialOverview } from './OrderFinancialOverview';
import { QuickOrderForm } from './components/QuickOrderForm';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

interface AllOrdersScreenProps {
    currentUser: User;
}

const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all';

export const AllOrdersScreen: React.FC<AllOrdersScreenProps> = ({ currentUser }) => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [creating, setCreating] = useState(false);

    const { data: orders = [], isLoading } = useQuery<Order[]>({
        queryKey: ['orders', currentUser.id],
        queryFn: () => api.getOrders(currentUser),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteOrder(currentUser, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['orders'] });
            navigate('/dashboard/orders', { replace: true });
        },
        onError: (e: any) => alert(e.message),
    });

    const handleDelete = (e: React.MouseEvent, id: string, no: string) => {
        e.stopPropagation();
        if (window.confirm(`Permanently delete order ${no}?`)) {
            deleteMutation.mutate(id);
        }
    };

    const canCreate = hasPermission(currentUser.role, 'CREATE_ORDER');
    const canDelete = hasPermission(currentUser.role, 'DELETE_ORDER');

    const OrderList = () => (
        <div className="flex flex-col h-full w-full bg-[#f0f2f5]">
            <SubScreenHeader
                title="All Orders"
                onBack={() => navigate('/dashboard')}
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-4xl mx-auto space-y-6 w-full">
                    {isLoading ? (
                        <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
                    ) : orders.length === 0 ? (
                        <EmptyState icon="📦" title="No orders yet" subtitle="Tap + to create your first order" />
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                        {orders.map(order => {
                            const canClick = hasPermission(currentUser.role, 'VIEW_FINANCIALS');
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => canClick && navigate(`/dashboard/orders/${order.id}`)}
                                    className={`bg-white p-4 md:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors ${canClick ? 'cursor-pointer group' : 'cursor-default'}`}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${canClick ? 'bg-[#e7f3f1] text-[#008069]' : 'bg-gray-50 text-gray-400'}`}>📦</div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className={`font-bold transition-colors ${canClick ? 'text-gray-900 group-hover:text-[#008069]' : 'text-gray-500'}`}>{order.order_number}</h3>
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
                            );
                        })}
                        </div>
                    )}
                </div>
            </div>

            {canCreate && !creating && (
                <div className="fixed bottom-[84px] right-4 md:hidden z-20">
                    <button
                        onClick={() => setCreating(true)}
                        className="w-14 h-14 bg-[#008069] text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg hover:bg-[#006a57] transition-transform active:scale-95"
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );

    const OrderDetail = () => {
        const orderId = location.pathname.split('/').pop();
        const viewingOrder = orders.find(o => o.id === orderId);
        
        if (!hasPermission(currentUser.role, 'VIEW_FINANCIALS')) {
            return <Navigate to="/dashboard/orders" replace />;
        }

        if (!viewingOrder) return <div className="p-10 text-center text-gray-400">Order not found.</div>;
        
        return (
            <OrderFinancialOverview 
                currentUser={currentUser} 
                order={viewingOrder} 
            />
        );
    };

    return (
        <>
            <Routes>
                <Route path="/" element={<OrderList />} />
                <Route path="/:orderId" element={<OrderDetail />} />
            </Routes>
            {creating && (
                <QuickOrderForm
                    currentUser={currentUser}
                    onClose={() => setCreating(false)}
                />
            )}
        </>
    );
};
