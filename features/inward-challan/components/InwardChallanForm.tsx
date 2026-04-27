/**
 * InwardChallanForm.tsx
 * Feature: Inward Challan (Phase 3)
 *
 * Slide-up modal for recording an Inward Challan (goods received).
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../supabaseAPI';
import { User, DCItem, Company, Order, Contact, DeliveryChallan, InwardChallan } from '../../../types';
import { ItemsTable } from '../../delivery-challan/components/ItemsTable';

interface InwardChallanFormProps {
    currentUser: User;
    channelId?:   string;   // optional — link to a chat
    linkedDCId?:  string;   // optional — if responding to a specific outward DC
    initialData?: InwardChallan; // optional — if editing existing IC
    onCreated:    (icId: string, icNumber: string) => void;
    onClose:      () => void;
}

const BLANK_ITEMS: DCItem[] = [{ description: '', quantity: 0, unit: 'KG' }];

export const InwardChallanForm: React.FC<InwardChallanFormProps> = ({ 
    currentUser, 
    channelId, 
    linkedDCId,
    initialData,
    onCreated, 
    onClose 
}) => {
    // ── Form state ─────────────────────────────────────────────────────────────
    const [senderSearch, setSenderSearch]       = useState('');
    const [selectedSender, setSelectedSender]   = useState<{ id: string, companyId?: string, type: 'partner' | 'contact', name: string } | null>(
        initialData ? {
            id: initialData.sender_company_id || initialData.sender_contact_id || '',
            companyId: initialData.sender_company_id,
            type: initialData.sender_company_id ? 'partner' : 'contact',
            name: (initialData as any).sender_company?.name || (initialData as any).sender_contact?.name || 'Selected'
        } : null
    );
    const [showSenderList, setShowSenderList]   = useState(false);
    const [orderId, setOrderId]                 = useState(initialData?.order_number || '');
    const [refOrderNumber, setRefOrderNumber]   = useState(initialData?.ref_order_number || '');
    const [docDate, setDocDate]                 = useState(initialData?.created_at ? new Date(initialData.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [items, setItems]                     = useState<DCItem[]>(initialData?.items_received || BLANK_ITEMS);
    const [discrepancies, setDiscrepancies]     = useState(initialData?.discrepancies || '');
    const [notes, setNotes]                     = useState(initialData?.notes || '');
    const [saving, setSaving]                   = useState(false);

    // ── Data queries ───────────────────────────────────────────────────────────
    const { data: partners = [] } = useQuery<Company[]>({
        queryKey: ['partners', currentUser.company_id],
        queryFn:  () => api.getPartners(currentUser),
    });

    const { data: contacts = [] } = useQuery<Contact[]>({
        queryKey: ['contacts', currentUser.company_id],
        queryFn:  () => api.getContacts(currentUser),
    });

    // --- Derived Data ---
    const { data: orders = [] } = useQuery<Order[]>({
        queryKey: ['orders', currentUser.id],
        queryFn:  () => api.getOrders(currentUser),
    });

    // --- Auto-populate if linked to a DC ---
    React.useEffect(() => {
        if (linkedDCId && !initialData) {
            api.getDCById(linkedDCId).then(dc => {
                if (dc) {
                    setOrderId(dc.order_number || '');
                    setRefOrderNumber(dc.dc_number);
                    setItems([...dc.items]);
                    
                    // Prioritize contact if it exists, otherwise use company
                    if (dc.receiver_contact) {
                         // Wait, this is coming TO us. So the SENDER of the DC is the SENDER of our IC.
                         // But if we are the receiver of the DC, we already have our details.
                         // We need the details of dc.sender_company
                    }

                    setSelectedSender({
                        id: dc.sender_company_id, // we don't have a contact ID for the sender often in DCs, so use company
                        companyId: dc.sender_company_id,
                        type: 'partner',
                        name: dc.sender_company?.name || 'Sender'
                    });
                }
            });
        }
    }, [linkedDCId, initialData]);

    const allPossibleSenders = [
        ...partners.map(p => ({ id: p.id, companyId: p.id, type: 'partner' as const, name: p.name, tag: 'Partner' })),
        ...contacts.map(c => ({ id: c.id, companyId: c.linked_company_id, type: 'contact' as const, name: c.name, tag: 'Manual Contact' }))
    ].filter(s => s.name.toLowerCase().includes(senderSearch.toLowerCase()));

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const validItems = items.filter(it => it.description.trim() && it.quantity > 0);
        if (!validItems.length) { alert('Add at least one item with description and quantity'); return; }
        if (!selectedSender) { alert('Please select the sender from the list'); return; }

        setSaving(true);
        try {
            const icData = {
                channel_id:        channelId,
                linked_dc_id:      linkedDCId,
                sender_company_id: selectedSender.companyId || (selectedSender.type === 'partner' ? selectedSender.id : undefined),
                sender_contact_id: selectedSender.type === 'contact' ? selectedSender.id : undefined,
                order_number:      orderId || undefined,
                ref_order_number:  refOrderNumber || undefined,
                items_received:    validItems,
                discrepancies:     discrepancies || undefined,
                notes:             notes || undefined,
                created_at:        docDate ? new Date(docDate).toISOString() : undefined,
            };

            const ic = initialData 
                ? await api.updateInwardChallan(currentUser, initialData.id, icData)
                : await api.createInwardChallan(currentUser, icData);

            onCreated(ic.id, ic.ic_number);
        } catch (err: any) {
            alert(err.message || `Failed to ${initialData ? 'update' : 'create'} Inward Challan`);
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all';
    const labelCls = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block';

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>

                {/* Header: Fixed */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-none">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">{initialData ? 'Edit' : 'Record'} Inward Challan</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{initialData ? 'Update acknowledgement' : 'Goods received acknowledgement'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body: Scrollable */}
                <div className="overflow-y-auto flex-1 px-6 pt-5 pb-10 space-y-6">
                    
                    {/* Date Picker */}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <div>
                            <label className={labelCls}>Receipt Date</label>
                            <p className="text-xs text-gray-400">When were these goods received?</p>
                        </div>
                        <input 
                            type="date" 
                            value={docDate} 
                            onChange={e => setDocDate(e.target.value)}
                            className="bg-white px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#008069]"
                        />
                    </div>


                    {/* Sender Search + Dropdown */}
                    <div className="relative">
                        <label className={labelCls}>Sender Company / Contact</label>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search by name..."
                                value={selectedSender ? selectedSender.name : senderSearch}
                                onChange={e => {
                                    setSenderSearch(e.target.value);
                                    if (selectedSender) setSelectedSender(null);
                                    setShowSenderList(true);
                                }}
                                onFocus={() => setShowSenderList(true)}
                                className={inputCls + (selectedSender ? ' border-[#008069] bg-[#f0f9f7] font-bold' : '')}
                            />
                            {selectedSender && (
                                <button 
                                    onClick={() => { setSelectedSender(null); setSenderSearch(''); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500"
                                >✕</button>
                            )}
                        </div>

                        {showSenderList && !selectedSender && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                {allPossibleSenders.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-sm italic">No matching companies found...</div>
                                ) : (
                                    allPossibleSenders.map(s => (
                                        <button 
                                            key={`${s.type}-${s.id}`}
                                            onClick={() => {
                                                setSelectedSender(s);
                                                setShowSenderList(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                                        >
                                            <span className="text-sm font-bold text-gray-900">{s.name}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${s.type === 'partner' ? 'bg-[#e7f3f1] text-[#008069]' : 'bg-gray-100 text-gray-500'}`}>
                                                {s.tag}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Refs */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Your Order No.</label>
                            <select 
                                value={orderId} 
                                onChange={e => setOrderId(e.target.value)}
                                className={inputCls}
                            >
                                <option value="">Select order...</option>
                                {orders.map(o => (
                                    <option key={o.id} value={o.id}>
                                        {o.order_number} ({o.style_number})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Sender's Ref No.</label>
                            <input value={refOrderNumber} onChange={e => setRefOrderNumber(e.target.value)}
                                placeholder="e.g. DC-123" className={inputCls} />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <label className={labelCls}>Items Received</label>
                        <ItemsTable items={items} onChange={setItems} />
                    </div>

                    {/* Discrepancies */}
                    <div>
                        <label className={labelCls}>Discrepancies / Issues</label>
                        <textarea
                            value={discrepancies}
                            onChange={e => setDiscrepancies(e.target.value)}
                            rows={2}
                            placeholder="Describe any shortages, damage, or wrong items arrive…"
                            className={inputCls + ' resize-none'}
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelCls}>Notes (optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="Any additional internal notes…"
                            rows={2}
                            className={inputCls + ' resize-none'} />
                    </div>
                </div>

                {/* Footer: Fixed */}
                <div className="px-6 pt-4 border-t border-gray-100 flex gap-3 bg-gray-50/50 flex-none safe-pb-deep">
                    <button onClick={onClose} className="flex-1 py-3 border-2 border-gray-200 text-gray-500 rounded-2xl font-black text-sm hover:border-gray-300 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="flex-[2] py-3 bg-[#008069] text-white rounded-2xl font-black text-sm shadow-md hover:bg-[#006a57] disabled:opacity-40 transition-all">
                        {saving ? (initialData ? 'Updating...' : 'Saving...') : (initialData ? '💾 Save Changes' : '📥 Record Receipts')}
                    </button>
                </div>
            </div>
        </div>
    );
};
