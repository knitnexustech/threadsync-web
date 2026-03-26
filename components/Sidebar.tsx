import React, { useEffect, useState, useRef } from 'react';
import { User, Order, Channel, Company, hasPermission } from '../types';
import { api } from '../supabaseAPI';
import { Modal } from './Modal';
import { useSidebar } from '../hooks/useSidebar';

interface SidebarProps {
    currentUser: User;
    onSelectGroup: (channel: Channel, po: Order) => void;
    selectedGroupId?: string;
    onLogout: () => void;
    installPrompt?: any;
    onInstallApp?: () => void;
    onTakeTour?: () => void;
    isTourActive?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onSelectGroup, selectedGroupId, onLogout, installPrompt, onInstallApp, onTakeTour, isTourActive }) => {
    const {
        activeTab, setActiveTab,
        globalSearchQuery, setGlobalSearchQuery,
        expandedOrders, toggleOrder,
        isSupplierDropdownOpen, setIsSupplierDropdownOpen,
        supplierSearchQuery, setSupplierSearchQuery,
        isProcessing,
        userCompany,
        vendorsList,
        modalState,
        openModal, closeModal,
        newOrderData, setNewOrderData,
        newGroupData, setNewGroupData,
        editOrderData, setEditOrderData,
        loading,
        orders, allChannels, partners,
        channelsMap,
        canCreateOrder, canEditOrder, canDeleteOrder, canCreateGroup,
        handleCreateOrder, handleCreateGroup, handleOrderStatusChange,
        handleEditOrder, handleDeleteOrder,
        createOrderMutation, createGroupMutation,
        isOverdue,
        queryClient, navigate
    } = useSidebar(currentUser, selectedGroupId);

    const supplierComboboxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (supplierComboboxRef.current && !supplierComboboxRef.current.contains(event.target as Node)) {
                setIsSupplierDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setIsSupplierDropdownOpen]);


    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-[400px] overflow-hidden">
            {/* Header & Tabs */}
            <div className="bg-[#f0f2f5] border-b sticky top-0 z-10 flex flex-col safe-pt">
                <div className="px-5 py-4 flex justify-between items-center">
                    <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Chats</h1>
                </div>

                <div className="flex px-1">
                    <button onClick={() => setActiveTab('PENDING')} className={`flex-1 py-3 text-[13px] font-bold uppercase tracking-wider transition-all border-b-4 ${activeTab === 'PENDING' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Pending</button>
                    <button onClick={() => setActiveTab('IN_PROGRESS')} className={`flex-1 py-3 text-[13px] font-bold uppercase tracking-wider transition-all border-b-4 ${activeTab === 'IN_PROGRESS' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Active</button>
                    <button onClick={() => setActiveTab('COMPLETED')} className={`flex-1 py-3 text-[13px] font-bold uppercase tracking-wider transition-all border-b-4 ${activeTab === 'COMPLETED' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Done</button>
                </div>
            </div>

            {/* Global Search Bar */}
            <div className="px-4 py-2 border-b border-gray-100">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={`Search ${activeTab.toLowerCase()}...`}
                        value={globalSearchQuery}
                        onChange={(e) => setGlobalSearchQuery(e.target.value)}
                        className="w-full bg-gray-100 border-none rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-[#00a884]"
                    />
                    <div className="absolute left-3 top-2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-400 text-sm">Syncing secure data...</div>
                ) : (
                    <React.Fragment>
                        {(() => {
                            const filteredOrders = orders.filter(o => 
                                (o.order_number.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
                                o.style_number?.toLowerCase().includes(globalSearchQuery.toLowerCase())) &&
                                o.status === activeTab
                            ).sort((a, b) => {
                                const aChannels = channelsMap[a.id] || [];
                                const bChannels = channelsMap[b.id] || [];
                                
                                const getClosestDate = (channels: any[]) => {
                                    const dates = channels.map((c: any) => c.due_date).filter(Boolean).map((d: string) => new Date(d).getTime());
                                    return dates.length > 0 ? Math.min(...dates) : Infinity;
                                };

                                const aDate = getClosestDate(aChannels);
                                const bDate = getClosestDate(bChannels);

                                if (aDate !== Infinity || bDate !== Infinity) {
                                    return aDate - bDate;
                                }

                                const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
                                const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
                                return bCreated - aCreated;
                            });

                            if (filteredOrders.length === 0) {
                                return <div className="p-4 text-center text-gray-400 text-sm">No matching orders found.</div>;
                            }

                            return filteredOrders.map((order, idx) => {
                                const orderChannels = channelsMap[order.id] || [];
                                const isCompleted = order.status === 'COMPLETED';
                                const isExpanded = expandedOrders[order.id] ?? true;
                                
                                return (
                                    <div key={order.id} className={`${idx > 0 ? 'border-t border-gray-100' : ''} ${isCompleted ? 'opacity-60' : ''}`}>
                                        {/* Order Header (Community Header) */}
                                        <div onClick={() => toggleOrder(order.id)} className="px-5 py-3.5 flex items-center justify-between group cursor-pointer bg-gray-50/80 hover:bg-gray-100 transition-colors border-b border-gray-100/50">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-extrabold text-[#111b21] text-[16px] tracking-tight truncate leading-tight">{order.order_number}</h3>
                                                    <select
                                                        value={order.status}
                                                        onChange={(e) => handleOrderStatusChange(order.id, e.target.value as any)}
                                                        className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider border-none focus:ring-1 focus:ring-[#008069] cursor-pointer shadow-sm ${order.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' : order.status === 'COMPLETED' ? 'bg-gray-200 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="PENDING">PENDING</option>
                                                        <option value="IN_PROGRESS">ACTIVE</option>
                                                        <option value="COMPLETED">DONE</option>
                                                    </select>
                                                </div>
                                                <p className="text-[12px] text-gray-500 font-bold truncate mt-1 tracking-tight">{order.style_number}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {canEditOrder && (
                                                    <button onClick={(e) => { e.stopPropagation(); openModal('EDIT_ORDER', order); }} className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-[#008069] transition-all">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                )}
                                                <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>

                                        {/* Channels List */}
                                        {isExpanded && (
                                            <div className="animate-in fade-in slide-in-from-top-1 duration-200 divide-y divide-gray-50 bg-white">
                                                {orderChannels.length === 0 ? (
                                                    <div className="px-8 py-4 text-[13px] text-gray-400 italic bg-white">No groups setup for this order...</div>
                                                ) : orderChannels.map((ch) => {
                                                    const hasUnread = ch.last_activity_at && ch.last_read_at && new Date(ch.last_activity_at) > new Date(ch.last_read_at);
                                                    return (
                                                        <div
                                                            key={ch.id}
                                                            onClick={() => {
                                                                onSelectGroup(ch, order);
                                                                api.markChannelAsRead(currentUser, ch.id);
                                                                queryClient.invalidateQueries({ queryKey: ['channels'] });
                                                            }}
                                                            className={`px-6 py-4 cursor-pointer flex items-center justify-between group transition-all hover:bg-gray-50 border-l-4 ${selectedGroupId === ch.id ? 'bg-[#f0f2f5] border-[#008069]' : 'border-transparent'}`}
                                                        >
                                                            <div className="flex-1 min-w-0 pr-3">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className={`text-[16px] truncate ${hasUnread ? 'font-bold text-[#111b21]' : 'font-medium text-gray-700'}`}>{ch.name}</span>
                                                                    {ch.last_activity_at && (
                                                                        <span className={`text-[11px] shrink-0 ml-2 ${hasUnread ? 'text-[#00a884] font-bold' : 'text-gray-400 font-medium'}`}>
                                                                            {new Date(ch.last_activity_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[13px] truncate ${hasUnread ? 'text-[#111b21] font-semibold' : 'text-gray-500 tracking-tight'}`}>
                                                                        {ch.status === 'COMPLETED' ? '✓ Group closed' : (ch.due_date ? `Due: ${new Date(ch.due_date).toLocaleDateString([], { day: '2-digit', month: 'short' })}` : 'Recent activity...')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {hasUnread && (
                                                                <div className="w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center shadow-sm">
                                                                    <span className="text-[10px] text-white font-black">1</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                
                                                {!isCompleted && canCreateGroup && (
                                                    <div className="px-6 py-3 bg-white">
                                                        <button onClick={() => openModal('ADD_GROUP', { orderId: order.id })} className="text-[13px] font-black text-[#008069] hover:text-[#005c4b] flex items-center gap-1.5 transition-all uppercase tracking-widest">
                                                            <span className="text-xl leading-none font-light">+</span> Add Group
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </React.Fragment>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex justify-end items-center relative safe-pb shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                {canCreateGroup && (
                    <button onClick={() => openModal('ADD_GROUP')} className="h-14 w-14 flex items-center justify-center text-white bg-[#008069] hover:bg-[#006a57] rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 absolute -top-7 right-6 z-10" title="Create New Group">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    </button>
                )}
            </div>

            <Modal isOpen={modalState.type === 'NEW_ORDER'} onClose={closeModal} title="Create New Order" footer={<button onClick={handleCreateOrder} disabled={createOrderMutation.isPending} className="bg-[#008069] text-white px-6 py-2 rounded text-sm font-bold shadow-md hover:bg-[#006a57] disabled:bg-gray-300">{createOrderMutation.isPending ? 'Creating...' : 'Create Order'}</button>}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Order Name/Number</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" placeholder="e.g. ORD-2024..." value={newOrderData.orderNo} onChange={e => setNewOrderData({ ...newOrderData, orderNo: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Style Type</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" placeholder="e.g. T-Shirt..." value={newOrderData.styleNo} onChange={e => setNewOrderData({ ...newOrderData, styleNo: e.target.value })} /></div>
                </div>
            </Modal>
            
            <Modal isOpen={modalState.type === 'ADD_GROUP'} onClose={closeModal} title="New Chat Group" footer={<button onClick={handleCreateGroup} disabled={createGroupMutation.isPending} className="bg-[#008069] text-white px-6 py-2 rounded text-sm font-bold shadow-md hover:bg-[#006a57] disabled:bg-gray-300">{createGroupMutation.isPending ? 'Syncing...' : 'Create Group'}</button>}>
                <div className="space-y-5 py-4">
                    <div>
                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">1. Select Target Order</label>
                        <select 
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008069] outline-none transition-all bg-gray-50 font-bold"
                            value={newGroupData.orderId}
                            onChange={e => setNewGroupData({ ...newGroupData, orderId: e.target.value })}
                        >
                            <option value="">Select an active order...</option>
                            {orders.map(o => (
                                <option key={o.id} value={o.id}>{o.order_number} ({o.style_number})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">2. Group Identity</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008069] outline-none bg-gray-50 font-medium" 
                            placeholder="e.g. Sampling, Dyeing Dept..." 
                            value={newGroupData.name} 
                            onChange={e => setNewGroupData({ ...newGroupData, name: e.target.value })} 
                        />
                    </div>

                    <div className="relative" ref={supplierComboboxRef}>
                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">3. Assign Partner (Optional)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#008069] outline-none bg-gray-50" 
                                placeholder="Search suppliers or contacts..." 
                                value={supplierSearchQuery || (vendorsList.find(v => v.id === newGroupData.vendorId)?.name || partners.find(p => p.id === newGroupData.vendorId)?.name || '')} 
                                onChange={(e) => { 
                                    setSupplierSearchQuery(e.target.value); 
                                    setIsSupplierDropdownOpen(true); 
                                    if (!e.target.value) setNewGroupData({ ...newGroupData, vendorId: '' }); 
                                }} 
                                onFocus={() => setIsSupplierDropdownOpen(true)} 
                            />
                            {isSupplierDropdownOpen && (
                                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 divide-y divide-gray-50">
                                    <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Partners & Contacts</div>
                                    {[...vendorsList, ...partners]
                                        .filter((v, idx, self) => self.findIndex(t => t.id === v.id) === idx) // unique
                                        .filter(v => v.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()))
                                        .map(v => (
                                            <div key={v.id} className="px-4 py-3 cursor-pointer hover:bg-green-50 transition-colors" onClick={() => { setNewGroupData({ ...newGroupData, vendorId: v.id }); setSupplierSearchQuery(''); setIsSupplierDropdownOpen(false); }}>
                                                <p className="font-semibold text-gray-900 text-sm">{v.name}</p>
                                                <p className="text-[10px] text-gray-400">Supplier/Vendor Partner</p>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                        <p className="mt-2 text-[11px] text-gray-400 leading-relaxed italic">Leaving this blank creates an internal team group for the selected order.</p>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={modalState.type === 'EDIT_ORDER'} onClose={closeModal} title="Edit Order Details" footer={<div className="flex gap-3 justify-stretch">{canDeleteOrder && <button onClick={() => { closeModal(); openModal('DELETE_ORDER', modalState.data); }} disabled={isProcessing} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50">Delete Order</button>}<button onClick={handleEditOrder} disabled={isProcessing} className="bg-[#008069] text-white px-6 py-2 rounded text-sm font-bold shadow-md hover:bg-[#006a57] disabled:bg-gray-300">{isProcessing ? 'Saving...' : 'Save Changes'}</button></div>}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Order #</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editOrderData.orderNo} onChange={e => setEditOrderData({ ...editOrderData, orderNo: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Style</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editOrderData.styleNo} onChange={e => setEditOrderData({ ...editOrderData, styleNo: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Status</label><select className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editOrderData.status} onChange={e => setEditOrderData({ ...editOrderData, status: e.target.value })}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select></div>
                </div>
            </Modal>

            <Modal isOpen={modalState.type === 'DELETE_ORDER'} onClose={closeModal} title="Delete Order" footer={<div className="flex gap-3 justify-end"><button onClick={closeModal} disabled={isProcessing} className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Cancel</button><button onClick={handleDeleteOrder} disabled={isProcessing} className="px-6 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-md disabled:bg-red-400">{isProcessing ? 'Deleting...' : 'Delete'}</button></div>}><div className="space-y-3"><p className="text-sm text-gray-700">Are you sure you want to delete <strong>{modalState.data?.order_number}</strong>?</p><div className="bg-red-50 border border-red-200 rounded p-3"><p className="text-sm text-red-800 font-medium">⚠️ Warning</p><p className="text-xs text-red-700 mt-1">Permanently delete everything? This cannot be undone.</p></div></div></Modal>
        </div>
    );
};
