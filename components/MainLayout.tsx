
import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { User, Channel, Order, Company } from '../types';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../supabaseAPI';
import { findGroupByIdOrSlug, generateSlug } from '../routeUtils';
import { FloatingActionButton } from './FloatingActionButton';

interface MainLayoutProps {
    user: User;
    handleLogout: () => void;
    deferredPrompt: any;
    setDeferredPrompt: (p: any) => void;
    setRunTour: (b: boolean) => void;
    runTour: boolean;
    isSettings?: boolean;
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    user,
    handleLogout,
    deferredPrompt,
    setDeferredPrompt,
    setRunTour,
    runTour,
    isSettings,
    children
}) => {
    const navigate = useNavigate();
    const { groupId } = useParams();
    const location = useLocation();
    const queryClient = useQueryClient();

    // Fetch user's company company for slug generation
    const { data: userCompany } = useQuery({
        queryKey: ['company', user.company_id],
        queryFn: () => api.getCompany(user.company_id),
        enabled: !!user.company_id
    });

    const { data: allChannels = [] } = useQuery({
        queryKey: ['channels', user.id],
        queryFn: () => api.getAllChannels(user),
    });

    const { data: orders = [] } = useQuery({
        queryKey: ['orders', user.id],
        queryFn: () => api.getOrders(user),
    });

    const selectedChannel = findGroupByIdOrSlug(groupId, allChannels, orders, userCompany || undefined);
    const selectedOrder = selectedChannel ? orders.find(p => p.id === selectedChannel.order_id) || null : null;

    const isDashboard = location.pathname.startsWith('/dashboard');
    const isChats = location.pathname.startsWith('/group') || location.pathname === '/chats' || location.pathname === '/';
    const isSettingsTab = location.pathname.startsWith('/settings');
    const isInsideChat = location.pathname.includes('/group/');

    const onSelectChannel = (c: Channel, p: Order) => {
        const slug = generateSlug(c, p, userCompany || undefined);
        navigate(`/group/${slug}`);
    };

    const NavItem = ({ icon, label, isActive, onClick, desktop }: { icon: any, label: string, isActive: boolean, onClick: () => void, desktop?: boolean }) => {
        if (desktop) {
            return (
                <button 
                    onClick={onClick}
                    title={label}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all mb-4 group relative
                        ${isActive ? 'bg-[#008069] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                >
                    <div className="transition-transform duration-200 group-hover:scale-110">
                        {icon}
                    </div>
                    {isActive && <div className="absolute -left-3 w-1.5 h-6 bg-[#008069] rounded-r-full"></div>}
                </button>
            );
        }
        return (
            <button 
                onClick={onClick}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative
                    ${isActive ? 'text-[#008069]' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
                    {icon}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>{label}</span>
                {isActive && <div className="absolute top-0 w-8 h-1 bg-[#008069] rounded-b-full"></div>}
            </button>
        );
    };

    const icons = {
        chats: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
        dashboard: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
        settings: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    };

    return (
        <div className="h-screen flex bg-white overflow-hidden">
            
            {/* Desktop Left Rail Navigation */}
            <div className="hidden md:flex flex-col items-center py-6 w-20 border-r border-gray-200 bg-white z-50">
                <div className="mb-10">
                    <img src="/Kramiz%20app%20icon.png" alt="K" className="w-10 h-10 object-contain shadow-sm rounded-xl" />
                </div>
                
                <NavItem icon={icons.chats}     label="Chats"     isActive={isChats}     onClick={() => navigate('/chats')} desktop />
                <NavItem icon={icons.dashboard} label="Dashboard" isActive={isDashboard} onClick={() => navigate('/dashboard')} desktop />
                <NavItem icon={icons.settings}  label="Settings"  isActive={isSettingsTab || isSettings}  onClick={() => navigate('/settings')} desktop />
                
                <div className="mt-auto flex flex-col gap-4">
                    <button onClick={handleLogout} className="p-3 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-[#e7f3f1] text-[#008069] flex items-center justify-center font-bold text-sm shadow-inner uppercase">
                        {user.name.charAt(0)}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full relative">
                {/* Mobile Bottom Navigation */}
                {!isInsideChat && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-[100] px-2 safe-pb">
                        <div className="flex h-full items-center">
                            <NavItem icon={icons.chats}     label="Chats"     isActive={isChats}     onClick={() => navigate('/chats')} />
                            <NavItem icon={icons.dashboard} label="Dashboard" isActive={isDashboard} onClick={() => navigate('/dashboard')} />
                            <NavItem icon={icons.settings}  label="Settings"  isActive={isSettingsTab || isSettings}  onClick={() => navigate('/settings')} />
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className={`flex-1 flex flex-col md:flex-row h-full w-full relative ${!isInsideChat ? 'pb-16 md:pb-0' : ''}`}>
                    
                    {/* Sidebar: Chats List */}
                    <div className={`
                        ${isChats ? (groupId ? 'hidden md:block md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96') : 'hidden'}
                        h-full border-r border-gray-200 bg-white
                    `}>
                        <Sidebar
                            currentUser={user}
                            selectedGroupId={groupId}
                            onSelectGroup={onSelectChannel}
                            onLogout={handleLogout}
                            installPrompt={deferredPrompt}
                            onInstallApp={() => {
                                if (deferredPrompt) {
                                    deferredPrompt.prompt();
                                    deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
                                }
                            }}
                            onTakeTour={() => setRunTour(true)}
                            isTourActive={runTour}
                        />
                    </div>

                    {/* Main View Area */}
                    <div className={`flex-1 h-full relative ${isChats && !groupId ? 'hidden md:flex' : 'flex'} ${isSettings ? 'w-full' : ''}`}>
                        {children}
                    </div>
                </div>
            </div>

            <FloatingActionButton currentUser={user} visible={isDashboard} />
        </div>
    );
};
