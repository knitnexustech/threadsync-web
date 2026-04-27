/**
 * DashboardView.tsx
 *
 * Master-detail layout:
 *   Mobile  — full-screen push navigation (list → sub-screen)
 *   Desktop — left list (fixed 288px) + right detail fills the rest
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { User, Order, DeliveryChallan, InwardChallan, Invoice } from '../types';
import { api } from '../supabaseAPI';

import { AllOrdersScreen }         from '../features/orders/AllOrdersScreen';
import { AllDCsScreen }            from '../features/delivery-challan/AllDCsScreen';
import { AllInwardChallansScreen } from '../features/inward-challan/AllInwardChallansScreen';
import { AllSalesInvoicesScreen }    from '../features/invoices/AllSalesInvoicesScreen';
import { AllPurchaseInvoicesScreen } from '../features/invoices/AllPurchaseInvoicesScreen';

interface DashboardViewProps { currentUser: User; }

// ── Empty right-panel (desktop placeholder) ─────────────────────────────────
const RightPlaceholder: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#f0f2f5]">
        <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow flex items-center justify-center text-2xl mb-3">📋</div>
        <p className="text-[14px] font-medium text-gray-500">Select a category</p>
        <p className="text-[12px] text-gray-400 mt-1">Choose from the list on the left to get started</p>
    </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isRoot = location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const activeRoute = pathSegments[1] || ''; // 'orders', 'dcs', etc.

    const { data: orders = [] }      = useQuery<Order[]>         ({ queryKey: ['orders',            currentUser.id],         queryFn: () => api.getOrders(currentUser) });
    const { data: dcs = [] }         = useQuery<DeliveryChallan[]>({ queryKey: ['dcs',               currentUser.company_id], queryFn: () => api.getDCsForCompany(currentUser) });
    const { data: ics = [] }         = useQuery<InwardChallan[]>  ({ queryKey: ['ics',               currentUser.company_id], queryFn: () => api.getInwardChallansReceived(currentUser) });
    const { data: sInvoices = [] }   = useQuery<Invoice[]>        ({ queryKey: ['sales_invoices',    currentUser.company_id], queryFn: () => api.getSalesInvoices(currentUser) });
    const { data: pInvoices = [] }   = useQuery<Invoice[]>        ({ queryKey: ['purchase_invoices', currentUser.company_id], queryFn: () => api.getPurchaseInvoices(currentUser) });

    const rows = [
        { key: 'orders',     icon: '📦', iconBg: 'bg-green-50  border-green-100',  label: 'All Orders',        count: orders.length,    subtitle: 'Overview of all orders' },
        { key: 'dcs',        icon: '🚚', iconBg: 'bg-orange-50 border-orange-100', label: 'Delivery Challans', count: dcs.length,       subtitle: 'Outward dispatches' },
        { key: 'ics',        icon: '📥', iconBg: 'bg-teal-50   border-teal-100',   label: 'Inward Challans',   count: ics.length,       subtitle: 'Goods received' },
        (currentUser.role === 'ADMIN') && { key: 'sales_invoices', icon: '🧾', iconBg: 'bg-indigo-50 border-indigo-100', label: 'Sales Invoices',    count: sInvoices.length,  subtitle: 'Bills issued' },
        { key: 'purchase_invoices', icon: '💸', iconBg: 'bg-orange-50 border-orange-100', label: 'Purchase Invoices', count: pInvoices.length,  subtitle: 'Bills received' },
    ].filter(Boolean) as any[];

    const screenProps = { currentUser };

    const ListPanel = (
        <div className="flex flex-col h-full w-full bg-[#f0f2f5]">
            <div className="bg-white border-b border-gray-100 px-5 pt-5 pb-4 shadow-sm">
                <p className="text-[11px] text-gray-400 mb-1">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h1 className="text-[18px] font-semibold text-gray-900">
                    Hi, {currentUser.name.split(' ')[0]} 👋
                </h1>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pt-4 pb-24 space-y-1">
                <p className="text-[11px] text-gray-400 uppercase tracking-widest px-2 pb-2">Documents</p>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-100">
                    {rows.map(row => (
                        <button
                            key={row.key}
                            onClick={() => navigate(`/dashboard/${row.key}`)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left
                                ${activeRoute === row.key
                                    ? 'bg-green-50 border-l-[3px] border-l-[#008069]'
                                    : 'hover:bg-gray-50 active:bg-gray-100'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-base flex-shrink-0 ${row.iconBg}`}>
                                {row.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[14px] ${activeRoute === row.key ? 'text-[#008069] font-medium' : 'text-gray-800'}`}>
                                    {row.label}
                                </p>
                                <p className="text-[11px] text-gray-400">{row.subtitle}</p>
                            </div>
                            {row.count > 0 && (
                                <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                                    {row.count}
                                </span>
                            )}
                            <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const RightContent = () => {
        return (
            <Routes>
                <Route path="/" element={<RightPlaceholder />} />
                <Route path="/orders/*" element={<AllOrdersScreen {...screenProps} />} />
                <Route path="/dcs/*" element={<AllDCsScreen {...screenProps} />} />
                <Route path="/ics/*" element={<AllInwardChallansScreen {...screenProps} />} />
                <Route path="/sales_invoices/*" element={<AllSalesInvoicesScreen {...screenProps} />} />
                <Route path="/purchase_invoices/*" element={<AllPurchaseInvoicesScreen {...screenProps} />} />
            </Routes>
        );
    };

    return (
        <div className="flex h-full w-full overflow-hidden">
            <div className={`h-full flex-shrink-0 border-r border-gray-200 bg-[#f0f2f5] ${!isRoot ? 'hidden md:block md:w-72 lg:w-80' : 'block w-full md:w-72 lg:w-80'}`}>
                {ListPanel}
            </div>
            <div className={`h-full overflow-hidden ${!isRoot ? 'block flex-1' : 'hidden md:block md:flex-1'}`}>
                <RightContent />
            </div>
        </div>
    );
};
