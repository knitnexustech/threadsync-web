
/**
 * AllPurchaseInvoicesScreen.tsx
 * Feature: Unified Outflow Listing (Bills & Expenses)
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Invoice, Expense, hasPermission } from '../../types';
import { api } from '../../supabaseAPI';
import { resolveFrom } from '../../services/partnerUtils';
import { SubScreenHeader, EmptyState, fmtDate, fmtAmount } from '../orders/shared';
import { QuickPurchaseInvoiceForm } from './components/QuickPurchaseInvoiceForm';
import { SimpleExpenseForm } from './components/SimpleExpenseForm';
import { useNavigate } from 'react-router-dom';

export const AllPurchaseInvoicesScreen: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const canViewBills = hasPermission(currentUser.role, 'VIEW_FINANCIALS');
    const [tab, setTab] = useState<'BILLS' | 'EXPENSES'>(canViewBills ? 'BILLS' : 'EXPENSES');
    const [editInv, setEditInv] = useState<Invoice | null>(null);

    // Queries
    const { data: invoices = [], isLoading: loadingBills } = useQuery<Invoice[]>({
        queryKey: ['purchase_invoices', currentUser.company_id],
        queryFn: () => api.getPurchaseInvoices(currentUser),
        enabled: tab === 'BILLS'
    });

    const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
        queryKey: ['expenses', currentUser.company_id],
        queryFn: () => api.getExpenses(currentUser),
        enabled: tab === 'EXPENSES'
    });

    const handleDeleteBill = async (id: string) => {
        if (!confirm('Delete this vendor bill?')) return;
        try {
            await api.deletePurchaseInvoice(currentUser, id);
            qc.invalidateQueries({ queryKey: ['purchase_invoices'] });
        } catch (err: any) { alert(err.message); }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('Delete this cash expense?')) return;
        try {
            await api.deleteExpense(currentUser, id);
            qc.invalidateQueries({ queryKey: ['expenses'] });
        } catch (err: any) { alert(err.message); }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f9fa] animate-in slide-in-from-right-4 duration-300">
            <SubScreenHeader 
                title={canViewBills ? "Purchase & Expenses" : "My Expenses"} 
                onBack={() => navigate('/dashboard')} 
            />

            {/* Tab Switcher - Only for those who can see both */}
            {canViewBills && (
                <div className="px-4 py-2 bg-white border-b border-gray-100 flex gap-2">
                    <button 
                        onClick={() => setTab('BILLS')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'BILLS' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        Vendor Bills 📥
                    </button>
                    <button 
                        onClick={() => setTab('EXPENSES')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'EXPENSES' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-100' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        Cash Expenses 💸
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {tab === 'BILLS' ? (
                    <>
                        {loadingBills ? <div className="p-10 text-center animate-pulse text-gray-300 font-bold">Loading Bills...</div> : invoices.length === 0 ? (
                            <EmptyState icon="📥" title="No Vendor Bills" subtitle="Your formal purchase history is empty." />
                        ) : (
                            invoices.map(inv => (
                                <div key={inv.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex justify-between items-center group relative">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg uppercase tracking-tighter">Bill</span>
                                            <p className="text-sm font-bold text-gray-900">{inv.invoice_number}</p>
                                        </div>
                                        <p className="text-[12px] text-gray-500 font-medium mt-1">Seller: {resolveFrom(inv)?.name || 'Manual Vendor'}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{fmtDate(inv.created_at || '')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-gray-900">{fmtAmount(inv.total_amount)}</p>
                                        <div className="flex gap-2 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {hasPermission(currentUser.role, 'EDIT_PURCHASE_INVOICE') && (
                                                <button onClick={() => setEditInv(inv)} className="text-[10px] font-bold text-blue-500 uppercase">Edit</button>
                                            )}
                                            {hasPermission(currentUser.role, 'DELETE_PURCHASE_INVOICE') && (
                                                <button onClick={() => handleDeleteBill(inv.id)} className="text-[10px] font-bold text-red-500 uppercase">Delete</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                ) : (
                    <>
                        {loadingExpenses ? <div className="p-10 text-center animate-pulse text-gray-300 font-bold">Loading Expenses...</div> : expenses.length === 0 ? (
                            <EmptyState icon="💸" title="No Cash Expenses" subtitle="You haven't recorded any petty cash outflows." />
                        ) : (
                            expenses.map(ex => (
                                <div key={ex.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex justify-between items-center group relative">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-lg uppercase tracking-tighter">Cash</span>
                                            <p className="text-sm font-bold text-gray-900">{ex.description}</p>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">{fmtDate(ex.created_at || '')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-gray-900">{fmtAmount(ex.amount)}</p>
                                        {hasPermission(currentUser.role, 'DELETE_SIMPLE_EXPENSE') && (
                                            <button onClick={() => handleDeleteExpense(ex.id)} className="text-[10px] font-bold text-red-500 uppercase mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            {editInv && <QuickPurchaseInvoiceForm currentUser={currentUser} initialData={editInv} onClose={() => setEditInv(null)} />}
        </div>
    );
};
