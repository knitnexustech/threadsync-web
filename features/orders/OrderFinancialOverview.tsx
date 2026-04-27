/**
 * OrderFinancialOverview.tsx
 * Feature: Orders
 * 
 * A consolidated view of all Logistics (Challans) and Financial (Invoices) documents 
 * related to a specific Purchase Order.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Order, Invoice, DeliveryChallan, InwardChallan, Expense, hasPermission } from '../../types';
import { api } from '../../supabaseAPI';
import { SubScreenHeader, StatusBadge, fmtDate, fmtAmount } from './shared';
import { resolveFrom, resolveTo } from '../../services/partnerUtils';
import { useNavigate } from 'react-router-dom';

interface OrderFinancialOverviewProps {
    currentUser: User;
    order:       Order;
}

export const OrderFinancialOverview: React.FC<OrderFinancialOverviewProps> = ({ currentUser, order }) => {
    const navigate = useNavigate();
    const canViewFinancials = hasPermission(currentUser.role, 'VIEW_FINANCIALS');
    // ── Queries ────────────────────────────────────────────────────────────────
    // Improved fetching: Some docs are linked by order.id (UUID), some by order.order_number (String)
    const { data: salesInvoices = [] } = useQuery<Invoice[]>({
        queryKey: ['sales_invoices', 'order', order.id],
        queryFn: () => api.getSalesInvoicesForOrder(order.id, order.order_number)
    });

    const { data: purchaseInvoices = [] } = useQuery<Invoice[]>({
        queryKey: ['purchase_invoices', 'order', order.id],
        queryFn: () => api.getPurchaseInvoicesForOrder(order.id, order.order_number)
    });

    const { data: deliveryChallans = [] } = useQuery<DeliveryChallan[]>({
        queryKey: ['delivery_challans', 'order', order.id],
        queryFn: () => api.getDCsForOrder(order.id, order.order_number)
    });

    const { data: inwardChallans = [] } = useQuery<InwardChallan[]>({
        queryKey: ['inward_challans', 'order', order.id],
        queryFn: () => api.getInwardChallansForOrder(order.id, order.order_number)
    });

    const { data: expenses = [] } = useQuery<Expense[]>({
        queryKey: ['expenses', 'order', order.id],
        queryFn: () => api.getOrderExpenses(order.id)
    });

    // ── Calculations ───────────────────────────────────────────────────────────
    const salesTotal = useMemo(() => 
        salesInvoices.reduce((sum, inv) => sum + inv.total_amount, 0), 
    [salesInvoices]);

    const purchaseTotal = useMemo(() => 
        purchaseInvoices.reduce((sum, inv) => sum + inv.total_amount, 0), 
    [purchaseInvoices]);

    const expenseTotal = useMemo(() => 
        expenses.reduce((sum, ex) => sum + ex.amount, 0),
    [expenses]);

    const netProfit = salesTotal - (purchaseTotal + expenseTotal);
    const profitColor = netProfit > 0 ? 'text-green-600' : netProfit < 0 ? 'text-red-600' : 'text-gray-600';

    // ── Render Helpers ─────────────────────────────────────────────────────────
    const renderCard = (icon: string, label: string, amount: number, color: string) => (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{icon}</span>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">{label}</span>
            </div>
            <p className={`text-xl font-black ${color}`}>{fmtAmount(amount)}</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] animate-in slide-in-from-right-4 duration-300">
            <SubScreenHeader 
                title={order.order_number} 
                subtitle={`Style: ${order.style_number}`} 
                onBack={() => navigate(-1)} 
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-6">
                {/* 1. Profit Summary */}
                {canViewFinancials ? (
                    <div className="grid grid-cols-4 gap-2">
                        {renderCard('📈', 'Sales', salesTotal, 'text-[#008069]')}
                        {renderCard('📉', 'Bills', purchaseTotal, 'text-orange-600')}
                        {renderCard('💸', 'Expenses', expenseTotal, 'text-red-500')}
                        {renderCard(netProfit >= 0 ? '💰' : '⚠️', 'Margin', Math.abs(netProfit), profitColor)}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
                        <span className="text-2xl mb-2 block">🔒</span>
                        <p className="text-sm font-bold text-gray-900">Financial Data Restricted</p>
                        <p className="text-[11px] text-gray-400 mt-1">Contact admin for permission to view profit margins.</p>
                    </div>
                )}

                {/* 2. Inward Challans */}
                <section>
                    <h4 className="px-1 text-[13px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                        Inward Challans
                    </h4>
                    <div className="space-y-2">
                        {inwardChallans.map(ic => {
                            const party = resolveFrom(ic as any)?.name;
                            return (
                                <div key={ic.ic_number} className="bg-white rounded-xl border border-gray-100 p-3 flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{ic.ic_number}</p>
                                            <p className="text-[12px] text-gray-400 font-medium">From: {party || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-900">{ic.items_received?.length || 0} items</p>
                                        <p className="text-[10px] font-bold text-gray-400">{fmtDate(ic.created_at || '')}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {inwardChallans.length === 0 && (
                            <p className="text-center py-4 text-xs text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">No inward challans yet</p>
                        )}
                    </div>
                </section>

                {/* 3. Delivery Challans */}
                <section>
                    <h4 className="px-1 text-[13px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Delivery Challans
                    </h4>
                    <div className="space-y-2">
                        {deliveryChallans.map(dc => {
                            const party = resolveTo(dc as any)?.name;
                            return (
                                <div key={dc.dc_number} className="bg-white rounded-xl border border-gray-100 p-3 flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{dc.dc_number}</p>
                                            <p className="text-[12px] text-gray-400 font-medium">To: {party || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-900">{dc.items?.length || 0} items</p>
                                        <p className="text-[10px] font-bold text-gray-400">{fmtDate(dc.created_at || '')}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {deliveryChallans.length === 0 && (
                            <p className="text-center py-4 text-xs text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">No delivery challans yet</p>
                        )}
                    </div>
                </section>

                {/* 4. Expenses */}
                {canViewFinancials && (
                    <section>
                        <h4 className="px-1 text-[13px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Miscellaneous Expenses
                        </h4>
                        <div className="space-y-2">
                            {expenses.map(ex => (
                                <div key={ex.id} className="bg-white rounded-xl border border-gray-100 p-3 flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{ex.description}</p>
                                            <p className="text-[12px] text-gray-400 font-medium">Type: Expense</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-red-500">-{fmtAmount(ex.amount)}</p>
                                        <p className="text-[10px] font-bold text-gray-400">{fmtDate(ex.created_at || '')}</p>
                                    </div>
                                </div>
                            ))}
                            {expenses.length === 0 && (
                                <p className="text-center py-4 text-xs text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">No expenses yet</p>
                            )}
                        </div>
                    </section>
                )}

                {/* 5. Purchase Invoices */}
                {canViewFinancials && (
                    <section>
                        <h4 className="px-1 text-[13px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                            Purchase Invoices (Bills)
                        </h4>
                        <div className="space-y-2">
                            {purchaseInvoices.map(inv => {
                                const party = resolveFrom(inv as any)?.name;
                                return (
                                    <div key={inv.id} className="bg-white rounded-xl border border-gray-100 p-3 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{inv.invoice_number}</p>
                                                <p className="text-[12px] text-gray-400 font-medium">Seller: {party || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-orange-600">-{fmtAmount(inv.total_amount)}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{fmtDate(inv.created_at || '')}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {purchaseInvoices.length === 0 && (
                                <p className="text-center py-4 text-xs text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">No purchase bills yet</p>
                            )}
                        </div>
                    </section>
                )}

                {/* 5. Sales Invoices */}
                {canViewFinancials && (
                    <section>
                        <h4 className="px-1 text-[13px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#008069]"></span>
                            Sales Invoices (Revenue)
                        </h4>
                        <div className="space-y-2">
                            {salesInvoices.map(inv => {
                                const party = resolveTo(inv as any)?.name;
                                return (
                                    <div key={inv.id} className="bg-white rounded-xl border border-gray-100 p-3 flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{inv.invoice_number}</p>
                                                <p className="text-[12px] text-gray-400 font-medium">Buyer: {party || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-[#008069]">+{fmtAmount(inv.total_amount)}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{fmtDate(inv.created_at || '')}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {salesInvoices.length === 0 && (
                                <p className="text-center py-4 text-xs text-gray-400 bg-white/50 rounded-xl border border-dashed border-gray-200">No sales invoices yet</p>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};
