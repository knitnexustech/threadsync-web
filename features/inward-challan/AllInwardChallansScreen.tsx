/**
 * AllInwardChallansScreen.tsx
 * Feature: Inward Challan
 *
 * Shows a list of all Inward Challans (goods received) for the current company.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, InwardChallan, hasPermission } from '../../types';
import { api } from '../../supabaseAPI';
import { resolveFrom } from '../../services/partnerUtils';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { InwardChallanForm } from './components/InwardChallanForm';
import { SubScreenHeader, EmptyState, fmtDate } from '../orders/shared';
import { ChallanDetailView } from '../delivery-challan/components/ChallanDetailView';

interface AllInwardChallansScreenProps {
    currentUser: User;
}

export const AllInwardChallansScreen: React.FC<AllInwardChallansScreenProps> = ({ currentUser }) => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [creating, setCreating] = useState(false);
    const [editIc, setEditIc] = useState<InwardChallan | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const { data: ics = [], isLoading } = useQuery<InwardChallan[]>({
        queryKey: ['ics', currentUser.company_id],
        queryFn: () => api.getInwardChallansReceived(currentUser),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deleteInwardChallan(currentUser, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['ics'] });
            setActiveMenu(null);
            navigate('/dashboard/ics', { replace: true });
        },
        onError: (e: any) => alert(e.message),
    });

    const handleDelete = (e: React.MouseEvent, id: string, no: string) => {
        e.stopPropagation();
        if (window.confirm(`Permanently delete inward challan ${no}?`)) {
            deleteMutation.mutate(id);
        }
    };

    const canCreate = hasPermission(currentUser.role, 'CREATE_IC');
    const canEdit   = hasPermission(currentUser.role, 'EDIT_IC');
    const canDelete = hasPermission(currentUser.role, 'DELETE_IC');

    if ((creating && canCreate) || editIc) return (
        <InwardChallanForm
            currentUser={currentUser}
            initialData={editIc || undefined}
            onCreated={(id, no) => {
                qc.invalidateQueries({ queryKey: ['ics'] });
                setCreating(false);
                setEditIc(null);
                navigate(`/dashboard/ics/${id}`);
            }}
            onClose={() => {
                setCreating(false);
                setEditIc(null);
            }}
        />
    );

    const ICList = () => (
        <div className="flex flex-col h-full w-full bg-[#f0f2f5]" onClick={() => setActiveMenu(null)}>
            <SubScreenHeader
                title="Inward Challans"
                onBack={() => navigate('/dashboard')}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-4xl mx-auto space-y-3 w-full">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
                        </div>
                    ) : ics.length === 0 ? (
                        <EmptyState icon="📥" title="No inward challans" subtitle="Record goods you've received" />
                    ) : (
                        ics.map(ic => {
                            const partner = resolveFrom(ic);
                            const orderNo = ic.parent_order?.order_number || ic.order_number;
                            const displayOrderNo = orderNo && orderNo.length > 20 
                                ? orderNo.substring(0, 8).toUpperCase() 
                                : (orderNo || 'N/A');

                            return (
                                <div
                                    key={ic.id}
                                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:bg-gray-50 transition-all cursor-pointer shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] relative group"
                                >
                                    <div className="flex-1 min-w-0" onClick={() => navigate(`/dashboard/ics/${ic.id}`)}>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-bold text-gray-900 group-hover:text-[#008069] transition-colors">{ic.ic_number}</h3>
                                            {ic.discrepancies ? (
                                                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Issues</span>
                                            ) : (
                                                <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Received</span>
                                            )}
                                        </div>
                                        <p className="text-[13px] font-medium text-gray-600 truncate">
                                            {partner?.name || 'Unknown Partner'} · {fmtDate(ic.created_at)}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[11px] font-bold text-[#008069] bg-[#e7f3f1] px-2 py-0.5 rounded-lg">
                                                Order: {displayOrderNo}
                                            </span>
                                            <span className="text-[11px] text-gray-400 font-medium">
                                                {ic.items_received?.length || 0} items
                                            </span>
                                        </div>
                                    </div>

                                    {/* Menu Trigger */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === ic.id ? null : ic.id); }}
                                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01" />
                                        </svg>
                                    </button>

                                    {/* Quick Actions Menu */}
                                    {activeMenu === ic.id && (
                                        <div 
                                            className="absolute right-12 top-4 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 w-48 animate-in fade-in zoom-in-95 duration-100"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {canEdit && (
                                                <button
                                                    onClick={() => { setEditIc(ic); setActiveMenu(null); }}
                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                                >
                                                    <span className="text-lg">✏️</span> Edit Detail
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={(e) => handleDelete(e, ic.id, ic.ic_number)}
                                                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3"
                                                >
                                                    <span className="text-lg">🗑️</span> Delete IC
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
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

    const ICDrawer = () => {
        const { id } = useParams<{ id: string }>();
        const ic = ics.find(i => i.id === id);

        if (!ic && !isLoading) {
            return (
                <div className="flex flex-col h-full w-full">
                    <ICList />
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
                        <div className="bg-white p-8 rounded-[32px] shadow-2xl text-center">
                            <p className="text-gray-500 mb-4">Inward Challan not found.</p>
                            <button 
                                onClick={() => navigate('/dashboard/ics')}
                                className="px-6 py-2 bg-[#008069] text-white rounded-xl font-bold"
                            >
                                Back to List
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        
        return (
            <>
                <ICList />
                {ic && (
                    <ChallanDetailView
                        data={ic}
                        type="IC"
                        onClose={() => navigate('/dashboard/ics')}
                    />
                )}
            </>
        );
    };

    return (
        <Routes>
            <Route path="/" element={<ICList />} />
            <Route path="/:id" element={<ICDrawer />} />
        </Routes>
    );
};
