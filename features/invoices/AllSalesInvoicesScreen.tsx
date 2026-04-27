/**
 * AllSalesInvoicesScreen.tsx
 * Feature: Sales Invoices
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Invoice, hasPermission, Company } from '../../types';
import { api } from '../../supabaseAPI';
import { resolveTo } from '../../services/partnerUtils';
import { SubScreenHeader, EmptyState, fmtDate, fmtAmount } from '../orders/shared';
import { QuickSalesInvoiceForm } from './components/QuickSalesInvoiceForm';
import { generateDocumentPDF } from '../../services/documentEngine';
import { useQuery as useCompanyQuery } from '@tanstack/react-query';
import { DocumentShareModal } from '../../components/DocumentShareModal';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

interface AllSalesInvoicesScreenProps {
    currentUser: User;
}

export const AllSalesInvoicesScreen: React.FC<AllSalesInvoicesScreenProps> = ({ currentUser }) => {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [editInv, setEditInv] = useState<Invoice | null>(null);
    const [sharingDoc, setSharingDoc] = useState<{ data: Invoice, pdf: string } | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const canEdit   = hasPermission(currentUser.role, 'EDIT_SALES_INVOICE');
    const canDelete = hasPermission(currentUser.role, 'DELETE_SALES_INVOICE');

    // Queries
    const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
        queryKey: ['sales_invoices', currentUser.company_id],
        queryFn: () => api.getSalesInvoices(currentUser),
    });

    const { data: company } = useCompanyQuery<Company>({
        queryKey: ['company', currentUser.company_id],
        queryFn: () => api.getCompany(currentUser.company_id),
    });

    const handleDownload = async (inv: Invoice) => {
        if (!company) return;
        try {
            const pdfBase64 = await generateDocumentPDF('SALES_INVOICE', inv, company, true);
            setSharingDoc({ data: inv, pdf: pdfBase64 });
        } catch (err: any) { alert(err.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`Are you sure you want to delete this Sales Invoice?`)) return;
        try {
            await api.deleteSalesInvoice(currentUser, id);
            qc.invalidateQueries({ queryKey: ['sales_invoices', currentUser.company_id] });
        } catch (err: any) { alert(err.message); }
    };

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] animate-in slide-in-from-right-4 duration-300" onClick={() => setActiveMenu(null)}>
            <SubScreenHeader 
                title="Sales Invoices" 
                onBack={() => navigate('/dashboard')} 
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                <div className="max-w-4xl mx-auto space-y-3 w-full">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
                        </div>
                    ) : invoices.length === 0 ? (
                        <EmptyState icon="🧾" title="No Sales Invoices" subtitle="You haven't issued any invoices yet." />
                    ) : (
                        invoices.map(inv => {
                            const itemsStr = inv.items.slice(0, 3).map(i => `${i.quantity} ${i.unit} ${i.description}`).join(' • ');
                            const hasMoreItems = inv.items.length > 3;

                            return (
                                <div key={inv.id} className="group bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all relative flex flex-col cursor-pointer" onClick={() => setEditInv(inv)}>
                                    <div className="grid grid-cols-[1fr,auto] gap-3 items-start">
                                        {/* Left Side: Info */}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[14px] font-bold text-gray-900 truncate">{inv.invoice_number}</p>
                                            </div>
                                            <p className="text-[12px] text-gray-500 font-medium truncate mt-0.5">
                                                <span className="text-gray-400">Buyer: </span>
                                                {resolveTo(inv)?.name || '—'}
                                            </p>
                                            <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                                                <p className="text-[11px] text-gray-400 tracking-tight truncate flex-1 leading-tight">
                                                    {itemsStr || 'No items listed'}
                                                </p>
                                                {hasMoreItems && (
                                                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">
                                                        +{inv.items.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Right Side: Price & Menu */}
                                        <div className="flex flex-col items-end shrink-0 pt-0.5 min-w-[70px]">
                                            <div className="flex items-center justify-end gap-1">
                                                <p className="text-[14px] font-black text-[#008069] whitespace-nowrap">{fmtAmount(inv.total_amount)}</p>
                                                
                                                {/* Mobile Actions Toggle */}
                                                <div className="relative md:hidden shrink-0">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === inv.id ? null : inv.id); }}
                                                        className="p-1 text-gray-400 bg-gray-50 border border-gray-100 active:bg-gray-200 rounded-lg transition-all"
                                                    >
                                                        <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                                    </button>

                                                    {activeMenu === inv.id && (
                                                        <div className="absolute right-0 top-8 w-44 bg-white rounded-xl border border-gray-100 shadow-2xl z-[100] overflow-hidden divide-y divide-gray-50 flex flex-col ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in duration-150 origin-top-right">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDownload(inv); setActiveMenu(null); }}
                                                                className="w-full px-4 py-3 text-left text-[14px] text-gray-700 font-medium active:bg-blue-50 flex items-center gap-3 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                                Download PDF
                                                            </button>
                                                            {canEdit && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setEditInv(inv); setActiveMenu(null); }}
                                                                    className="w-full px-4 py-3 text-left text-[14px] text-[#008069] font-medium active:bg-green-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                    Edit Details
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); setActiveMenu(null); }}
                                                                    className="w-full px-4 py-3 text-left text-[14px] text-red-500 font-medium active:bg-red-50 flex items-center gap-3 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                    Delete Bill
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1 text-right">{fmtDate(inv.created_at || '')}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Desktop Action Buttons (Hover) */}
                                    <div className="absolute top-2 right-2 hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border border-gray-100 rounded-lg p-0.5">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDownload(inv); }}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all"
                                            title="Download PDF"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </button>
                                        {canEdit && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setEditInv(inv); }}
                                                className="p-1.5 text-gray-400 hover:text-[#008069] hover:bg-green-50 rounded transition-all"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {editInv && (
                <QuickSalesInvoiceForm 
                    currentUser={currentUser} 
                    initialData={editInv} 
                    onClose={() => setEditInv(null)} 
                />
            )}

            {sharingDoc && company && (
                <DocumentShareModal 
                    currentUser={currentUser}
                    company={company}
                    docType="SALES_INVOICE"
                    docData={sharingDoc.data}
                    pdfBase64={sharingDoc.pdf}
                    onClose={() => setSharingDoc(null)}
                />
            )}
        </div>
    );
};
