/**
 * AllInvoicesScreen.tsx
 * Feature: Invoices (Sales & Purchase)
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Invoice, GSTType, GSTRate, hasPermission, Company } from '../../types';
import { api } from '../../supabaseAPI';
import { resolveTo, resolveFrom } from '../../services/partnerUtils';
import { SubScreenHeader, EmptyState, StatusBadge, fmtDate, fmtAmount } from '../orders/shared';
import { QuickSalesInvoiceForm } from './components/QuickSalesInvoiceForm';
import { QuickPurchaseInvoiceForm } from './components/QuickPurchaseInvoiceForm';
import { generateDocumentPDF } from '../../services/documentEngine';
import { useQuery as useCompanyQuery } from '@tanstack/react-query';
import { DocumentShareModal } from '../../components/DocumentShareModal';

interface AllInvoicesScreenProps {
    currentUser: User;
    onBack:      () => void;
    type?:       'SALES' | 'PURCHASE'; // New prop to handle both types
}

export const AllInvoicesScreen: React.FC<AllInvoicesScreenProps> = ({ currentUser, onBack, type = 'SALES' }) => {
    const qc = useQueryClient();
    const [editInv, setEditInv] = useState<Invoice | null>(null);
    const [sharingDoc, setSharingDoc] = useState<{ data: Invoice, pdf: string } | null>(null);

    const isSales = type === 'SALES';

    // Queries
    const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
        queryKey: [isSales ? 'sales_invoices' : 'purchase_invoices', currentUser.company_id],
        queryFn: () => isSales ? api.getSalesInvoices(currentUser) : api.getPurchaseInvoices(currentUser),
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
        if (!confirm(`Are you sure you want to delete this ${isSales ? 'Sales' : 'Purchase'} Invoice?`)) return;
        try {
            if (isSales) await api.deleteSalesInvoice(currentUser, id);
            else await api.deletePurchaseInvoice(currentUser, id);
            qc.invalidateQueries({ queryKey: [isSales ? 'sales_invoices' : 'purchase_invoices', currentUser.company_id] });
        } catch (err: any) { alert(err.message); }
    };

    const canCreate = hasPermission(currentUser.role, 'CREATE_INVOICE');

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] animate-in slide-in-from-right-4 duration-300">
            <SubScreenHeader 
                title={isSales ? 'Sales Invoices' : 'Purchase Invoices'} 
                subtitle={isSales ? 'Revenue from billings' : 'Expenses from vendor bills'} 
                onBack={onBack} 
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
                    </div>
                ) : invoices.length === 0 ? (
                    <EmptyState icon="🧾" title={`No ${isSales ? 'Sales' : 'Purchase'} Invoices`} subtitle={isSales ? "You haven't issued any invoices yet." : "You haven't recorded any vendor bills yet."} />
                ) : (
                    invoices.map(inv => (
                        <div key={inv.id} className="group bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-[15px] font-bold text-gray-900">{inv.invoice_number}</p>
                                    <p className="text-[12px] text-gray-500 font-medium">
                                        <span className="text-gray-400">{isSales ? 'Buyer: ' : 'Seller: '}</span>
                                        {isSales 
                                            ? resolveTo(inv)?.name || '—'
                                            : resolveFrom(inv)?.name || '—'
                                        }
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <StatusBadge status={inv.status} />
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isSales && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDownload(inv); }}
                                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Download PDF"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEditInv(inv); }}
                                            className="p-1.5 text-gray-400 hover:text-[#008069] hover:bg-green-50 rounded-lg transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-end mt-4 pt-3 border-t border-gray-50">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Dated</p>
                                    <p className="text-[12px] text-gray-600 font-bold">{fmtDate(inv.created_at || '')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Amount</p>
                                    <p className="text-[16px] font-black text-[#008069]">{fmtAmount(inv.total_amount)}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {editInv && isSales && (
                <QuickSalesInvoiceForm 
                    currentUser={currentUser} 
                    initialData={editInv} 
                    onClose={() => setEditInv(null)} 
                />
            )}
            {editInv && !isSales && (
                <QuickPurchaseInvoiceForm 
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
