
import React, { useEffect, useState, useRef } from 'react';
import { User, PurchaseOrder, Channel, Company, hasPermission } from '../types';
import { api } from '../supabaseAPI';
import { Modal } from './Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface SidebarProps {
    currentUser: User;
    onSelectChannel: (channel: Channel, po: PurchaseOrder) => void;
    selectedChannelId?: string;
    onLogout: () => void;
    installPrompt?: any;
    onInstallApp?: () => void;
    onTakeTour?: () => void;
    isTourActive?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, onSelectChannel, selectedChannelId, onLogout, installPrompt, onInstallApp, onTakeTour, isTourActive }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'ORDERS' | 'PARTNERS'>('ORDERS');

    // Queries
    const { data: pos = [], isLoading: loadingPOs } = useQuery({
        queryKey: ['pos', currentUser.id],
        queryFn: () => api.getPOs(currentUser),
    });

    const { data: allChannels = [], isLoading: loadingChannels } = useQuery({
        queryKey: ['channels', currentUser.id],
        queryFn: () => api.getAllChannels(currentUser),
    });

    const { data: partners = [], isLoading: loadingPartners } = useQuery({
        queryKey: ['partners', currentUser.id],
        queryFn: () => api.getPartners(currentUser),
    });

    const loading = loadingPOs || loadingChannels || loadingPartners;

    // Derived State
    const channelsMap = React.useMemo(() => {
        const map: Record<string, Channel[]> = {};
        allChannels.forEach(ch => {
            if (!map[ch.po_id]) map[ch.po_id] = [];
            map[ch.po_id].push(ch);
        });
        return map;
    }, [allChannels]);

    // Mutations
    const handleRefresh = () => {
        const mask = document.getElementById('global-loader');
        if (mask) mask.style.display = 'flex';
        queryClient.invalidateQueries();
        setTimeout(() => window.location.reload(), 500);
    };

    const createPOMutation = useMutation({
        mutationFn: (data: typeof newPOData) => api.createPO(currentUser, data.orderNo, data.styleNo, data.selectedTeamMembers),
        onSuccess: () => {
            closeModal();
            handleRefresh();
        }
    });

    const createChannelMutation = useMutation({
        mutationFn: (data: typeof newChannelData) => api.createChannel(currentUser, modalState.data.poId, data.name, data.vendorId),
        onSuccess: () => {
            closeModal();
            handleRefresh();
        },
        onError: (err: any) => alert(err.message || "Failed to create group")
    });

    const addVendorMutation = useMutation({
        mutationFn: (data: typeof newVendor) => api.createVendor(data.name, data.phone, data.adminName),
        onSuccess: async (_, variables) => {
            setVendorsList(await api.getVendors());
            const passcode = variables.phone.slice(-4);
            const appLink = window.location.origin;
            const message = `Hello ${variables.adminName},\n\nI am inviting you as a supplier to join our production tracking app: ${appLink}\n\nYour login details are:\nPhone: ${variables.phone}\nPasscode: ${passcode}`;
            setInviteLink(`https://wa.me/91${variables.phone}?text=${encodeURIComponent(message)}`);
            setNewVendor({ name: '', phone: '', adminName: '' });
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
        onError: (err: any) => alert(err.message || "Failed to add vendor")
    });

    const addTeamMemberMutation = useMutation({
        mutationFn: (data: typeof newTeamMember) => api.createTeamMember(currentUser, data.name, data.phone, data.passcode, data.role),
        onSuccess: async (_, variables) => {
            setTeamList(await api.getTeamMembers(currentUser));
            const appLink = window.location.origin;
            const message = `Hello ${variables.name},\n\nYou have been added as a ${variables.role.replace('_', ' ')} to the Kramiz production tracking app: ${appLink}\n\nYour login details are:\nPhone: ${variables.phone}\nPasscode: ${variables.passcode}`;
            setInviteLink(`https://wa.me/91${variables.phone}?text=${encodeURIComponent(message)}`);
            setNewTeamMember({ name: '', phone: '', passcode: '', role: 'JUNIOR_MERCHANDISER' });
        },
        onError: (err: any) => alert(err.message || "Failed to add team member")
    });

    const updateCompanyMutation = useMutation({
        mutationFn: (newName: string) => api.updateCompanyName(currentUser.company_id, newName),
        onSuccess: () => {
            handleRefresh();
        }
    });

    // Settings & Modals State
    const [showSettings, setShowSettings] = useState(false);

    const [modalState, setModalState] = useState<{
        type: 'NONE' | 'NEW_PO' | 'ADD_CHANNEL' | 'SUPPLIERS' | 'TEAM' | 'EDIT_PO' | 'DELETE_PO' | 'CHANGE_PASSCODE' | 'EDIT_COMPANY' | 'HOW_TO_INSTALL' | 'DELETE_ORGANIZATION';
        data?: any;
    }>({ type: 'NONE' });

    // Form States
    const [newPOData, setNewPOData] = useState({ orderNo: '', styleNo: '', selectedTeamMembers: [] as string[] });
    const [newChannelData, setNewChannelData] = useState({ name: '', vendorId: '' });
    const [editPOData, setEditPOData] = useState({ orderNo: '', styleNo: '', status: 'PENDING' });
    const [editCompanyName, setEditCompanyName] = useState('');

    // Supplier Creation State
    const [newVendor, setNewVendor] = useState({ name: '', phone: '', adminName: '' });
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    // Team Creation State
    const [newTeamMember, setNewTeamMember] = useState({ name: '', phone: '', passcode: '', role: 'JUNIOR_MERCHANDISER' as User['role'] });
    const [passcodeData, setPasscodeData] = useState({ oldPasscode: '', newPasscode: '', confirmPasscode: '' });

    // Combobox States
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [vendorsSearchQuery, setVendorsSearchQuery] = useState('');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

    // Data Lists for Modals
    const [vendorsList, setVendorsList] = useState<Company[]>([]);
    const [teamList, setTeamList] = useState<User[]>([]);
    const [userCompany, setUserCompany] = useState<Company | null>(null);
    const isVendor = userCompany?.type === 'VENDOR';

    // UI state for search and expansion
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [expandedPOs, setExpandedPOs] = useState<Record<string, boolean>>({});

    // Toggle PO expansion
    const togglePO = (id: string) => {
        setExpandedPOs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Notification State
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
        'Notification' in window ? Notification.permission : 'denied'
    );

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === 'granted' && 'serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: 'BMfp5dpSpDKfeFxwdTGg4FTa4LCXLS_hhmZxp5mB2Ym3hks6JdohSOQCJkYQJb63QdOWUkIgbzmuzdGsDQLFodw'
                });

                await api.savePushSubscription(currentUser.id, subscription);
                console.log('Background Push Subscribed!');
            } catch (err) {
                console.error('Failed to subscribe to push:', err);
            }
        }
    };

    // iOS Detection for PWA instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);

    // Refs
    const supplierComboboxRef = useRef<HTMLDivElement>(null);
    const prevSelectedId = useRef<string | undefined>(selectedChannelId);

    // ROLE-BASED PERMISSIONS
    const canCreatePO = hasPermission(currentUser.role, 'CREATE_PO') && !isVendor;
    const canEditPO = hasPermission(currentUser.role, 'EDIT_PO');
    const canDeletePO = hasPermission(currentUser.role, 'DELETE_PO');
    const canCreateChannel = hasPermission(currentUser.role, 'CREATE_CHANNEL') && !isVendor;
    const canManageTeam = currentUser.role === 'ADMIN';
    const canManageSuppliers = !isVendor;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (supplierComboboxRef.current && !supplierComboboxRef.current.contains(event.target as Node)) {
                setIsSupplierDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const loadCompany = async () => {
            const company = await api.getCompany(currentUser.company_id);
            setUserCompany(company);
        };
        loadCompany();
    }, [currentUser.company_id]);

    useEffect(() => {
        if (isVendor) {
            setActiveTab('PARTNERS');
        } else {
            setActiveTab('ORDERS');
        }
    }, [isVendor]);

    useEffect(() => {
        if (!selectedChannelId && prevSelectedId.current) {
            queryClient.invalidateQueries({ queryKey: ['pos'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        }
        prevSelectedId.current = selectedChannelId;
    }, [selectedChannelId, queryClient]);

    const handleCreatePO = async () => {
        if (!newPOData.orderNo || !newPOData.styleNo) return;
        createPOMutation.mutate(newPOData);
    };

    const handleCreateChannel = async () => {
        if (!newChannelData.name.trim()) {
            alert("Please enter a group name (e.g. Knitting, Printing).");
            return;
        }
        if (!newChannelData.vendorId) {
            alert("Please select a supplier for this group. Use the 'Overview' group for internal team chat.");
            return;
        }
        createChannelMutation.mutate(newChannelData);
    };

    const handleAddVendor = async () => {
        if (!newVendor.name || !newVendor.adminName || !newVendor.phone) {
            alert("Please fill in company name, admin name, and phone.");
            return;
        }
        addVendorMutation.mutate(newVendor);
    };

    const handleAddTeamMember = async () => {
        if (!newTeamMember.name || !newTeamMember.phone || !newTeamMember.passcode) return;
        if (!/^\d{10}$/.test(newTeamMember.phone)) { alert('Phone must be 10 digits'); return; }
        if (!/^\d{4}$/.test(newTeamMember.passcode)) { alert('Passcode must be 4 digits'); return; }
        addTeamMemberMutation.mutate(newTeamMember);
    };

    const handlePOStatusChange = async (poId: string, newStatus: any) => {
        try {
            await api.updatePOStatus(poId, newStatus);
            handleRefresh();
        } catch (err: any) { alert(err.message || "Failed to update status"); }
    };

    const [isProcessing, setIsProcessing] = useState(false);

    const handleEditPO = async () => {
        if (!modalState.data?.id) return;
        setIsProcessing(true);
        try {
            await api.updatePO(currentUser, modalState.data.id, {
                order_number: editPOData.orderNo,
                style_number: editPOData.styleNo,
                status: editPOData.status as any
            });
            closeModal();
            handleRefresh();
        } catch (err: any) { alert(err.message || "Failed to update PO"); setIsProcessing(false); }
    };

    const handleDeletePO = async () => {
        if (!modalState.data?.id) return;
        setIsProcessing(true);
        try {
            await api.deletePO(currentUser, modalState.data.id);
            closeModal();
            handleRefresh();
        } catch (err: any) { alert(err.message || "Failed to delete PO"); setIsProcessing(false); }
    };

    const handleUpdatePasscode = async () => {
        if (!passcodeData.oldPasscode || !passcodeData.newPasscode || !passcodeData.confirmPasscode) { alert("Fill all fields"); return; }
        if (passcodeData.newPasscode !== passcodeData.confirmPasscode) { alert("Mismatched new passcodes"); return; }
        try {
            await api.updatePasscode(currentUser.id, passcodeData.oldPasscode, passcodeData.newPasscode);
            alert("Passcode updated!");
            handleRefresh();
        } catch (err: any) { alert(err.message || "Failed to update"); }
    };

    const handleUpdateCompanyName = async () => {
        if (!editCompanyName.trim()) return;
        updateCompanyMutation.mutate(editCompanyName);
    };

    const handleDeleteOrganization = async () => {
        if (deleteConfirmText !== userCompany?.name) {
            alert(`Please type "${userCompany?.name}" exactly to confirm.`);
            return;
        }

        if (!window.confirm("FINAL WARNING: This will permanently delete ALL orders, channels, messages, and files for everyone in your organization. This cannot be undone. Are you absolutely sure?")) {
            return;
        }

        setIsProcessing(true);
        try {
            await api.deleteOrganization(currentUser, currentUser.company_id);
            alert("Organization successfully deleted.");
            onLogout();
            handleRefresh();
        } catch (err: any) {
            alert(err.message || "Failed to delete organization");
            setIsProcessing(false);
        }
    };

    const openModal = async (type: typeof modalState.type, data?: any) => {
        setModalState({ type, data });
        if (type === 'ADD_CHANNEL' || type === 'SUPPLIERS') {
            setVendorsList(await api.getVendors());
            if (type === 'ADD_CHANNEL') setNewChannelData({ name: '', vendorId: '' });
            if (type === 'SUPPLIERS') { setNewVendor({ name: '', phone: '', adminName: '' }); setInviteLink(null); }
        }
        if (type === 'TEAM') setTeamList(await api.getTeamMembers(currentUser));
        if (type === 'NEW_PO') setTeamList(await api.getTeamMembers(currentUser));
        if (type === 'EDIT_PO' && data) {
            setEditPOData({ orderNo: data.order_number, styleNo: data.style_number, status: data.status });
        }
        if (type === 'EDIT_COMPANY') {
            setEditCompanyName(userCompany?.name || '');
        }
        setShowSettings(false);
    };

    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const closeModal = () => {
        setModalState({ type: 'NONE' });
        setDeleteConfirmText('');
    };
    const getPartnerLabel = () => isVendor ? 'Clients' : 'Suppliers';

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-[400px]">
            {/* Header & Tabs */}
            <div className="bg-[#f0f2f5] border-b sticky top-0 z-10 flex flex-col">
                <div className="px-1 py-1 flex justify-between items-center">
                    {/* Left: Brand Identity */}
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-28 p-2 flex items-center justify-center">
                            <img src="/logo_v2.png" alt="Kramiz" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    {/* Right: User Profile */}
                    <div className="flex flex-col items-end py-1 px-3">
                        <h2 className="text-[14px] font-bold text-gray-900 leading-tight tracking-tight">{currentUser.name}</h2>
                    </div>
                </div>

                {/* Workspace Indicator */}
                <div className="px-4 py-2 bg-white/50 border-t border-gray-100 flex justify-center items-center">
                    <span className="text-[14px] text-gray-500 font-medium">{userCompany?.name}</span>
                </div>

                <div className="flex">
                    <button onClick={() => setActiveTab('ORDERS')} className={`flex-1 py-2 text-m font-medium border-b-2 transition-colors ${activeTab === 'ORDERS' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Orders</button>
                    <button onClick={() => setActiveTab('PARTNERS')} className={`flex-1 py-2 text-m font-medium border-b-2 transition-colors ${activeTab === 'PARTNERS' ? 'border-[#008069] text-[#008069]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{getPartnerLabel()}</button>
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
                        className="w-full bg-gray-100 border-none rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-[#00a884]"
                    />
                    <div className="absolute left-3 top-2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-400 text-sm">Syncing secure data...</div>
                ) : activeTab === 'ORDERS' ? (
                    <React.Fragment>
                        {(() => {
                            const filteredPos = pos.filter(po => po.order_number.toLowerCase().includes(globalSearchQuery.toLowerCase()) || po.style_number?.toLowerCase().includes(globalSearchQuery.toLowerCase()));

                            // If no orders and tour is active, show GHOST data
                            if (filteredPos.length === 0 && isTourActive) {
                                const ghostPO: PurchaseOrder = {
                                    id: 'ghost-po',
                                    order_number: 'PO-2026-DEMO',
                                    style_number: 'SUPER SOFT HOODIE',
                                    status: 'IN_PROGRESS',
                                    manufacturer_id: currentUser.company_id,
                                    created_by: currentUser.id,
                                    image_url: ''
                                };
                                const ghostChannels: Channel[] = [
                                    { id: 'ghost-ch-1', po_id: 'ghost-po', name: 'OVERVIEW', type: 'OVERVIEW', status: 'IN_PROGRESS', specs: [], files: [] },
                                    { id: 'ghost-ch-2', po_id: 'ghost-po', name: 'KNITTING', type: 'VENDOR', status: 'PENDING', specs: [], files: [] }
                                ];
                                return (
                                    <React.Fragment key={ghostPO.id}>
                                        <div id="tour-po-card" className="mb-3 mx-2 rounded-xl border border-dashed border-gray-300 overflow-hidden shadow-sm bg-white ring-1 ring-gray-200 shadow-md">
                                            <div onClick={() => { }} className="px-4 py-3 flex gap-3 items-center group relative cursor-pointer">
                                                <svg id="tour-expand-po" className="w-4 h-4 text-gray-500 rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 text-[14px] truncate leading-tight">{ghostPO.order_number}</h3>
                                                    <p className="text-[10px] font-medium text-gray-500 truncate uppercase tracking-wider mt-0.5">{ghostPO.style_number}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 font-bold uppercase">ACTIVE</span>
                                                    <button id="tour-edit-po" className="p-1 text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50/50 border-t border-gray-100 pb-2">
                                                {ghostChannels.map((ch, idx) => (
                                                    <div key={ch.id} id={idx === 0 ? "tour-group-item" : undefined} onClick={() => onSelectChannel(ch, ghostPO)} className="px-5 py-3 flex items-center gap-3 hover:bg-white transition-colors cursor-pointer border-b border-gray-50 last:border-0">
                                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${ch.name === 'OVERVIEW' ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-gray-700">{ch.name}</p>
                                                            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Sample Group • 2 Members</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-2 bg-slate-50 text-[10px] text-slate-500 font-bold text-center border-t border-gray-100 italic">
                                                Sample Data for Tour
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            }

                            if (filteredPos.length === 0) {
                                return <div className="p-4 text-center text-gray-400 text-sm">No matching orders found.</div>;
                            }

                            return filteredPos.map(po => {
                                const poChannels = channelsMap[po.id] || [];
                                const isCompleted = po.status === 'COMPLETED';
                                const isExpanded = expandedPOs[po.id] ?? true;
                                const hasUnread = poChannels.some(ch => ch.last_activity_at && ch.last_read_at && new Date(ch.last_activity_at) > new Date(ch.last_read_at));
                                return (
                                    <div key={po.id} id="tour-po-card" className={`mb-3 mx-2 rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300 ${isExpanded ? 'bg-white ring-1 ring-gray-200 shadow-md' : 'bg-gray-100 hover:bg-gray-200'} ${isCompleted ? 'opacity-60' : ''}`}>
                                        <div onClick={() => togglePO(po.id)} className={`px-4 py-3 flex gap-3 items-center group relative cursor-pointer transition-colors ${!isExpanded ? 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5)]' : ''}`}>
                                            <svg id="tour-expand-po" className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-gray-900 text-[16px] truncate leading-tight">{po.order_number}</h3>
                                                    {hasUnread && !isExpanded && <div className="w-2 h-2 bg-[#00a884] rounded-full"></div>}
                                                </div>
                                                <p className="text-[12px] font-medium text-gray-500 truncate uppercase tracking-wider mt-0.5">{po.style_number}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={po.status}
                                                    onChange={(e) => handlePOStatusChange(po.id, e.target.value)}
                                                    className={`text-[12px] px-2 py-0.5 rounded border-none focus:ring-0 cursor-pointer font-light tracking-wide ${po.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-700' : po.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="PENDING">PENDING</option>
                                                    <option value="IN_PROGRESS">ACTIVE</option>
                                                    <option value="COMPLETED">DONE</option>
                                                </select>
                                                {canEditPO && (
                                                    <button id="tour-edit-po" onClick={(e) => { e.stopPropagation(); openModal('EDIT_PO', po); }} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-[#008069] transition-all duration-200">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="animate-in fade-in slide-in-from-top-1 duration-200 px-2 divide-y-2 divide-gray-100 bg-gray-100/30">
                                                {poChannels.map((ch, idx) => (
                                                    <div
                                                        key={ch.id}
                                                        id={idx === 0 ? "tour-group-item" : undefined}
                                                        onClick={() => {
                                                            onSelectChannel(ch, po);
                                                            api.markChannelAsRead(currentUser, ch.id);
                                                            queryClient.invalidateQueries({ queryKey: ['channels'] });
                                                        }}
                                                        style={{ animationDelay: `${idx * 100}ms` }}
                                                        className={`px-5 py-4 rounded cursor-pointer flex items-center relative group transition-all duration-300 animate-slide-in hover:bg-gray-200 hover:shadow-sm ${selectedChannelId === ch.id ? 'bg-white shadow-inner' : ''}`}
                                                    >
                                                        {(ch.last_activity_at && ch.last_read_at && new Date(ch.last_activity_at) > new Date(ch.last_read_at)) && <div className="absolute left-3 w-2.5 h-2.5 bg-[#00a884] rounded-full shadow-md animate-pulse"></div>}
                                                        <div className="flex-1 ml-4">
                                                            <div className="flex justify-between items-center gap-3">
                                                                <span className={`text-[16px] truncate transition-colors ${ch.last_activity_at && ch.last_read_at && new Date(ch.last_activity_at) > new Date(ch.last_read_at) ? 'font-black text-gray-900' : 'font-regular text-gray-600 group-hover:text-gray-900'}`}>{ch.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[12px] font-light px-2 py-0.5 rounded-md uppercase tracking-tighter shadow-sm ${ch.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : (ch.status === 'IN_PROGRESS' || ch.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700')}`}>{ch.status}</span>
                                                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-[#008069] transition-all duration-300 transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {!isCompleted && canCreateChannel && (
                                                    <div className="px-4 py-2 rounded border-t border-gray-50">
                                                        <button onClick={() => openModal('ADD_CHANNEL', { poId: po.id })} className="w-full py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1.5 transition-all">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>Add Group
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
                ) : (
                    <div className="pb-2 px-2 space-y-2 pt-.5">
                        {partners.filter(p => p.name.toLowerCase().includes(globalSearchQuery.toLowerCase())).length === 0 && <div className="p-4 text-center text-gray-400 text-sm">No matching {getPartnerLabel().toLowerCase()} found.</div>}
                        {partners.filter(p => p.name.toLowerCase().includes(globalSearchQuery.toLowerCase())).map(partner => (
                            <div key={partner.id} className="rounded-xl border border-gray-400 overflow-hidden bg-white shadow-sm">
                                <div className="px-4 py-2 bg-gray-300/500 font-bold text-[12px] text-gray-500 uppercase tracking-widest border-b border-gray-400">{partner.name}</div>
                                {allChannels.filter(c => (isVendor && pos.find(p => p.id === c.po_id)?.manufacturer_id === partner.id && c.vendor_id === currentUser.company_id) || (!isVendor && c.vendor_id === partner.id && pos.find(p => p.id === c.po_id)?.manufacturer_id === currentUser.company_id)).map(ch => {
                                    const parentPO = pos.find(p => p.id === ch.po_id);
                                    if (!parentPO) return null;
                                    return (
                                        <div key={ch.id} onClick={() => { onSelectChannel(ch, parentPO); api.markChannelAsRead(currentUser, ch.id); queryClient.invalidateQueries({ queryKey: ['channels'] }); }} className={`px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] flex items-center relative group border-b border-gray-50 last:border-b-0 ${selectedChannelId === ch.id ? 'bg-[#f0f2f5]' : ''}`}>
                                            {(ch.last_activity_at && ch.last_read_at && new Date(ch.last_activity_at) > new Date(ch.last_read_at)) && <div className="absolute left-3 w-2.5 h-2.5 bg-[#00a884] rounded-full shadow-sm"></div>}
                                            <div className="flex-1 ml-6">
                                                <div className="flex justify-between items-center gap-1">
                                                    <span className={`text-[16px] truncate ${ch.last_activity_at && ch.last_read_at && new Date(ch.last_activity_at) > new Date(ch.last_read_at) ? 'font-bold text-gray-900' : 'font-regular text-gray-700'}`}>{ch.name} ({parentPO.order_number})</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[10px] font-light px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${ch.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : (ch.status === 'IN_PROGRESS' || ch.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700')}`}>{ch.status}</span>
                                                        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center relative">
                <div className="relative">
                    <button id="tour-settings-btn" onClick={() => setShowSettings(!showSettings)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg border border-gray-300 bg-white shadow-sm" title="Settings">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                    {showSettings && (
                        <div className="absolute bottom-12 left-0 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20 overflow-hidden">
                            {installPrompt ? (
                                <button onClick={onInstallApp} className="w-full text-left px-4 py-3 hover:bg-green-50 text-sm text-[#008069] font-bold border-b border-gray-100">📲 Install App</button>
                            ) : (isIOS || isAndroid) ? (
                                <button onClick={() => openModal('HOW_TO_INSTALL')} className="w-full text-left px-4 py-3 hover:bg-green-50 text-sm text-[#008069] font-bold border-b border-gray-100">📲 How to Install</button>
                            ) : null}
                            <button onClick={() => { setShowSettings(false); onTakeTour?.(); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm text-blue-600 font-bold border-b border-gray-100 italic">🚀 Take Tour</button>
                            {notificationPermission !== 'granted' ? (
                                <button
                                    onClick={requestNotificationPermission}
                                    className={`w-full text-left px-4 py-3 hover:bg-orange-50 text-sm font-bold border-b border-gray-100 ${notificationPermission === 'denied' ? 'text-orange-600' : 'text-blue-600'}`}
                                >
                                    {notificationPermission === 'denied' ? '⚠️ Notifications Blocked' : '🔔 Enable Notifications'}
                                </button>
                            ) : (
                                <button
                                    onClick={async () => {
                                        if ('serviceWorker' in navigator) {
                                            const registration = await navigator.serviceWorker.ready;
                                            registration.showNotification("Kramiz (Beta) Test", {
                                                body: "Notifications are working on this device! ✅",
                                                icon: '/Kramiz%20app%20icon.png',
                                                badge: '/favicon.png'
                                            } as any);
                                        }
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-green-50 text-sm text-[#008069] font-bold border-b border-gray-100"
                                >
                                    ✅ Test Notification
                                </button>
                            )}
                            {notificationPermission === 'denied' && (
                                <div className="px-4 py-2 bg-orange-50 text-[10px] text-orange-700 leading-tight border-b border-gray-100 italic">
                                    Click the 🔒 lock icon in your browser address bar to reset permissions.
                                </div>
                            )}
                            {canManageSuppliers && <button id="tour-suppliers-btn" onClick={() => openModal('SUPPLIERS')} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-gray-700 border-b border-gray-100">📋 List of Suppliers</button>}
                            <button id="tour-team-btn" onClick={() => openModal('TEAM')} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-gray-700 border-b border-gray-100">👥 Team Members</button>
                            {currentUser.role === 'ADMIN' && (
                                <button id="tour-edit-company-btn" onClick={() => openModal('EDIT_COMPANY')} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-gray-700 border-b border-gray-100">🏢 Edit Company Name</button>
                            )}
                            <button onClick={() => openModal('CHANGE_PASSCODE')} className="w-full text-left px-4 py-3 hover:bg-gray-100 text-sm text-gray-700 border-b border-gray-100">🔐 Change Passcode</button>
                            {currentUser.role === 'ADMIN' && (
                                <button onClick={() => openModal('DELETE_ORGANIZATION')} className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-500 font-bold border-b border-gray-100 italic">🗑️ Delete Account / WIPEOUT Data</button>
                            )}
                            <button onClick={onLogout} className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm text-red-600 font-bold">🚪 Logout</button>
                        </div>
                    )}
                </div>
                {canCreatePO && (
                    <button id="tour-create-po" onClick={() => openModal('NEW_PO')} className="h-10 w-10 flex items-center justify-center text-white bg-[#008069] hover:bg-[#006a57] rounded-full shadow-lg transition-transform hover:scale-105" title="Create New Order">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                )}
            </div>

            {/* Modals */}
            <Modal isOpen={modalState.type === 'NEW_PO'} onClose={closeModal} title="Create New Order" footer={<button onClick={handleCreatePO} disabled={createPOMutation.isPending} className="bg-[#008069] text-white px-6 py-2 rounded text-sm font-bold shadow-md hover:bg-[#006a57] disabled:bg-gray-300">{createPOMutation.isPending ? 'Creating...' : 'Create Order'}</button>}>
                <div id="tour-create-po" className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Order Name/Number</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" placeholder="e.g. ORD-2024..." value={newPOData.orderNo} onChange={e => setNewPOData({ ...newPOData, orderNo: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Style Type</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" placeholder="e.g. T-Shirt..." value={newPOData.styleNo} onChange={e => setNewPOData({ ...newPOData, styleNo: e.target.value })} /></div>
                </div>
            </Modal>
            <Modal isOpen={modalState.type === 'ADD_CHANNEL'} onClose={closeModal} title="Add Supplier Group" footer={<button onClick={handleCreateChannel} disabled={createChannelMutation.isPending} className="bg-[#008069] text-white px-6 py-2 rounded text-sm font-bold shadow-md hover:bg-[#006a57] disabled:bg-gray-300">{createChannelMutation.isPending ? 'Adding...' : 'Add Group'}</button>}>
                <div className="space-y-4 pb-16">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Group Name</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" placeholder="e.g. Knitting..." value={newChannelData.name} onChange={e => setNewChannelData({ ...newChannelData, name: e.target.value })} /></div>
                    <div className="relative">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-tight mb-1">Assign Supplier</label>
                        <div className="relative" ref={supplierComboboxRef}>
                            <input type="text" className="w-full border rounded px-3 py-2 pr-8 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" placeholder="Search supplier..." value={supplierSearchQuery || vendorsList.find(v => v.id === newChannelData.vendorId)?.name || ''} onChange={(e) => { setSupplierSearchQuery(e.target.value); setIsSupplierDropdownOpen(true); if (!e.target.value) setNewChannelData({ ...newChannelData, vendorId: '' }); }} onFocus={() => setIsSupplierDropdownOpen(true)} />
                            {isSupplierDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                                    {vendorsList.filter(v => v.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) || ((v as any).adminPhone || '').includes(supplierSearchQuery)).map(v => (
                                        <div key={v.id} className={`px-3 py-2 text-m cursor-pointer hover:bg-gray-100 ${newChannelData.vendorId === v.id ? 'bg-[#008069]/10 text-[#008069] font-medium' : 'text-gray-700'}`} onClick={() => { setNewChannelData({ ...newChannelData, vendorId: v.id }); setSupplierSearchQuery(''); setIsSupplierDropdownOpen(false); }}>
                                            <div className="flex flex-col"><span className="font-semibold">{v.name}</span><span className="text-[12px] text-gray-500">Admin: {(v as any).adminName} • {(v as any).adminPhone}</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={modalState.type === 'SUPPLIERS'} onClose={closeModal} title="Registered Suppliers">
                <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
                    <h4 className="text-xs font-bold uppercase text-[#008069] mb-3">Add New Supplier</h4>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3"><input type="text" placeholder="Company Name" className="w-full text-sm px-3 py-2 rounded border border-gray-300 text-gray-900 focus:outline-none focus:border-[#008069]" value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} /><input type="text" placeholder="Admin Name" className="w-full text-sm px-3 py-2 rounded border border-gray-300 text-gray-900 focus:outline-none focus:border-[#008069]" value={newVendor.adminName} onChange={e => setNewVendor({ ...newVendor, adminName: e.target.value })} /></div>
                        <input type="text" placeholder="Phone (10 digits)" className="w-full text-sm px-3 py-2 rounded border border-gray-300 text-gray-900 focus:outline-none focus:border-[#008069]" value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} />
                        <button onClick={handleAddVendor} disabled={addVendorMutation.isPending} className="w-full bg-[#008069] hover:bg-[#006a57] text-white text-sm font-bold py-2 rounded shadow-sm disabled:bg-gray-300">{addVendorMutation.isPending ? 'Adding...' : '+ Add Supplier'}</button>
                    </div>
                </div>
                {inviteLink && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-2"><span className="text-sm font-bold text-green-800">Supplier Created!</span></div>
                        <p className="text-xs text-green-700 mb-3">Share login details via WhatsApp:</p>
                        <a href={inviteLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-bold py-2 rounded shadow-sm">Share on WhatsApp</a>
                        <button onClick={() => setInviteLink(null)} className="w-full mt-2 text-[10px] text-gray-400 hover:text-gray-600 uppercase font-bold tracking-wider">Dismiss</button>
                    </div>
                )}
                <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
                    {vendorsList.filter(v => v.name.toLowerCase().includes(vendorsSearchQuery.toLowerCase())).map(v => (
                        <li key={v.id} className="py-3 flex justify-between items-center group gap-3">
                            <div className="flex flex-col min-w-0"><span className="font-semibold text-sm text-gray-800 truncate">{v.name}</span><span className="text-[12px] text-gray-500 truncate">Admin: {(v as any).adminName} • {(v as any).adminPhone}</span></div>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded shrink-0">Supplier</span>
                        </li>
                    ))}
                </ul>
            </Modal>
            <Modal isOpen={modalState.type === 'TEAM'} onClose={closeModal} title="My Team">
                {currentUser.role === 'ADMIN' && (
                    <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
                        <h4 className="text-xs font-bold uppercase text-[#008069] mb-3">Invite Member</h4>
                        <div className="space-y-3">
                            <input type="text" placeholder="Full Name" className="w-full text-sm px-3 py-2 rounded border border-gray-300 text-gray-900 focus:outline-none focus:border-[#008069]" value={newTeamMember.name} onChange={e => setNewTeamMember({ ...newTeamMember, name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3"><input type="tel" placeholder="Phone" maxLength={10} className="w-full text-sm px-3 py-2 rounded border border-gray-300 text-gray-900 focus:outline-none focus:border-[#008069]" value={newTeamMember.phone} onChange={e => setNewTeamMember({ ...newTeamMember, phone: e.target.value.replace(/\D/g, '') })} /><input type="password" placeholder="Passcode" maxLength={4} className="w-full text-sm px-3 py-2 rounded border border-gray-300 text-gray-900 focus:outline-none focus:border-[#008069] text-center tracking-wider" value={newTeamMember.passcode} onChange={e => setNewTeamMember({ ...newTeamMember, passcode: e.target.value.replace(/\D/g, '') })} /></div>
                            <select id="tour-role-dropdown" className="w-full text-sm px-3 py-2 rounded border border-gray-300 text-gray-900 focus:outline-none focus:border-[#008069]" value={newTeamMember.role} onChange={e => setNewTeamMember({ ...newTeamMember, role: e.target.value as any })}><option value="JUNIOR_MERCHANDISER">Junior Merchandiser</option><option value="SENIOR_MERCHANDISER">Senior Merchandiser</option><option value="JUNIOR_MANAGER">Junior Manager</option><option value="SENIOR_MANAGER">Senior Manager</option><option value="ADMIN">Admin</option></select>
                            <button onClick={handleAddTeamMember} disabled={addTeamMemberMutation.isPending} className="w-full bg-[#008069] hover:bg-[#006a57] text-white text-sm font-bold py-2 rounded shadow-sm disabled:bg-gray-300">{addTeamMemberMutation.isPending ? 'Sending...' : '+ Send Invite'}</button>
                        </div>
                    </div>
                )}
                {inviteLink && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-2"><span className="text-sm font-bold text-green-800">Member Added!</span></div>
                        <p className="text-xs text-green-700 mb-3">Share login details with the team member:</p>
                        <a href={inviteLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-bold py-2 rounded shadow-sm">Share on WhatsApp</a>
                        <button onClick={() => setInviteLink(null)} className="w-full mt-2 text-[10px] text-gray-400 hover:text-gray-600 uppercase font-bold tracking-wider">Dismiss</button>
                    </div>
                )}
                <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                    {teamList.map(u => (
                        <li key={u.id} className="py-3 flex justify-between items-center gap-3">
                            <div className="flex flex-col min-w-0">
                                <span className="font-medium text-sm text-gray-800 truncate">{u.name}{u.id === currentUser.id && ' (You)'}</span>
                                <span className="text-xs text-gray-500 truncate">{u.phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded shrink-0">{u.role.replace('_', ' ')}</span>
                                {currentUser.role === 'ADMIN' && u.id !== currentUser.id && (
                                    <button
                                        onClick={async () => {
                                            if (confirm(`Are you sure you want to remove ${u.name}?`)) {
                                                try {
                                                    await api.deleteTeamMember(currentUser, u.id);
                                                    setTeamList(await api.getTeamMembers(currentUser));
                                                } catch (err: any) {
                                                    alert(err.message);
                                                }
                                            }
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Remove Member"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </Modal>
            <Modal isOpen={modalState.type === 'EDIT_PO'} onClose={closeModal} title="Edit Order Details" footer={<div className="flex gap-3 justify-stretch">{canDeletePO && <button onClick={() => { closeModal(); openModal('DELETE_PO', modalState.data); }} disabled={isProcessing} className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50">Delete Order</button>}<button onClick={handleEditPO} disabled={isProcessing} className="bg-[#008069] text-white px-6 py-2 rounded text-sm font-bold shadow-md hover:bg-[#006a57] disabled:bg-gray-300">{isProcessing ? 'Saving...' : 'Save Changes'}</button></div>}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Order #</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editPOData.orderNo} onChange={e => setEditPOData({ ...editPOData, orderNo: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Style</label><input type="text" className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editPOData.styleNo} onChange={e => setEditPOData({ ...editPOData, styleNo: e.target.value })} /></div>
                    <div><label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-tight">Status</label><select className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069]" value={editPOData.status} onChange={e => setEditPOData({ ...editPOData, status: e.target.value })}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select></div>
                </div>
            </Modal>
            <Modal isOpen={modalState.type === 'DELETE_PO'} onClose={closeModal} title="Delete Order" footer={<div className="flex gap-3 justify-end"><button onClick={closeModal} disabled={isProcessing} className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Cancel</button><button onClick={handleDeletePO} disabled={isProcessing} className="px-6 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-md disabled:bg-red-400">{isProcessing ? 'Deleting...' : 'Delete'}</button></div>}><div className="space-y-3"><p className="text-sm text-gray-700">Are you sure you want to delete <strong>{modalState.data?.order_number}</strong>?</p><div className="bg-red-50 border border-red-200 rounded p-3"><p className="text-sm text-red-800 font-medium">⚠️ Warning</p><p className="text-xs text-red-700 mt-1">Permanently delete everything? This cannot be undone.</p></div></div></Modal>
            <Modal isOpen={modalState.type === 'CHANGE_PASSCODE'} onClose={closeModal} title="Change Passcode" footer={<button onClick={handleUpdatePasscode} className="bg-[#008069] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#006a57]">Update Passcode</button>}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Passcode</label><input type="password" maxLength={4} className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069] tracking-widest font-black" placeholder="****" value={passcodeData.oldPasscode} onChange={e => setPasscodeData({ ...passcodeData, oldPasscode: e.target.value.replace(/\D/g, '') })} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">New Passcode</label><input type="password" maxLength={4} className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069] tracking-widest font-black" placeholder="****" value={passcodeData.newPasscode} onChange={e => setPasscodeData({ ...passcodeData, newPasscode: e.target.value.replace(/\D/g, '') })} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm New</label><input type="password" maxLength={4} className="w-full border rounded px-3 py-2 text-sm bg-white border-gray-300 focus:outline-none focus:border-[#008069] tracking-widest font-black" placeholder="****" value={passcodeData.confirmPasscode} onChange={e => setPasscodeData({ ...passcodeData, confirmPasscode: e.target.value.replace(/\D/g, '') })} /></div>
                </div>
            </Modal>
            <Modal isOpen={modalState.type === 'EDIT_COMPANY'} onClose={closeModal} title="Edit Company Name" footer={<button onClick={handleUpdateCompanyName} disabled={!editCompanyName.trim() || updateCompanyMutation.isPending} className="bg-[#008069] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#006a57] disabled:bg-gray-300">{updateCompanyMutation.isPending ? 'Saving...' : 'Save Changes'}</button>}>
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
                        <p className="text-[10px] text-gray-400 mt-2">This change will be reflected across all vendor invites and workspace headers.</p>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={modalState.type === 'HOW_TO_INSTALL'} onClose={closeModal} title={`Install on ${isIOS ? 'iPhone / iPad' : 'Android'}`}>
                <div className="space-y-6 py-2">
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">To use Kramiz (Beta) as a mobile app, follow these simple steps:</p>
                    <div className="space-y-4">
                        {isIOS ? (
                            <>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black flex-shrink-0">1</div>
                                    <p className="text-sm text-gray-800">Tap the <strong className="text-blue-600">Share</strong> icon at the bottom (square with arrow).</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black flex-shrink-0">2</div>
                                    <p className="text-sm text-gray-800">Scroll down and tap <strong className="text-gray-900">Add to Home Screen</strong>.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black flex-shrink-0">1</div>
                                    <p className="text-sm text-gray-800">Tap the <strong className="text-gray-900">3-dots (⋮)</strong> or <strong className="text-gray-900">Menu (≡)</strong> icon in your browser.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black flex-shrink-0">2</div>
                                    <p className="text-sm text-gray-800">Select <strong className="text-[#008069]">Install App</strong> or <strong className="text-gray-900">Add to Home screen</strong>.</p>
                                </div>
                            </>
                        )}
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black flex-shrink-0">3</div>
                            <p className="text-sm text-gray-800">Tap <strong className="text-[#008069]">Add</strong> or <strong className="text-[#008069]">Install</strong> to finish.</p>
                        </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100 mt-4">
                        <p className="text-xs text-[#008069] font-bold leading-relaxed">✨ Once added, Kramiz (Beta) will work just like a native app on your phone!</p>
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
                        disabled={deleteConfirmText !== userCompany?.name}
                        className="w-full bg-red-600 text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-red-700 disabled:bg-gray-300 transition-colors shadow-lg"
                    >
                        Permanently Delete Everything
                    </button>
                }
            >
                <div className="space-y-6 py-2">
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-sm text-red-700 font-bold leading-relaxed mb-2">CRITICAL WARNING:</p>
                        <p className="text-xs text-red-600 leading-relaxed">
                            This action will wipe out all data related to **{userCompany?.name}**.
                            This includes all purchase orders, groups, team members, suppliers,
                            chat history, and tech specs.
                        </p>
                        <p className="text-[10px] text-red-500 font-black mt-3 uppercase tracking-widest">
                            THIS ACTION CANNOT BE REVERSED.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-bold text-gray-700">Type <span className="text-red-600">"{userCompany?.name}"</span> to confirm:</p>
                        <input
                            type="text"
                            autoFocus
                            className="w-full border-2 border-red-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
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
