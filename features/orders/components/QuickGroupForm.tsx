/**
 * QuickGroupForm.tsx
 * Feature: Production Channels (Phase 2)
 *
 * A specialized form to create new production groups (e.g., Knitting, Dyeing)
 * under a specific Purchase Order. Supports both external partners and internal groups.
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Company, Contact } from '../../../types';
import { api } from '../../../supabaseAPI';

interface QuickGroupFormProps {
    orderId:     string;
    currentUser: User;
    onClose:     () => void;
}

export const QuickGroupForm: React.FC<QuickGroupFormProps> = ({ orderId, currentUser, onClose }) => {
    const qc = useQueryClient();
    const [name, setName]         = useState('');
    const [selectedPartner, setSelectedPartner] = useState<{id: string, type: 'COMPANY' | 'CONTACT' | 'INTERNAL'} | null>(null);
    const [saving, setSaving]     = useState(false);
    const [search, setSearch]     = useState('');

    // Fetch both accepted partners and manual contacts
    const { data: partnersData, isLoading } = useQuery({
        queryKey: ['partner-options', currentUser.company_id],
        queryFn: async () => {
            const [accepted, contacts] = await Promise.all([
                api.getAcceptedPartners(currentUser),
                api.getContacts(currentUser)
            ]);
            return { accepted, contacts };
        }
    });

    const handleCreate = async () => {
        if (!name.trim()) return alert('Enter a group name');
        if (!selectedPartner) return alert('Please select a partner or internal group');
        
        setSaving(true);
        try {
            // Only pass partnerId if it's a verified COMPANY (to satisfy FK constraint)
            const partnerId = selectedPartner.type === 'COMPANY' ? selectedPartner.id : undefined;
            const contactId = selectedPartner.type === 'CONTACT' ? selectedPartner.id : undefined;
            
            await api.createChannel(currentUser, orderId, name.trim(), partnerId, contactId);
            
            qc.invalidateQueries({ queryKey: ['orders'] });
            qc.invalidateQueries({ queryKey: ['channels'] });
            
            onClose();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const acceptedIds = new Set(partnersData?.accepted.map(p => p.id) || []);

    const filteredAccepted = partnersData?.accepted.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const filteredContacts = (partnersData?.contacts || []).filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        // If this contact is already an accepted partner, don't show it twice
        if (c.linked_company_id && acceptedIds.has(c.linked_company_id)) return false;

        return true;
    });

    const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all';

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
            <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white flex-none">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Create New Group</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Assign a partner or keep it internal</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
                </div>

                <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1 minimal-scrollbar">
                    {/* Group Name */}
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Process / Group Name</label>
                        <input 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="e.g. Knitting, Printing, QC" 
                            className={inputCls} 
                            autoFocus 
                        />
                    </div>

                    {/* Partner Selection */}
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Assigned Partner</label>
                        <div className="relative mb-3">
                            <input 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                                placeholder="Search partners or contacts..." 
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all"
                            />
                            <span className="absolute left-3.5 top-3 text-gray-400 text-sm">🔍</span>
                        </div>

                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 minimal-scrollbar">
                            {/* Option: INTERNAL */}
                            <button
                                onClick={() => setSelectedPartner({ id: 'internal', type: 'INTERNAL' })}
                                className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${selectedPartner?.type === 'INTERNAL' ? 'border-[#008069] bg-green-50/50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm"></div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-800">Internal Group</p>
                                        <p className="text-[10px] text-gray-400">No external partner assigned</p>
                                    </div>
                                </div>
                                {selectedPartner?.type === 'INTERNAL' && <div className="w-5 h-5 rounded-full bg-[#008069] flex items-center justify-center text-white text-[10px]">✓</div>}
                            </button>

                            {/* Option: ACCEPTED PARTNERS */}
                            {filteredAccepted.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPartner({ id: p.id, type: 'COMPANY' })}
                                    className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${selectedPartner?.id === p.id ? 'border-[#008069] bg-green-50/50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">CP</div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-800">{p.name}</p>
                                            <p className="text-[10px] text-blue-500 font-bold tracking-tight">Verified Partner</p>
                                        </div>
                                    </div>
                                    {selectedPartner?.id === p.id && <div className="w-5 h-5 rounded-full bg-[#008069] flex items-center justify-center text-white text-[10px]">✓</div>}
                                </button>
                            ))}

                            {/* Option: CONTACTS */}
                            {filteredContacts.map(c => {
                                const isSelected = c.linked_company_id 
                                    ? (selectedPartner?.id === c.linked_company_id && selectedPartner.type === 'COMPANY')
                                    : (selectedPartner?.id === c.id && selectedPartner.type === 'CONTACT');

                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            if (c.linked_company_id) {
                                                setSelectedPartner({ id: c.linked_company_id, type: 'COMPANY' });
                                            } else {
                                                setSelectedPartner({ id: c.id, type: 'CONTACT' });
                                            }
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${isSelected ? 'border-[#008069] bg-green-50/50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-black">CT</div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-gray-800">{c.name}</p>
                                                <p className={`text-[10px] font-bold tracking-tight ${c.linked_company_id ? 'text-green-600' : 'text-orange-500'}`}>
                                                    {c.linked_company_id ? '✓ Registered on Kramiz' : 'Manual Contact (Offline)'}
                                                </p>
                                            </div>
                                        </div>
                                        {isSelected && <div className="w-5 h-5 rounded-full bg-[#008069] flex items-center justify-center text-white text-[10px]">✓</div>}
                                    </button>
                                );
                            })}

                            {isLoading && (
                                <div className="py-8 text-center">
                                    <div className="w-6 h-6 border-2 border-[#008069] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-xs text-gray-400">Loading partners...</p>
                                </div>
                            )}

                            {!isLoading && filteredAccepted.length === 0 && filteredContacts.length === 0 && search && (
                                <p className="py-4 text-center text-xs text-gray-400 italic">No partners match "{search}"</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-white flex gap-3 flex-none">
                    <button onClick={onClose} className="flex-1 py-3.5 border border-gray-200 text-gray-500 rounded-[20px] text-sm font-bold hover:bg-gray-50 transition-all">Cancel</button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || !selectedPartner || saving}
                        className="flex-[2] py-3.5 bg-[#008069] text-white rounded-[20px] text-sm font-bold shadow-lg hover:bg-[#006a57] disabled:opacity-40 transition-all active:scale-95"
                    >
                        {saving ? 'Creating Group...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};
