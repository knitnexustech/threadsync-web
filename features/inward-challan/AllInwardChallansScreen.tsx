/**
 * AllInwardChallansScreen.tsx
 * Feature: Inward Challans
 *
 * Lists all Inward Challans received by the current company.
 * Has a + button (CREATE_IC permission) that opens the create form inline.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, InwardChallan, hasPermission } from '../../types';
import { api } from '../../supabaseAPI';
import { InwardChallanForm } from './components/InwardChallanForm';
import { SubScreenHeader, EmptyState, fmtDate } from '../orders/shared';

interface AllInwardChallansScreenProps {
    currentUser: User;
    onBack: () => void;
}

const BLANK_ITEM = { description: '', quantity: 0, unit: 'KG' };

export const AllInwardChallansScreen: React.FC<AllInwardChallansScreenProps> = ({ currentUser, onBack }) => {
    const qc = useQueryClient();
    const [creating, setCreating] = useState(false);
    const [editIc, setEditIc]       = useState<InwardChallan | null>(null);

    // Queries
    const { data: ics = [], isLoading } = useQuery<InwardChallan[]>({
        queryKey: ['ics', currentUser.company_id],
        queryFn: () => api.getInwardChallansReceived(currentUser),
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Inward Challan?')) return;
        try {
            await api.deleteInwardChallan(currentUser, id);
            qc.invalidateQueries({ queryKey: ['ics'] });
        } catch (err: any) { alert(err.message); }
    };

    const canCreate = hasPermission(currentUser.role, 'CREATE_IC');

    // ── Create/Edit form ────────────────────────────────────────────────────────────
    if ((creating && canCreate) || editIc) return (
        <InwardChallanForm
            currentUser={currentUser}
            initialData={editIc || undefined}
            onCreated={(_, num) => {
                qc.invalidateQueries({ queryKey: ['ics'] });
                setCreating(false);
                setEditIc(null);
                alert(`Inward Challan ${num} ${editIc ? 'updated' : 'recorded'}!`);
            }}
            onClose={() => { setCreating(false); setEditIc(null); }}
        />
    );

    // ── List ───────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full w-full bg-[#f0f2f5] animate-in slide-in-from-right-4 duration-300">
            <SubScreenHeader
                title="Inward Challans"
                subtitle="Goods received ledger"
                onBack={onBack}
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-4xl mx-auto space-y-4 w-full">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
                        </div>
                    ) : ics.length === 0 ? (
                        <EmptyState icon="📥" title="No inward challans" subtitle="Tap + to record goods you've received" />
                    ) : (
                        ics.map(ic => (
                            <div key={ic.id} className="group flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-xl shrink-0">
                                    📥
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] text-gray-900 font-bold truncate">{ic.ic_number}</p>
                                    <p className="text-[12px] text-gray-500 font-medium">
                                        <span className="text-gray-400">From: </span>
                                        {(ic as any).sender_company?.name || (ic as any).sender_contact?.name || 'Manual Contact'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-tighter mt-1">
                                        Received {fmtDate(ic.created_at)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {ic.discrepancies ? (
                                        <span className="text-[9px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-red-100">
                                            Issues Found
                                        </span>
                                    ) : (
                                        <span className="text-[9px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-green-100">
                                            Clear Receipt
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setEditIc(ic)}
                                            className="p-2 text-gray-400 hover:text-[#008069] hover:bg-green-50 rounded-xl transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(ic.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {canCreate && !creating && (
                <button 
                    onClick={() => setCreating(true)}
                    className="fixed right-6 bottom-24 w-14 h-14 bg-[#008069] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            )}
        </div>
    );
};
