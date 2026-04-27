import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { User, Channel, Company, Order, hasPermission } from '../types';
import { api } from '../supabaseAPI';

export const useSidebar = (currentUser: User, selectedGroupId?: string) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
    const [sidebarView, setSidebarView] = useState<'ORDER' | 'PARTNER'>('ORDER');
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [userCompany, setUserCompany] = useState<Company | null>(null);
    const [modalState, setModalState] = useState<{
        type: 'NONE' | 'NEW_ORDER' | 'NEW_GROUP' | 'EDIT_ORDER' | 'DELETE_ORDER' | 'UPDATE_PASSCODE' | 'EDIT_COMPANY' | 'DELETE_ORGANIZATION' | 'HOW_TO_INSTALL';
        data?: any;
    }>({ type: 'NONE' });

    // Form States
    const [newOrderData, setNewOrderData] = useState({ orderNo: '', styleNo: '', selectedTeamMembers: [] as string[] });
    const [editOrderData, setEditOrderData] = useState({ orderNo: '', styleNo: '', status: 'PENDING' });
    const [passcodeData, setPasscodeData] = useState({ oldPasscode: '', newPasscode: '', confirmPasscode: '' });
    const [editCompanyName, setEditCompanyName] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const prevSelectedId = useRef<string | undefined>(selectedGroupId);

    // Queries
    const { data: orders = [], isLoading: loadingOrders } = useQuery({
        queryKey: ['orders', currentUser.id],
        queryFn: () => api.getOrders(currentUser),
    });

    const { data: allChannels = [], isLoading: loadingChannels } = useQuery({
        queryKey: ['channels', currentUser.id],
        queryFn: () => api.getAllChannels(currentUser),
    });

    const loading = loadingOrders || loadingChannels;

    // Derived Data
    const channelsMap = useMemo(() => {
        const map: Record<string, Channel[]> = {};
        allChannels.forEach(ch => {
            if (!map[ch.order_id]) map[ch.order_id] = [];
            map[ch.order_id].push(ch);
        });
        Object.keys(map).forEach(orderId => {
            map[orderId].sort((a, b) => {
                if (a.due_date && b.due_date) {
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                }
                if (a.due_date) return -1;
                if (b.due_date) return 1;
                
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });
        });
        return map;
    }, [allChannels]);

    // Permissions
    const canCreateOrder = hasPermission(currentUser.role, 'CREATE_ORDER');
    const canEditOrder   = hasPermission(currentUser.role, 'EDIT_ORDER');
    const canDeleteOrder = hasPermission(currentUser.role, 'DELETE_ORDER');
    const canCreateGroup = hasPermission(currentUser.role, 'CREATE_CHANNEL');

    useEffect(() => {
        const loadCompany = async () => {
            const company = await api.getCompany(currentUser.company_id);
            setUserCompany(company);
        };
        loadCompany();
    }, [currentUser.company_id]);

    useEffect(() => {
        setActiveTab('ALL');
    }, []);

    useEffect(() => {
        if (!selectedGroupId && prevSelectedId.current) {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        }
        prevSelectedId.current = selectedGroupId;
    }, [selectedGroupId, queryClient]);

    // Mutations
    const handleRefresh = () => {
        queryClient.invalidateQueries();
    };

    const createOrderMutation = useMutation({
        mutationFn: (data: { orderNo: string; styleNo: string; selectedTeamMembers: string[] }) =>
            api.createOrder(currentUser, data.orderNo, data.styleNo, data.selectedTeamMembers),
        onSuccess: () => {
            closeModal();
            handleRefresh();
            setNewOrderData({ orderNo: '', styleNo: '', selectedTeamMembers: [] });
        }
    });

    const handleCreateOrder = async () => {
        if (!newOrderData.orderNo || !newOrderData.styleNo) return;
        createOrderMutation.mutate(newOrderData);
    };

    const handleOrderStatusChange = async (orderId: string, newStatus: any) => {
        try {
            await api.updateOrderStatus(orderId, newStatus);
            handleRefresh();
        } catch (err: any) { alert(err.message || "Failed to update status"); }
    };

    const handleEditOrder = async () => {
        if (!modalState.data?.id) return;
        setIsProcessing(true);
        try {
            await api.updateOrder(currentUser, modalState.data.id, {
                order_number: editOrderData.orderNo,
                style_number: editOrderData.styleNo,
                status: editOrderData.status as any
            });
            closeModal();
            handleRefresh();
        } catch (err: any) { alert(err.message || "Failed to update Order"); }
        finally { setIsProcessing(false); }
    };

    const handleDeleteOrder = async () => {
        if (!modalState.data?.id) return;
        setIsProcessing(true);
        try {
            await api.deleteOrder(currentUser, modalState.data.id);
            closeModal();
            handleRefresh();
        } catch (err: any) { alert(err.message || "Failed to delete Order"); }
        finally { setIsProcessing(false); }
    };

    const handleUpdatePasscode = async () => {
        if (passcodeData.newPasscode !== passcodeData.confirmPasscode) {
            alert("New passcodes do not match");
            return;
        }
        setIsProcessing(true);
        try {
            await api.updatePasscode(currentUser.id, passcodeData.oldPasscode, passcodeData.newPasscode);
            alert("Passcode updated successfully!");
            closeModal();
        } catch (err: any) { alert(err.message); }
        finally { setIsProcessing(false); }
    };

    const handleUpdateCompanyName = async () => {
        if (!userCompany?.id || !editCompanyName.trim()) return;
        setIsProcessing(true);
        try {
            await api.updateCompanyName(userCompany.id, editCompanyName);
            queryClient.invalidateQueries({ queryKey: ['company', userCompany.id] });
            alert("Company name updated!");
            closeModal();
        } catch (err: any) { alert(err.message); }
        finally { setIsProcessing(false); }
    };

    const handleDeleteOrganization = async () => {
        if (!userCompany?.id || deleteConfirmText !== userCompany.name) return;
        if (!confirm(`Are you absolutely sure? This will delete all orders, chats, and members for ${userCompany.name}.`)) return;
        
        setIsProcessing(true);
        try {
            await api.deleteOrganization(currentUser, userCompany.id);
            alert("Organization deleted.");
            navigate('/login');
        } catch (err: any) { alert(err.message); }
        finally { setIsProcessing(false); }
    };

    const openModal = async (type: typeof modalState.type, data?: any) => {
        setModalState({ type, data });
        if (type === 'EDIT_ORDER' && data) {
            setEditOrderData({ orderNo: data.order_number, styleNo: data.style_number, status: data.status });
        }
        if (type === 'UPDATE_PASSCODE') {
            setPasscodeData({ oldPasscode: '', newPasscode: '', confirmPasscode: '' });
        }
        if (type === 'EDIT_COMPANY') {
            setEditCompanyName(userCompany?.name || '');
        }
        if (type === 'DELETE_ORGANIZATION') {
            setDeleteConfirmText('');
        }
    };

    const closeModal = () => setModalState({ type: 'NONE' });

    const toggleOrder = (id: string) => {
        setExpandedOrders(prev => {
            const isExpanding = !prev[id];
            if (isExpanding && currentUser.role === 'ADMIN' && (!channelsMap[id] || channelsMap[id].length === 0)) {
                // Background repair if no channels found for an order an admin sees
                api.repairOrderOverview(currentUser, id).then(() => handleRefresh());
            }
            return { ...prev, [id]: isExpanding };
        });
    };

    const isOverdue = (date: string | undefined) => {
        if (!date) return false;
        const d = new Date(date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d < now;
    };

    const isDueSoon = (date: string | undefined) => {
        if (!date) return false;
        const d = new Date(date);
        const now = new Date();
        const weekAway = new Date();
        weekAway.setDate(now.getDate() + 7);
        
        now.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        weekAway.setHours(23, 59, 59, 999);

        return d <= weekAway; // Red if overdue OR due within 7 days
    };

    return {
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
        queryClient,
        navigate,
        sidebarView, setSidebarView,
        passcodeData, setPasscodeData,
        editCompanyName, setEditCompanyName,
        deleteConfirmText, setDeleteConfirmText
    };
};
