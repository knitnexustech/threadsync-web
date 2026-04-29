
/**
 * QuickPurchaseInvoiceForm.tsx
 * Feature: Formal Vendor Bills (Accounts Payable)
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Company, Contact, GSTType, GSTRate, Order, Invoice } from '../../../types';
import { api } from '../../../supabaseAPI';

interface QuickPurchaseInvoiceFormProps {
    currentUser: User;
    initialData?: Invoice;
    onClose:     () => void;
}

export const QuickPurchaseInvoiceForm: React.FC<QuickPurchaseInvoiceFormProps> = ({ currentUser, initialData, onClose }) => {
    const qc = useQueryClient();
    
    const [sellerSearch, setSellerSearch]       = useState('');
    const [selectedSeller, setSelectedSeller]   = useState<{ id: string, companyId?: string, type: 'partner' | 'contact', name: string } | null>(
        initialData ? {
            id: initialData.seller_company_id || (initialData as any).seller_contact_id || 'manual',
            companyId: initialData.seller_company_id,
            type: initialData.seller_company_id ? 'partner' : 'contact',
            name: initialData.seller_name || (initialData as any).seller_company?.name || (initialData as any).seller_contact?.name || 'Selected'
        } : null
    );
    const [showSellerList, setShowSellerList]   = useState(false);
    const [vendorInvoiceNo, setInvNo]           = useState(initialData?.invoice_number || '');
    const [docDate, setDocDate]                 = useState(initialData?.created_at ? new Date(initialData.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [items, setItems]               = useState<any[]>(initialData?.items || [{ description: '', hsn_code: '', quantity: '1', rate: '', unit: 'PCS' }]);
    const [gstType, setGstType]           = useState<GSTType>(initialData?.gst_type || 'CGST_SGST');
    const [gstRate, setGstRate]           = useState<GSTRate>(initialData?.gst_rate || 18);
    const [dueDate, setDueDate]           = useState(initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '');
    const [orderId, setOrderId]           = useState(initialData?.order_id || '');
    const [saving, setSaving]             = useState(false);

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

    const allPossibleSellers = [
        ...partners.map(p => ({ id: p.id, companyId: p.id, type: 'partner' as const, name: p.name, tag: 'Partner' })),
        ...contacts.map(c => ({ id: c.id, companyId: c.linked_company_id, type: 'contact' as const, name: c.name, tag: 'Manual Contact' }))
    ].filter(s => s.name.toLowerCase().includes(sellerSearch.toLowerCase()));

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

    const addItem = () => setItems([...items, { description: '', hsn_code: '', quantity: '1', rate: '', unit: 'PCS' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleCreate = async () => {
        const finalSellerName = selectedSeller ? selectedSeller.name : sellerSearch.trim();
        if (!finalSellerName) return alert('Please enter or select a vendor');
        if (!vendorInvoiceNo.trim()) return alert('Please enter the vendor\'s invoice number');
        
        const validItems = items.filter(it => it.description && it.rate);
        if (validItems.length === 0) return alert('Add at least one complete line item');
        
        setSaving(true);
        try {
            const billData = {
                seller_company_id: selectedSeller?.companyId || (selectedSeller?.type === 'partner' ? selectedSeller.id : undefined),
                seller_name:       finalSellerName,
                invoice_number:    vendorInvoiceNo.trim(),
                items: validItems.map(it => ({
                    description: it.description,
                    hsn_code:    it.hsn_code || undefined,
                    quantity:    parseFloat(it.quantity) || 1,
                    unit:        it.unit || 'PCS',
                    rate:        parseFloat(it.rate),
                    amount:      parseFloat(((parseFloat(it.quantity) || 1) * parseFloat(it.rate)).toFixed(2))
                })),
                gst_type: gstType,
                gst_rate: gstRate,
                due_date:          dueDate || undefined,
                order_id:          orderId || undefined,
                created_at:        docDate ? new Date(docDate).toISOString() : undefined,
            };

            if (initialData) {
                await api.updatePurchaseInvoice(currentUser, initialData.id, billData);
            } else {
                await api.createPurchaseInvoice(currentUser, billData);
            }
            qc.invalidateQueries({ queryKey: ['purchase_invoices'] });
            alert(`Vendor Bill ${initialData ? 'updated' : 'recorded'} successfully!`);
            onClose();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-600 transition-all';
    const labelCls = 'block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider';

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-[4px]" onClick={onClose}>
            <div className="modal-container w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[85dvh]" onClick={e => e.stopPropagation()}>
                
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white flex-none">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Add Vendor Bill</h3>
                        <p className="text-[11px] text-orange-600 font-bold uppercase tracking-widest mt-0.5">Formal Purchase Invoice</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
                </div>

                <div className="px-6 pt-6 pb-12 overflow-y-auto flex-1 space-y-5">
                    <div className="relative">
                        <label className={labelCls}>Select Vendor</label>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search Kramiz Partners or Contacts..."
                                value={selectedSeller ? selectedSeller.name : sellerSearch}
                                onChange={e => {
                                    setSellerSearch(e.target.value);
                                    if (selectedSeller) setSelectedSeller(null);
                                    setShowSellerList(true);
                                }}
                                onFocus={() => setShowSellerList(true)}
                                className={inputCls + (selectedSeller ? ' border-orange-600 bg-orange-50/30 font-bold' : '')}
                            />
                        </div>

                        {showSellerList && !selectedSeller && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                                {allPossibleSellers.map(s => (
                                    <button 
                                        key={`${s.type}-${s.id}`}
                                        onClick={() => { setSelectedSeller(s); setShowSellerList(false); }}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                                    >
                                        <span className="text-sm font-bold text-gray-900">{s.name}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${s.type === 'partner' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.tag}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className={labelCls}>Invoice Date</label>
                            <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Vendor Bill No.</label>
                            <input value={vendorInvoiceNo} onChange={e => setInvNo(e.target.value)} placeholder="Required" className={inputCls + " font-bold"} />
                        </div>
                        <div>
                            <label className={labelCls}>Link Order</label>
                            <select value={orderId} onChange={e => setOrderId(e.target.value)} className={inputCls}>
                                <option value="">Select...</option>
                                {orders.map(o => <option key={o.id} value={o.id}>{o.order_number}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Due Date</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Line Items</h4>
                        {items.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 grid grid-cols-12 gap-2 relative group">
                                <div className="col-span-12 md:col-span-6">
                                    <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item Description" className="w-full text-xs p-2 bg-transparent focus:outline-none" />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="Qty" className="w-full text-xs p-2 bg-transparent focus:outline-none border-l" />
                                </div>
                                <div className="col-span-5 md:col-span-3">
                                    <input type="number" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} placeholder="Rate" className="w-full text-xs p-2 bg-transparent focus:outline-none border-l font-bold" />
                                </div>
                                <button onClick={() => removeItem(idx)} className="col-span-1 text-red-300 hover:text-red-500">✕</button>
                            </div>
                        ))}
                        <button onClick={addItem} className="text-xs font-bold text-orange-600 hover:underline px-1">+ Add Row</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>GST Type</label>
                            <select value={gstType} onChange={e => setGstType(e.target.value as GSTType)} className={inputCls}>
                                <option value="CGST_SGST">CGST + SGST</option>
                                <option value="IGST">IGST</option>
                                <option value="NONE">No GST</option>
                            </select>
                        </div>
                        {gstType !== 'NONE' && (
                            <div>
                                <label className={labelCls}>GST Rate (%)</label>
                                <select value={gstRate} onChange={e => setGstRate(Number(e.target.value) as GSTRate)} className={inputCls}>
                                    {[3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-5 text-white flex justify-between items-center">
                        <span className="text-sm font-bold opacity-60 uppercase tracking-widest">Total Bill Value</span>
                        <span className="text-2xl font-black">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50/50 flex-none safe-pb-deep">
                    <button onClick={onClose} className="flex-1 py-4 text-gray-500 font-bold rounded-2xl hover:bg-gray-100">Cancel</button>
                    <button
                        onClick={handleCreate}
                        disabled={saving || !vendorInvoiceNo || !items[0].description}
                        className="flex-[2] py-4 bg-orange-600 text-white font-bold rounded-2xl shadow-lg hover:bg-orange-700 disabled:opacity-50 transition-all"
                    >
                        {saving ? 'Saving...' : 'Record Vendor Bill'}
                    </button>
                </div>
            </div>
        </div>
    );
};
