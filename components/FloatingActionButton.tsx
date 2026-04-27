/**
 * FloatingActionButton.tsx
 *
 * A floating + button fixed to the bottom-right of the screen.
 * Tapping it reveals a stacked menu of 5 quick-create actions:
 *   - New Order
 *   - New Purchase Invoice
 *   - New Sales Invoice
 *   - New Delivery Challan
 *   - New Inward Challan
 *
 * The forms are rendered as full-screen overlays. 
 * This component sits in MainLayout to be available across Dashboard and Chat.
 */

import React, { useState, useEffect } from 'react';
import { User, hasPermission } from '../types';
import { api } from '../supabaseAPI';
import { useQueryClient } from '@tanstack/react-query';

// Sub-forms (modularized)
import { QuickOrderForm }           from '../features/orders/components/QuickOrderForm';
import { QuickSalesInvoiceForm }    from '../features/invoices/components/QuickSalesInvoiceForm';
import { QuickPurchaseInvoiceForm } from '../features/invoices/components/QuickPurchaseInvoiceForm';
import { DCForm }                   from '../features/delivery-challan/components/DCForm';
import { InwardChallanForm }        from '../features/inward-challan/components/InwardChallanForm';
import { SimpleExpenseForm }      from '../features/invoices/components/SimpleExpenseForm';

type ActiveForm = null | 'ORDER' | 'P_INV' | 'S_INV' | 'DC' | 'IC' | 'EXPENSE';

interface FABProps {
    currentUser: User;
    visible: boolean;
}

export const FloatingActionButton: React.FC<FABProps> = ({ currentUser, visible }) => {
    const qc = useQueryClient();
    const [open, setOpen]             = useState(false);
    const [activeForm, setActiveForm] = useState<ActiveForm>(null);

    // Close the speed-dial when tapping backdrop
    useEffect(() => {
        if (!open) return;
        const handler = () => setOpen(false);
        setTimeout(() => document.addEventListener('click', handler), 0);
        return () => document.removeEventListener('click', handler);
    }, [open]);

    if (!visible) return null;

    const canOrder      = hasPermission(currentUser.role, 'CREATE_ORDER');
    const canDC         = hasPermission(currentUser.role, 'CREATE_DC');
    const canIC         = hasPermission(currentUser.role, 'CREATE_IC');
    const canSalesInv   = hasPermission(currentUser.role, 'CREATE_SALES_INVOICE');
    const canPurchaseInv = hasPermission(currentUser.role, 'CREATE_PURCHASE_INVOICE');
    const canExpense    = hasPermission(currentUser.role, 'CREATE_SIMPLE_EXPENSE');

    const actions = [
        canOrder       && { key: 'ORDER',   icon: '📦', label: 'Add New Order',         color: 'bg-[#008069]' },
        canPurchaseInv && { key: 'P_INV',   icon: '📥', label: 'Record Vendor Bill',    color: 'bg-orange-800' },
        canExpense     && { key: 'EXPENSE', icon: '💸', label: 'Record Quick Expense',   color: 'bg-cyan-600' },
        canSalesInv    && { key: 'S_INV',   icon: '🧾', label: 'Add New Sales Inv',     color: 'bg-indigo-600' },
        canDC          && { key: 'DC',      icon: '🚚', label: 'Add New Delivery Challan', color: 'bg-blue-600' },
        canIC          && { key: 'IC',      icon: '📦', label: 'Add New Inward Challan',   color: 'bg-teal-600' },
    ].filter(Boolean) as { key: string; icon: string; label: string; color: string }[];

    if (!actions.length) return null; // No permissions

    const handleAction = (key: string) => {
        setOpen(false);
        setActiveForm(key as ActiveForm);
    };

    return (
        <>
            {/* Speed-dial action items */}
            <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 md:bottom-8 md:right-6">
                {open && actions.map((action, i) => (
                    <div
                        key={action.key}
                        className="flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-150"
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={e => { e.stopPropagation(); handleAction(action.key); }}
                    >
                        <span className="bg-white text-gray-700 text-[13px] font-medium px-3 py-1.5 rounded-xl shadow-md border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors whitespace-nowrap">
                            {action.label}
                        </span>
                        <button 
                            className={`w-11 h-11 ${action.color} text-white rounded-full shadow-lg flex items-center justify-center text-xl hover:scale-105 transition-transform`}
                            onClick={e => { e.stopPropagation(); handleAction(action.key); }}
                        >
                            {action.icon}
                        </button>
                    </div>
                ))}

                {/* Main FAB Trigger */}
                <button
                    id="global-fab-button"
                    onClick={e => { e.stopPropagation(); setOpen(!open); }}
                    className={`w-14 h-14 bg-[#008069] text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 ${open ? 'rotate-45' : ''}`}
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
            </div>

            {/* Form overlays */}
            {activeForm === 'ORDER' && (
                <QuickOrderForm currentUser={currentUser} onClose={() => setActiveForm(null)} />
            )}
            {activeForm === 'P_INV' && (
                <QuickPurchaseInvoiceForm currentUser={currentUser} onClose={() => setActiveForm(null)} />
            )}
            {activeForm === 'S_INV' && (
                <QuickSalesInvoiceForm currentUser={currentUser} onClose={() => setActiveForm(null)} />
            )}
            {activeForm === 'DC' && (
                <DCForm
                    currentUser={currentUser}
                    onCreated={(_, dcNum) => {
                        qc.invalidateQueries({ queryKey: ['dcs'] });
                        alert(`DC ${dcNum} created!`);
                        setActiveForm(null);
                    }}
                    onClose={() => setActiveForm(null)}
                />
            )}
            {activeForm === 'IC' && (
                <InwardChallanForm
                    currentUser={currentUser}
                    onCreated={(_, icNum) => {
                        qc.invalidateQueries({ queryKey: ['ics'] });
                        qc.invalidateQueries({ queryKey: ['dcs'] });
                        alert(`Inward Challan ${icNum} recorded!`);
                        setActiveForm(null);
                    }}
                    onClose={() => setActiveForm(null)}
                />
            )}
            {activeForm === 'EXPENSE' && (
                <SimpleExpenseForm currentUser={currentUser} onClose={() => setActiveForm(null)} />
            )}
        </>
    );
};
