
/**
 * QuickSalesInvoiceForm.tsx
 * Feature: Sales Invoices (Invoicing)
 * 
 * Professional slide-up form for quick creation of a new Sales Invoice.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Company, Contact, GSTType, GSTRate, Order, Invoice, DeliveryChallan } from '../../../types';
import { api } from '../../../supabaseAPI';

interface QuickSalesInvoiceFormProps {
    currentUser: User;
    initialData?: Invoice;
    onClose:     () => void;
}

export const QuickSalesInvoiceForm: React.FC<QuickSalesInvoiceFormProps> = ({ currentUser, initialData, onClose }) => {
    const qc = useQueryClient();
    
    // --- State ---
    const [buyerSearch, setBuyerSearch]       = useState('');
    const [selectedBuyer, setSelectedBuyer]   = useState<{ id: string, companyId?: string, type: 'partner' | 'contact', name: string } | null>(
        initialData ? {
            id: initialData.buyer_company_id || initialData.buyer_contact_id || '',
            companyId: initialData.buyer_company_id,
            type: initialData.buyer_company_id ? 'partner' : 'contact',
            name: (initialData as any).buyer_company?.name || (initialData as any).buyer_contact?.name || 'Selected'
        } : null
    );
    const [showBuyerList, setShowBuyerList]   = useState(false);
    const [invoiceNoOverride, setInvNo]       = useState(initialData?.invoice_number || '');
    const [docDate, setDocDate]               = useState(initialData?.created_at ? new Date(initialData.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [items, setItems]               = useState<any[]>(initialData?.items || [{ description: '', hsn_code: '', quantity: '', rate: '', unit: 'PCS' }]);
    const [gstType, setGstType]           = useState<GSTType>(initialData?.gst_type || 'CGST_SGST');
    const [gstRate, setGstRate]           = useState<GSTRate>(initialData?.gst_rate || 18);
    const [orderId, setOrderId]           = useState(initialData?.order_id || '');
    const [selectedDCIds, setSelectedDCIds] = useState<string[]>([]);
    const [saving, setSaving]             = useState(false);

    // --- Data Fetching ---
    const { data: partners = [] } = useQuery<Company[]>({
        queryKey: ['partners', currentUser.company_id],
        queryFn:  () => api.getPartners(currentUser),
    });

    const { data: contacts = [] } = useQuery<Contact[]>({
        queryKey: ['contacts', currentUser.company_id],
        queryFn:  () => api.getContacts(currentUser),
    });

    const { data: orders = [] } = useQuery<Order[]>({
        queryKey: ['orders', currentUser.id],
        queryFn:  () => api.getOrders(currentUser),
    });

    const { data: dcs = [] } = useQuery<DeliveryChallan[]>({
        queryKey: ['dcs', currentUser.company_id],
        queryFn:  () => api.getDCsForCompany(currentUser),
    });

    // --- Calculations ---
    // --- Derived Data ---
    const orderDCs = useMemo(() => {
        if (!orderId) return [];
        return dcs.filter((dc) => dc.order_number === orderId && dc.status !== 'BILLED');
    }, [orderId, dcs]);

    const handleDCToggle = (dcId: string) => {
        let nextDCIds = [...selectedDCIds];
        if (nextDCIds.includes(dcId)) {
            nextDCIds = nextDCIds.filter(id => id !== dcId);
        } else {
            nextDCIds.push(dcId);
        }
        setSelectedDCIds(nextDCIds);
        
        const selectedDCs = orderDCs.filter(d => nextDCIds.includes(d.id));
        if (selectedDCs.length > 0) {
            const compiledItems = selectedDCs.flatMap(dc => dc.items.map(it => ({
                description: it.description,
                hsn_code: '', // Allow manual entry
                quantity: it.quantity.toString(),
                rate: '', // Allow manual entry
                unit: it.unit
            })));
            setItems(compiledItems);
        } else {
            setItems([{ description: '', hsn_code: '', quantity: '', rate: '', unit: 'PCS' }]);
        }
    };
    const allPossibleBuyers = [
        ...partners.map(p => ({ id: p.id, companyId: p.id, type: 'partner' as const, name: p.name, tag: 'Partner' })),
        ...contacts.map(c => ({ id: c.id, companyId: c.linked_company_id, type: 'contact' as const, name: c.name, tag: 'Manual Contact' }))
    ].filter(s => s.name.toLowerCase().includes(buyerSearch.toLowerCase()));

    const subtotal = useMemo(() => {
        return items.reduce((sum, it) => {
            const q = parseFloat(it.quantity) || 0;
            const r = parseFloat(it.rate) || 0;
            return sum + (q * r);
        }, 0);
    }, [items]);

    const taxAmount = useMemo(() => {
        if (gstType === 'NONE') return 0;
        return parseFloat(((subtotal * gstRate) / 100).toFixed(2));
    }, [subtotal, gstRate, gstType]);

    const total = useMemo(() => {
        return parseFloat((subtotal + taxAmount).toFixed(2));
    }, [subtotal, taxAmount]);

    // --- Item Handlers ---
    const addItem = () => setItems([...items, { description: '', hsn_code: '', quantity: '', rate: '', unit: 'PCS' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const duplicateItem = (index: number) => {
        const item = items[index];
        const next = [...items];
        next.splice(index + 1, 0, { ...item });
        setItems(next);
    };
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    // --- Submit ---
    const handleCreate = async () => {
        if (!selectedBuyer) return alert('Please select a buyer from the list');
        const validItems = items.filter(it => it.description && it.quantity && it.rate);
        if (validItems.length === 0) return alert('Add at least one complete line item');
        
        setSaving(true);
        try {
            const invoiceData = {
                seller_company_id: currentUser.company_id,
                invoice_number:    invoiceNoOverride.trim() || undefined,
                buyer_company_id:  selectedBuyer.companyId || (selectedBuyer.type === 'partner' ? selectedBuyer.id : undefined),
                buyer_contact_id:  selectedBuyer.type === 'contact' ? selectedBuyer.id : undefined,
                order_id:          orderId || undefined,
                linked_dc_ids:     selectedDCIds.length > 0 ? selectedDCIds : undefined,
                items: validItems.map(it => ({
                    description: it.description,
                    hsn_code:    it.hsn_code || undefined,
                    quantity:    parseFloat(it.quantity),
                    unit:        it.unit,
                    rate:        parseFloat(it.rate),
                    amount:      parseFloat((parseFloat(it.quantity) * parseFloat(it.rate)).toFixed(2))
                })),
                gst_type: gstType,
                gst_rate: gstRate,
                created_at: docDate ? new Date(docDate).toISOString() : undefined,
            };

            if (initialData) {
                await api.updateSalesInvoice(currentUser, initialData.id, invoiceData);
            } else {
                await api.createSalesInvoice(currentUser, invoiceData);
            }

            qc.invalidateQueries({ queryKey: ['sales_invoices'] });
            alert(`Sales Invoice ${initialData ? 'updated' : 'created'} successfully!`);
            onClose();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all';
    const labelCls = 'block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider';

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[4px]" onClick={onClose}>
            <div className="modal-container w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85dvh]" onClick={e => e.stopPropagation()}>
                
                {/* Header: Fixed */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-none">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">{initialData ? 'Edit' : 'Create'} Sales Invoice</h3>
                        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-widest mt-0.5">{initialData ? 'Update Document' : 'Tax Document'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
                </div>

                {/* Body: Scrollable */}
                <div className="px-6 pt-6 pb-12 overflow-y-auto flex-1 space-y-5">
                    
                    {/* Buyer Search + Dropdown */}
                    <div className="relative">
                        <label className={labelCls}>Bill to (Recipient)</label>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search by name..."
                                value={selectedBuyer ? selectedBuyer.name : buyerSearch}
                                onChange={e => {
                                    setBuyerSearch(e.target.value);
                                    if (selectedBuyer) setSelectedBuyer(null);
                                    setShowBuyerList(true);
                                }}
                                onFocus={() => setShowBuyerList(true)}
                                className={inputCls + (selectedBuyer ? ' border-[#008069] bg-[#f0f9f7] font-bold' : '')}
                            />
                            {selectedBuyer && (
                                <button 
                                    onClick={() => { setSelectedBuyer(null); setBuyerSearch(''); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500"
                                >✕</button>
                            )}
                        </div>

                        {showBuyerList && !selectedBuyer && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                {allPossibleBuyers.length === 0 ? (
                                    <div className="p-4 text-center text-gray-400 text-sm italic">No matching buyers found...</div>
                                ) : (
                                    allPossibleBuyers.map(s => (
                                        <button 
                                            key={`${s.type}-${s.id}`}
                                            onClick={() => {
                                                setSelectedBuyer(s);
                                                setShowBuyerList(false);
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4 items-start">
                        <div className="w-full">
                            <label className={labelCls}>Invoice Date</label>
                            <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className={inputCls} />
                        </div>
                        <div className="w-full">
                            <label className={labelCls}>Link Order (Optional)</label>
                            <select value={orderId} onChange={e => { setOrderId(e.target.value); setSelectedDCIds([]); }} className={inputCls}>
                                <option value="">Select Order...</option>
                                {orders.map(o => (
                                    <option key={o.id} value={o.id}>{o.order_number} ({o.style_number})</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-full">
                            <label className={labelCls}>Invoice No. (Optional)</label>
                            <input value={invoiceNoOverride} onChange={e => setInvNo(e.target.value)} placeholder="Auto" className={inputCls} />
                        </div>
                    </div>

                    {orderId && orderDCs.length > 0 && (
                        <div className="bg-[#f0f9f7] p-4 rounded-xl border border-[#008069]/20 flex flex-wrap gap-2 items-center animate-in fade-in slide-in-from-top-2">
                            <span className="text-[11px] font-bold text-gray-500 uppercase mr-2 tracking-wider">Unbilled DCs:</span>
                            {orderDCs.map(dc => {
                                const isSelected = selectedDCIds.includes(dc.id);
                                return (
                                    <button 
                                        key={dc.id}
                                        type="button"
                                        onClick={() => handleDCToggle(dc.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? 'bg-[#008069] text-white border-[#008069] shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 shadow-sm'}`}
                                    >
                                        {isSelected ? '✓ ' : '+ '}{dc.dc_number}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    
                    {orderId && orderDCs.length === 0 && (
                        <div className="text-[11px] text-orange-500 font-medium italic !mt-2 px-2">No unbilled Delivery Challans found for this order.</div>
                    )}

                    {/* Multi-Item Details */}
                    <div className="bg-gray-50 p-3 md:p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Item Details</h4>
                        </div>
                        
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 relative group animate-in slide-in-from-right-2 duration-200">
                                    <div className="absolute -top-3 -right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                        <button 
                                            onClick={() => duplicateItem(idx)} 
                                            className="w-6 h-6 bg-blue-50 text-blue-600 rounded-full border border-blue-100 flex items-center justify-center shadow-sm hover:bg-blue-100"
                                            title="Duplicate Row"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                            </svg>
                                        </button>
                                        {items.length > 1 && (
                                            <button 
                                                onClick={() => removeItem(idx)} 
                                                className="w-6 h-6 bg-red-50 text-red-500 rounded-full border border-red-100 flex items-center justify-center shadow-sm hover:bg-red-100"
                                                title="Remove Row"
                                            >✕</button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-12 gap-2 md:gap-3">
                                        <div className="col-span-12 md:col-span-5">
                                            <label className="block text-[11px] md:text-[13px] font-medium text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider">Description</label>
                                            <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all" />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <label className="block text-[11px] md:text-[13px] font-medium text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider">HSN/SAC</label>
                                            <input value={item.hsn_code} onChange={e => updateItem(idx, 'hsn_code', e.target.value)} placeholder="Code" className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all" />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <label className="block text-[11px] md:text-[13px] font-medium text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider">Qty</label>
                                            <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all" />
                                        </div>
                                        <div className="col-span-4 md:col-span-3">
                                            <label className="block text-[11px] md:text-[13px] font-medium text-gray-500 mb-0.5 md:mb-1 uppercase tracking-wider">Rate (₹)</label>
                                            <input type="number" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} placeholder="0.00" className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all" />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add row */}
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-2 text-sm font-bold text-[#008069] hover:text-[#006a57] transition-colors mt-1 px-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Item
                            </button>
                        </div>
                    </div>

                    {/* Tax & Totals */}
                    <div className={`grid ${gstType === 'NONE' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                        <div>
                            <label className={labelCls}>GST Type</label>
                            <select value={gstType} onChange={e => setGstType(e.target.value as GSTType)} className={inputCls}>
                                <option value="CGST_SGST">CGST + SGST (Local)</option>
                                <option value="IGST">IGST (Inter-state)</option>
                                <option value="NONE">No GST</option>
                            </select>
                        </div>
                        {gstType !== 'NONE' && (
                            <div>
                                <label className={labelCls}>GST Rate (%)</label>
                                <select value={gstRate} onChange={e => setGstRate(Number(e.target.value) as GSTRate)} className={inputCls}>
                                    <option value={3}>3%</option>
                                    <option value={5}>5%</option>
                                    <option value={12}>12%</option>
                                    <option value={18}>18%</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Summary Card */}
                    <div className="bg-[#008069]/5 rounded-2xl p-5 border border-[#008069]/10">
                        <div className={`flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider ${gstType === 'NONE' ? '' : 'mb-4 border-b border-[#008069]/10 pb-2'}`}>
                            <span>Subtotal</span>
                            <span className="text-gray-900 font-bold">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {gstType !== 'NONE' && (
                            <div className="flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b border-[#008069]/10 pb-2">
                                <span>GST ({gstRate}%)</span>
                                <span className="text-gray-900 font-bold">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-sm font-bold text-gray-900">Grand Total</span>
                            <span className="text-2xl font-extrabold text-[#008069] tracking-tighter">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions: Fixed */}
                <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50 flex-none safe-pb-deep">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-semibold rounded-2xl hover:bg-gray-100 transition-all">Cancel</button>
                    <button
                        onClick={handleCreate}
                        disabled={!selectedBuyer || items.some(it => !it.description || !it.quantity || !it.rate) || saving}
                        className="flex-[2] py-3 bg-[#008069] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:bg-[#006a57] disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <><svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> {initialData ? 'Saving...' : 'Generating...'}</>
                        ) : (initialData ? '💾 Save Changes' : 'Create Invoice')}
                    </button>
                </div>
            </div>
        </div>
    );
};
