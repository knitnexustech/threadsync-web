/**
 * AllDCsScreen.tsx
 * Feature: Delivery Challans (Outward)
 *
 * Shows all outward DCs for the current company.
 * Has a + button (CREATE_DC permission) that opens the existing DCForm modal.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, DeliveryChallan, hasPermission, Company } from '../../types';
import { api } from '../../supabaseAPI';
import { resolveTo, resolveFrom } from '../../services/partnerUtils';
import { DCForm } from './components/DCForm';
import { ChallanDetailView } from './components/ChallanDetailView';
import { SubScreenHeader, EmptyState, StatusBadge } from '../orders/shared';
import { generateDocumentPDF } from '../../services/documentEngine';
import { useQuery as useCompanyQuery } from '@tanstack/react-query';
import { DocumentShareModal } from '../../components/DocumentShareModal';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

interface AllDCsScreenProps {
    currentUser: User;
}

const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '–';

export const AllDCsScreen: React.FC<AllDCsScreenProps> = ({ currentUser }) => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [showForm, setShowForm] = useState(false);
    const [editDC, setEditDC] = useState<DeliveryChallan | null>(null);
    const [sharingDoc, setSharingDoc] = useState<{ data: DeliveryChallan, pdf: string } | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const { data: dcs = [], isLoading } = useQuery<DeliveryChallan[]>({
        queryKey: ['dcs', currentUser.company_id],
        queryFn: () => api.getDCsForCompany(currentUser),
    });

    const { data: company } = useCompanyQuery<Company>({
        queryKey: ['company', currentUser.company_id],
        queryFn: () => api.getCompany(currentUser.company_id),
    });

    const handleDownload = async (dc: DeliveryChallan) => {
        if (!company) return;
        try {
            const pdfBase64 = await generateDocumentPDF('DC', dc, company, true); 
            setSharingDoc({ data: dc, pdf: pdfBase64 });
        } catch (err: any) { alert(err.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this DC?')) return;
        try {
            await api.deleteDeliveryChallan(currentUser, id);
            qc.invalidateQueries({ queryKey: ['dcs'] });
        } catch (err: any) { alert(err.message); }
    };

    const canCreate = hasPermission(currentUser.role, 'CREATE_DC');
    const canEdit   = hasPermission(currentUser.role, 'EDIT_DC');
    const canDelete = hasPermission(currentUser.role, 'DELETE_DC');

    const DCListContent = (
        <div className="flex flex-col h-full w-full bg-[#f0f2f5]" onClick={() => setActiveMenu(null)}>
            <SubScreenHeader
                title="Delivery Challans"
                onBack={() => navigate('/dashboard')}
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20">
                <div className="max-w-4xl mx-auto space-y-4 w-full">
                    {isLoading ? (
                        <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
                    ) : dcs.length === 0 ? (
                        <EmptyState icon="🚚" title="No delivery challans" subtitle="Create your first outward DC" />
                    ) : (
                        <div className="space-y-3">
                            {dcs.map(dc => {
                                const isSender = dc.sender_company_id === currentUser.company_id;
                                const to   = resolveTo(dc);
                                const from = resolveFrom(dc);
                                const partnerName = isSender ? (to?.name || "—") : (from?.name || "—");
                                
                                return (
                                    <div key={dc.id} className="relative group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0" onClick={() => navigate(`/dashboard/dcs/${dc.id}`)}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[13px] text-gray-900 font-bold truncate">
                                                    {dc.dc_number}
                                                </p>
                                                <StatusBadge status={dc.status} />
                                            </div>
                                            <p className="text-[12px] text-gray-500 font-medium truncate">
                                                <span className="text-gray-400">{isSender ? 'To: ' : 'From: '}</span>
                                                {partnerName} · {fmt(dc.created_at)}
                                            </p>
                                            {(dc.order_number || dc.parent_order) && (
                                                <div className="mt-2">
                                                    <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-100">
                                                        Order: {dc.parent_order?.order_number || (dc.order_number && dc.order_number.length > 20 ? dc.order_number.substring(0, 8).toUpperCase() : dc.order_number)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                                                     <div className="flex items-center gap-1">
                                            {/* Desktop Actions */}
                                            <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => navigate(`/dashboard/dcs/${dc.id}`)}
                                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Quick View"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                {isSender && (
                                                    <button 
                                                        onClick={() => handleDownload(dc)}
                                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Share / Print"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                                    </button>
                                                )}
                                                {isSender && dc.status !== 'BILLED' && canEdit && (
                                                    <button 
                                                        onClick={() => { setEditDC(dc); setShowForm(true); }}
                                                        className="p-2 text-gray-400 hover:text-[#008069] hover:bg-green-50 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                )}
                                                {isSender && dc.status !== 'BILLED' && canDelete && (
                                                    <button 
                                                        onClick={() => handleDelete(dc.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Mobile Actions (Three Dots) */}
                                            <div className="relative md:hidden">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === dc.id ? null : dc.id); }}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                                </button>

                                                {activeMenu === dc.id && (
                                                    <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden divide-y divide-gray-50 animate-in fade-in zoom-in duration-100 origin-top-right">
                                                        <button 
                                                            onClick={() => navigate(`/dashboard/dcs/${dc.id}`)}
                                                            className="w-full px-4 py-3 text-left text-[14px] text-gray-700 font-medium hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            Quick View
                                                        </button>
                                                        {isSender && (
                                                            <button 
                                                                onClick={() => handleDownload(dc)}
                                                                className="w-full px-4 py-3 text-left text-[14px] text-gray-700 font-medium hover:bg-teal-50 hover:text-[#008069] flex items-center gap-3 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                                                Share / Print
                                                            </button>
                                                        )}
                                                        {isSender && dc.status !== 'BILLED' && canEdit && (
                                                            <button 
                                                                onClick={() => { setEditDC(dc); setShowForm(true); }}
                                                                className="w-full px-4 py-3 text-left text-[14px] text-[#008069] font-medium hover:bg-green-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                Edit Details
                                                            </button>
                                                        )}
                                                        {isSender && dc.status !== 'BILLED' && canDelete && (
                                                            <button 
                                                                onClick={() => handleDelete(dc.id)}
                                                                className="w-full px-4 py-3 text-left text-[14px] text-red-500 font-medium hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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

            {sharingDoc && company && (
                <DocumentShareModal 
                    currentUser={currentUser}
                    company={company}
                    docType="DC"
                    docData={sharingDoc.data}
                    pdfBase64={sharingDoc.pdf}
                    onClose={() => setSharingDoc(null)}
                />
            )}
        </div>
    );

    const DCDrawer = () => {
        const id = location.pathname.split('/').pop();
        const dc = dcs.find(d => d.id === id);
        return (
            <>
                {DCListContent}
                {dc && (
                    <ChallanDetailView
                        data={dc}
                        type="DC"
                        onClose={() => navigate('/dashboard/dcs')}
                    />
                )}
            </>
        );
    };

    return (
        <Routes>
            <Route path="/" element={DCListContent} />
            <Route path="/:id" element={<DCDrawer />} />
        </Routes>
    );
};
