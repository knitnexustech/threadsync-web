import React, { useEffect, useState, useRef } from 'react';
import { User, Order, Channel, Company, hasPermission } from '../types';
import { api } from '../supabaseAPI';
import { Modal } from './Modal';
import { useSidebar } from '../hooks/useSidebar';
import { QuickOrderForm } from '@/features/orders/components/QuickOrderForm';
import { QuickGroupForm } from '@/features/orders/components/QuickGroupForm';

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
        isProcessing,
        userCompany,
        modalState,
        openModal, closeModal,
        newOrderData, setNewOrderData,
        editOrderData, setEditOrderData,
        loading,
        orders, allChannels,
        channelsMap,
        canCreateOrder, canEditOrder, canDeleteOrder, canCreateGroup,
        handleCreateOrder, handleOrderStatusChange,
        handleEditOrder, handleDeleteOrder,
        handleUpdatePasscode, handleUpdateCompanyName, handleDeleteOrganization,
        createOrderMutation,
        isOverdue, isDueSoon,
        queryClient, navigate,
        sidebarView, setSidebarView,
        passcodeData, setPasscodeData,
        editCompanyName, setEditCompanyName,
        deleteConfirmText, setDeleteConfirmText
    } = useSidebar(currentUser, selectedGroupId);


    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-[400px] overflow-hidden relative">
            {/* Header & View Controls */}
            <div className="bg-[#f0f2f5] border-b sticky top-0 z-10 flex flex-col safe-pt">
                <div className="px-5 py-4 flex justify-between items-center">
                    <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Chats</h1>
                    <div className="flex bg-gray-200 p-0.5 rounded-lg">
                        <button 
                            onClick={() => setSidebarView('ORDER')} 
                            className={`px-3 py-1 text-[11px] font-black uppercase rounded-md transition-all ${sidebarView === 'ORDER' ? 'bg-white text-[#008069] shadow-sm' : 'text-gray-500'}`}
                        >
                            Orders
                        </button>
                        <button 
                            onClick={() => setSidebarView('PARTNER')} 
                            className={`px-3 py-1 text-[11px] font-black uppercase rounded-md transition-all ${sidebarView === 'PARTNER' ? 'bg-white text-[#008069] shadow-sm' : 'text-gray-500'}`}
                        >
                            Partners
                        </button>
                    </div>
                </div>

                <div className="px-4 pb-3">
                    <div className="relative">
                        <select 
                            value={activeTab} 
                            onChange={(e) => setActiveTab(e.target.value as any)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-4 pr-10 text-[13px] font-bold text-gray-700 focus:ring-2 focus:ring-[#00a884] focus:border-transparent appearance-none shadow-sm cursor-pointer"
                        >
                            <option value="ALL">All Chats</option>
                            <option value="PENDING">Pending (Yellow)</option>
                            <option value="IN_PROGRESS">Active (Green)</option>
                            <option value="COMPLETED">Completed (Gray)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Search Bar */}
            <div className="px-4 py-2 border-b border-gray-100">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={sidebarView === 'ORDER' ? "Search orders or styles..." : "Search partners or groups..."}
                        value={globalSearchQuery}
                        onChange={(e) => setGlobalSearchQuery(e.target.value)}
                        className="w-full bg-gray-100 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-[#00a884]"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-32">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069] mx-auto mb-4"></div>
                        <p className="text-gray-400 text-sm font-medium">Syncing secure data...</p>
                    </div>
                ) : (
                    <React.Fragment>
                        {sidebarView === 'ORDER' ? (
                            (() => {
                                const filteredOrders = orders.filter(o => 
                                    (o.order_number.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
                                    o.style_number?.toLowerCase().includes(globalSearchQuery.toLowerCase())) &&
                                    (activeTab === 'ALL' || o.status === activeTab)
                                ).sort((a, b) => {
                                    const aChannels = channelsMap[a.id] || [];
                                    const bChannels = channelsMap[b.id] || [];
                                    const getClosestDate = (channels: any[]) => {
                                        const dates = channels.map((c: any) => c.due_date).filter(Boolean).map((d: string) => new Date(d).getTime());
                                        return dates.length > 0 ? Math.min(...dates) : Infinity;
                                    };
                                    const aDate = getClosestDate(aChannels);
                                    const bDate = getClosestDate(bChannels);
                                    if (aDate !== Infinity || bDate !== Infinity) return aDate - bDate;
                                    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
                                    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
                                    return bCreated - aCreated;
                                });

                                if (filteredOrders.length === 0) return <div className="p-12 text-center text-gray-400 text-sm italic">No matching orders found.</div>;

                                return filteredOrders.map((order, idx) => {
                                    const orderChannels = channelsMap[order.id] || [];
                                    const anyDueSoon = orderChannels.some(ch => isDueSoon(ch.due_date) && ch.status !== 'COMPLETED');
                                    const isCompleted = order.status === 'COMPLETED';
                                    const isExpanded = expandedOrders[order.id] ?? true;
                                    
                                    return (
                                        <div key={order.id} className={`${idx > 0 ? 'border-t border-gray-100' : ''} ${isCompleted ? 'opacity-60' : ''}`}>
                                            <div onClick={() => toggleOrder(order.id)} className="px-5 py-3.5 flex items-center justify-between group cursor-pointer bg-gray-50/80 hover:bg-gray-100 transition-colors border-b border-gray-100/50">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`font-extrabold text-[16px] tracking-tight truncate leading-tight ${anyDueSoon ? 'text-red-600' : 'text-[#111b21]'}`}>{order.order_number}</h3>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${order.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' : order.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {order.status === 'IN_PROGRESS' ? 'Active' : order.status}
                                                        </span>
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
                                            {isExpanded && (
                                                <div className="divide-y divide-gray-50 bg-white">
                                                    {orderChannels.length === 0 ? (
                                                        <div className="px-8 py-4 text-[13px] text-gray-400 italic">No groups setup...</div>
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
                                                                        <div className="flex items-center gap-2 truncate">
                                                                            <span className={`text-[16px] truncate ${isDueSoon(ch.due_date) && ch.status !== 'COMPLETED' ? 'text-red-600 font-black' : hasUnread ? 'font-bold text-[#111b21]' : 'font-medium text-gray-700'}`}>{ch.name}</span>
                                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter shrink-0 ${ch.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' : ch.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                                {ch.status === 'IN_PROGRESS' ? 'Active' : ch.status}
                                                                            </span>
                                                                        </div>
                                                                        {ch.last_activity_at && (
                                                                            <span className={`text-[11px] shrink-0 ml-2 ${hasUnread ? 'text-[#00a884] font-bold' : 'text-gray-400 font-medium'}`}>
                                                                                {new Date(ch.last_activity_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[13px] truncate ${hasUnread ? 'text-[#111b21] font-semibold' : 'text-gray-500 tracking-tight'}`}>
                                                                            {ch.status === 'COMPLETED' ? '✓ Group closed' : (ch.last_message ? ch.last_message : (ch.due_date ? `Due: ${new Date(ch.due_date).toLocaleDateString([], { day: '2-digit', month: 'short' })}` : 'No messages yet'))}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                {hasUnread && <div className="w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center shadow-sm"><span className="text-[10px] text-white font-black">1</span></div>}
                                                            </div>
                                                        );
                                                    })}
                                                    {!isCompleted && canCreateGroup && (
                                                        <div className="px-6 py-3 bg-white">
                                                            <button onClick={() => openModal('NEW_GROUP', { orderId: order.id })} className="text-[13px] font-black text-[#008069] hover:text-[#005c4b] flex items-center gap-1.5 transition-all uppercase tracking-widest">+ Add Group</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()
                        ) : (
                            (() => {
                                // Partner-wise View
                                const partnerGroups: Record<string, { name: string, channels: any[] }> = {};
                                allChannels.forEach(ch => {
                                    if (activeTab !== 'ALL' && ch.status !== activeTab) return;
                                    const partnerName = (ch as any).vendor?.name || 'Internal / General';
                                    const searchMatch = partnerName.toLowerCase().includes(globalSearchQuery.toLowerCase()) || ch.name.toLowerCase().includes(globalSearchQuery.toLowerCase());
                                    if (!searchMatch) return;

                                    if (!partnerGroups[partnerName]) partnerGroups[partnerName] = { name: partnerName, channels: [] };
                                    partnerGroups[partnerName].channels.push(ch);
                                });

                                const partners = Object.values(partnerGroups).sort((a, b) => a.name.localeCompare(b.name));
                                if (partners.length === 0) return <div className="p-12 text-center text-gray-400 text-sm italic">No matching partners found.</div>;

                                return partners.map((partner, idx) => (
                                    <div key={partner.name} className={`${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                                        <div className="px-5 py-2.5 bg-gray-50 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-[#008069]/10 flex items-center justify-center">
                                                <svg className="w-3.5 h-3.5 text-[#008069]" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                                            </div>
                                            <span className="text-[12px] font-black uppercase tracking-widest text-[#008069]">{partner.name}</span>
                                            <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full ml-auto">{partner.channels.length}</span>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {partner.channels.map(ch => {
                                                const hasUnread = ch.last_activity_at && ch.last_read_at && new Date(ch.last_activity_at) > new Date(ch.last_read_at);
                                                const orderOfChannel = ch.order;
                                                return (
                                                    <div
                                                        key={ch.id}
                                                        onClick={() => {
                                                            onSelectGroup(ch, orderOfChannel);
                                                            api.markChannelAsRead(currentUser, ch.id);
                                                            queryClient.invalidateQueries({ queryKey: ['channels'] });
                                                        }}
                                                        className={`px-6 py-4 cursor-pointer flex items-center justify-between group transition-all hover:bg-gray-50 border-l-4 ${selectedGroupId === ch.id ? 'bg-[#f0f2f5] border-[#008069]' : 'border-transparent'}`}
                                                    >
                                                        <div className="flex-1 min-w-0 pr-3">
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <div className="flex items-center gap-2 truncate">
                                                                    <span className={`text-[16px] truncate ${isDueSoon(ch.due_date) && ch.status !== 'COMPLETED' ? 'text-red-600 font-black' : hasUnread ? 'font-bold text-[#111b21]' : 'font-medium text-gray-700'}`}>{ch.name}</span>
                                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter shrink-0 ${ch.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' : ch.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                        {ch.status === 'IN_PROGRESS' ? 'Active' : ch.status}
                                                                    </span>
                                                                </div>
                                                                {ch.last_activity_at && (
                                                                    <span className={`text-[11px] shrink-0 ml-2 ${hasUnread ? 'text-[#00a884] font-bold' : 'text-gray-400 font-medium'}`}>
                                                                        {new Date(ch.last_activity_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] text-[#008069] font-bold uppercase tracking-tight mb-1">{orderOfChannel?.order_number} • {orderOfChannel?.style_number}</span>
                                                                <span className={`text-[13px] truncate ${hasUnread ? 'text-[#111b21] font-semibold' : 'text-gray-500 tracking-tight'}`}>
                                                                    {ch.last_message || 'No messages'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {hasUnread && <div className="w-5 h-5 bg-[#00a884] rounded-full flex items-center justify-center shadow-sm"><span className="text-[10px] text-white font-black">1</span></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ));
                            })()
                        )}
                    </React.Fragment>
                )}
            </div>

            {/* Floating Action Button - Simplified to New Order only */}
            {canCreateOrder && (
                <button 
                    onClick={() => openModal('NEW_ORDER')} 
                    className="fixed md:absolute bottom-20 md:bottom-6 right-6 h-14 w-14 flex items-center justify-center text-white bg-[#008069] hover:bg-[#006a57] rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 z-[60]"
                    title="Add New Order"
                >
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            )}

            


            <Modal isOpen={modalState.type === 'EDIT_ORDER'} onClose={closeModal} title="Edit Order Details" footer={<div className="flex gap-3 justify-stretch">{canDeleteOrder && <button onClick={() => { closeModal(); openModal('DELETE_ORDER', modalState.data); }} disabled={isProcessing} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50">Delete Order</button>}<button onClick={handleEditOrder} disabled={isProcessing} className="bg-[#008069] text-white px-6 py-2 rounded text-sm font-bold shadow-md hover:bg-[#006a57] disabled:bg-gray-300">{isProcessing ? 'Saving...' : 'Save Changes'}</button></div>}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Order #</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editOrderData.orderNo} onChange={e => setEditOrderData({ ...editOrderData, orderNo: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Style</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editOrderData.styleNo} onChange={e => setEditOrderData({ ...editOrderData, styleNo: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Status</label><select className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editOrderData.status} onChange={e => setEditOrderData({ ...editOrderData, status: e.target.value })}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select></div>
                </div>
            </Modal>


            <Modal isOpen={modalState.type === 'DELETE_ORDER'} onClose={closeModal} title="Delete Order" footer={<div className="flex gap-3 justify-end"><button onClick={closeModal} disabled={isProcessing} className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Cancel</button><button onClick={handleDeleteOrder} disabled={isProcessing} className="px-6 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-md disabled:bg-red-400">{isProcessing ? 'Deleting...' : 'Delete'}</button></div>}><div className="space-y-3"><p className="text-sm text-gray-700">Are you sure you want to delete <strong>{modalState.data?.order_number}</strong>?</p><div className="bg-red-50 border border-red-200 rounded p-3"><p className="text-sm text-red-800 font-medium">⚠️ Warning</p><p className="text-xs text-red-700 mt-1">Permanently delete everything? This cannot be undone.</p></div></div></Modal>

            {modalState.type === 'NEW_ORDER' && (
                <QuickOrderForm 
                    currentUser={currentUser}
                    onClose={closeModal}
                />
            )}

            {modalState.type === 'NEW_GROUP' && (
                <QuickGroupForm
                    orderId={modalState.data?.orderId}
                    currentUser={currentUser}
                    onClose={closeModal}
                />
            )}

            {/* Ported Modals from Main */}
            <Modal isOpen={modalState.type === 'UPDATE_PASSCODE'} onClose={closeModal} title="Update Secure Passcode" footer={<button onClick={handleUpdatePasscode} disabled={isProcessing || passcodeData.newPasscode.length < 4} className="bg-[#008069] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#006a57] disabled:bg-gray-300">{isProcessing ? 'Updating...' : 'Update Passcode'}</button>}>
                <div className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-[11px] text-blue-700 font-medium">Your passcode is used to log in on mobile. Keep it secret.</div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Passcode</label><input type="password" maxLength={4} className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069] tracking-widest font-black" placeholder="****" value={passcodeData.oldPasscode} onChange={e => setPasscodeData({ ...passcodeData, oldPasscode: e.target.value.replace(/\D/g, '') })} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">New Passcode</label><input type="password" maxLength={4} className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069] tracking-widest font-black" placeholder="****" value={passcodeData.newPasscode} onChange={e => setPasscodeData({ ...passcodeData, newPasscode: e.target.value.replace(/\D/g, '') })} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New</label><input type="password" maxLength={4} className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069] tracking-widest font-black" placeholder="****" value={passcodeData.confirmPasscode} onChange={e => setPasscodeData({ ...passcodeData, confirmPasscode: e.target.value.replace(/\D/g, '') })} /></div>
                </div>
            </Modal>

            <Modal isOpen={modalState.type === 'EDIT_COMPANY'} onClose={closeModal} title="Edit Company Name" footer={<button onClick={handleUpdateCompanyName} disabled={!editCompanyName.trim() || isProcessing} className="bg-[#008069] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#006a57] disabled:bg-gray-300">{isProcessing ? 'Saving...' : 'Save Changes'}</button>}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                        <input
                            type="text"
                            className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]"
                            placeholder="Organization Name"
                            value={editCompanyName}
                            onChange={e => setEditCompanyName(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>

            <Modal isOpen={modalState.type === 'HOW_TO_INSTALL'} onClose={closeModal} title="Install Kramiz App">
                <div className="space-y-6 py-2 text-left">
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">To use Kramiz (Beta) as a mobile app, follow these simple steps:</p>
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black flex-shrink-0 text-gray-600">1</div>
                            <p className="text-sm text-gray-800">Open this site in <strong className="text-[#008069]">Safari</strong> (iOS) or <strong className="text-[#008069]">Chrome</strong> (Android).</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black flex-shrink-0 text-gray-600">2</div>
                            <p className="text-sm text-gray-800">Tap the <strong className="text-blue-600">Share</strong> icon or the <strong className="text-gray-900">3-dots (⋮)</strong> menu.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black flex-shrink-0 text-gray-600">3</div>
                            <p className="text-sm text-gray-800">Select <strong className="text-[#008069]">Add to Home Screen</strong> or <strong className="text-[#008069]">Install App</strong>.</p>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={modalState.type === 'DELETE_ORGANIZATION'}
                onClose={closeModal}
                title="⚠️ DELETE ORGANIZATION"
                footer={
                    <button
                        onClick={handleDeleteOrganization}
                        disabled={deleteConfirmText !== userCompany?.name || isProcessing}
                        className="w-full bg-red-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-red-700 disabled:bg-gray-300 transition-colors shadow-lg"
                    >
                        {isProcessing ? 'Deleting...' : 'Permanently Delete Everything'}
                    </button>
                }
            >
                <div className="space-y-6 py-2 text-left">
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-sm text-red-700 font-bold leading-relaxed mb-2">CRITICAL WARNING:</p>
                        <p className="text-xs text-red-600 leading-relaxed">This action will wipe out all data related to **{userCompany?.name}**. This action cannot be reversed.</p>
                    </div>
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-gray-700">Type <span className="text-red-600">"{userCompany?.name}"</span> to confirm:</p>
                        <input
                            type="text"
                            autoFocus
                            className="w-full border-2 border-red-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 transition-all"
                            placeholder="Enter organization name"
                            value={deleteConfirmText}
                            onChange={e => setDeleteConfirmText(e.target.value)}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};
