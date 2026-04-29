
/**
 * SimpleExpenseForm.tsx
 * Feature: Quick Cash Outflow (Labour, Tea, Auto, etc.)
 * 
 * A simplified, mobile-first form for recording non-vendor expenses.
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Order } from '../../../types';
import { api } from '../../../supabaseAPI';

interface SimpleExpenseFormProps {
    currentUser: User;
    onCreated?:  (id: string, desc: string) => void;
    onClose:     () => void;
}

export const SimpleExpenseForm: React.FC<SimpleExpenseFormProps> = ({ currentUser, onCreated, onClose }) => {
    const qc = useQueryClient();
    
    const [description, setDescription] = useState('');
    const [amount, setAmount]           = useState('');
    const [orderId, setOrderId]         = useState('');
    const [saving, setSaving]           = useState(false);

    const { data: orders = [] } = useQuery<Order[]>({
        queryKey: ['orders', currentUser.id],
        queryFn:  () => api.getOrders(currentUser),
    });

    const handleCreate = async () => {
        if (!description.trim()) return alert('Please enter what this was for');
        if (!amount || parseFloat(amount) <= 0) return alert('Please enter a valid amount');

        setSaving(true);
        try {
            await api.createExpense(currentUser, {
                description: description.trim(),
                amount:      parseFloat(amount),
                order_id:    orderId || undefined,
                created_at:  new Date().toISOString()
            });

            qc.invalidateQueries({ queryKey: ['expenses'] });
            if (orderId) qc.invalidateQueries({ queryKey: ['expenses', 'order', orderId] });
            
            if (onCreated) onCreated('new', description.trim());
            alert('Quick Expense recorded!');
            onClose();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all';
    const labelCls = 'block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest px-1';

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[4px]" onClick={onClose}>
            <div className="modal-container w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Record Quick Expense</h3>
                        <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-widest mt-0.5">Labour, Tea, Auto, etc.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400">✕</button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    <div>
                        <label className={labelCls}>What was it for?</label>
                        <input 
                            autoFocus
                            placeholder="e.g. Tea for Labours, Auto charge" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)} 
                            className={inputCls + " font-medium"} 
                        />
                    </div>

                    <div>
                        <label className={labelCls}>How much? (₹)</label>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className={inputCls + " font-black text-2xl text-[#008069]"} 
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Link to Order (Optional)</label>
                        <select 
                            value={orderId} 
                            onChange={e => setOrderId(e.target.value)} 
                            className={inputCls + " text-sm"}
                        >
                            <option value="">No Order Reference</option>
                            {orders.map(o => (
                                <option key={o.id} value={o.id}>{o.order_number} — {o.style_number}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex gap-3 safe-pb-deep">
                    <button onClick={onClose} className="flex-1 py-4 text-gray-500 font-bold rounded-2xl">Cancel</button>
                    <button
                        onClick={handleCreate}
                        disabled={!description.trim() || !amount || saving}
                        className="flex-[2] py-4 bg-[#008069] text-white font-bold rounded-2xl shadow-lg hover:bg-[#006a57] disabled:opacity-40 transition-all"
                    >
                        {saving ? 'Recording...' : 'Record Cash Expense 💸'}
                    </button>
                </div>
            </div>
        </div>
    );
};
