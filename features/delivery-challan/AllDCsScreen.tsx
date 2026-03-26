/**
 * AllDCsScreen.tsx
 * Feature: Delivery Challans (Outward)
 *
 * Shows all outward DCs for the current company.
 * Has a + button (CREATE_DC permission) that opens the existing DCForm modal.
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, DeliveryChallan, hasPermission } from '../../types';
import { api } from '../../supabaseAPI';
import { DCForm } from './components/DCForm';
import { SubScreenHeader, EmptyState, StatusBadge } from '../orders/shared';


interface AllDCsScreenProps {
    currentUser: User;
    onBack: () => void;
}

const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '–';

export const AllDCsScreen: React.FC<AllDCsScreenProps> = ({ currentUser, onBack }) => {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editDC, setEditDC] = useState<DeliveryChallan | null>(null);

    const { data: dcs = [], isLoading } = useQuery<DeliveryChallan[]>({
        queryKey: ['dcs', currentUser.company_id],
        queryFn: () => api.getDCsForCompany(currentUser),
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this DC?')) return;
        try {
            await api.deleteDeliveryChallan(currentUser, id);
            qc.invalidateQueries({ queryKey: ['dcs'] });
        } catch (err: any) { alert(err.message); }
    };

    const canCreate = hasPermission(currentUser.role, 'CREATE_DC');

    return (
        <div className="flex flex-col h-full w-full bg-[#f0f2f5]">
            <SubScreenHeader
                title="Delivery Challans"
                onBack={onBack}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-4xl mx-auto space-y-6 w-full">
                    {isLoading ? (
                        <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
                    ) : dcs.length === 0 ? (
                        <EmptyState icon="🚚" title="No delivery challans" subtitle="Tap + to create your first outward DC" />
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                            {dcs.map(dc => {
                                const isSender = dc.sender_company_id === currentUser.company_id;
                                const partnerName = isSender 
                                    ? (dc.receiver_company?.name || dc.receiver_contact_id ? "Manual Contact" : "—")
                                    : (dc.sender_company?.name || "—");
                                
                                return (
                                    <div key={dc.id} className="group flex items-center gap-3 px-4 py-4 hover:bg-gray-50/50 transition-colors">
                                        <div className={`w-10 h-10 rounded-xl ${isSender ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-blue-50 border-blue-100 text-blue-600'} border flex items-center justify-center text-lg shrink-0 shadow-sm`}>
                                            {isSender ? '📤' : '📥'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-[15px] text-gray-900 font-bold truncate">{dc.dc_number}</p>
                                                <StatusBadge status={dc.status} />
                                            </div>
                                            <p className="text-[12px] text-gray-500 font-medium truncate">
                                                <span className="text-gray-400">{isSender ? 'To: ' : 'From: '}</span>
                                                {partnerName} · {fmt(dc.created_at)}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isSender && (
                                                <button 
                                                    onClick={() => { setEditDC(dc); setShowForm(true); }}
                                                    className="p-2 text-gray-400 hover:text-[#008069] hover:bg-green-50 rounded-lg transition-all"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            )}
                                            {isSender && (
                                                <button 
                                                    onClick={() => handleDelete(dc.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <DCForm
                    currentUser={currentUser}
                    initialData={editDC || undefined}
                    onCreated={(_, dcNum) => {
                        qc.invalidateQueries({ queryKey: ['dcs'] });
                        alert(`DC ${dcNum} ${editDC ? 'updated' : 'created'}!`);
                        setShowForm(false);
                        setEditDC(null);
                    }}
                    onClose={() => { setShowForm(false); setEditDC(null); }}
                />
            )}
        </div>
    );
};
