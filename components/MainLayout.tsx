
import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { User, Channel, PurchaseOrder, Company } from '../types';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../supabaseAPI';

interface MainLayoutProps {
    user: User;
    handleLogout: () => void;
    deferredPrompt: any;
    setDeferredPrompt: (p: any) => void;
    setRunTour: (b: boolean) => void;
    runTour: boolean;
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    user,
    handleLogout,
    deferredPrompt,
    setDeferredPrompt,
    setRunTour,
    runTour,
    children
}) => {
    const navigate = useNavigate();
    const { groupId } = useParams();
    const queryClient = useQueryClient();

    // Fetch user's company company for slug generation
    const { data: userCompany } = useQuery({
        queryKey: ['company', user.company_id],
        queryFn: () => api.getCompany(user.company_id),
        enabled: !!user.company_id
    });

    // Fetch all channels to find the current one and its PO
    const { data: allChannels = [] } = useQuery({
        queryKey: ['channels', user.id],
        queryFn: () => api.getAllChannels(user),
    });

    const { data: pos = [] } = useQuery({
        queryKey: ['pos', user.id],
        queryFn: () => api.getPOs(user),
    });

    const selectedChannel = allChannels.find(c => c.id === groupId);
    const selectedPO = selectedChannel ? pos.find(p => p.id === selectedChannel.po_id) : null;

    const onSelectChannel = (c: Channel, p: PurchaseOrder) => {
        navigate(`/group/${c.id}`);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#f0f2f5]">
            {/* Sidebar Area: Visible on mobile if no groupId in URL, always visible on Desktop */}
            <div className={`${groupId ? 'hidden md:block' : 'w-full'} md:w-auto h-full`}>
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

            {/* Content Area (Chat or Welcome) */}
            <div className={`flex-1 h-full relative ${!groupId ? 'hidden md:flex' : 'flex'}`}>
                {children}
            </div>
        </div>
    );
};
