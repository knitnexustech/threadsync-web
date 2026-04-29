
import React, { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Login } from './components/Login';
import { api } from './supabaseAPI';
import { LandingPage } from './components/LandingPage';
import { Signup } from './components/Signup';
import { ProductTour } from './components/ProductTour';
import { User, Message } from './types';
import { saveSession, loadSession, clearSession } from './sessionUtils';
import { supabase } from './supabaseClient';
import { playNotificationSound, triggerVibration } from './notificationUtils';
import { MainLayout } from './components/MainLayout';
import { ChatRoom } from './components/ChatRoom';
import WelcomeView from './components/WelcomeView';
import { findGroupByIdOrSlug } from './routeUtils';
import { initializeNativePlugins, isNative, scheduleLocalNotification } from './capacitorUtils';

import { DashboardView } from './components/DashboardView';
import { useLocation } from 'react-router-dom';
import { SettingsPage } from './components/SettingsPage';
import { useOnboarding } from './hooks/useOnboarding';
import { useGlobalNotifications } from './hooks/useGlobalNotifications';
import { useAppSync } from './hooks/useAppSync';
import { KramizSharePopup } from './components/KramizSharePopup';

import { Outlet } from 'react-router-dom';

const AuthenticatedLayout: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const queryClient = useQueryClient();
    const location = useLocation();
    const isSettings = location.pathname.startsWith('/settings');

    const { groupId } = useParams();
    const {
        deferredPrompt, setDeferredPrompt, showInstallPopup,
        setShowInstallPopup, runTour, setRunTour, handleInstall,
        pendingShare, setPendingShare
    } = useOnboarding();

    useGlobalNotifications(user, groupId);

    useEffect(() => {
        const handleKramizShare = (event: any) => {
            try {
                const data = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
                if (data && data.uri) {
                    setPendingShare({ type: 'file', content: 'File from external app', url: data.uri });
                }
            } catch (err) { console.error('[Native Share] Failed to parse share data:', err); }
        };

        if (isNative) window.addEventListener('kramizShareIntent' as any, handleKramizShare);
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const lastHidden = (window as any).lastHiddenTime || 0;
                if (Date.now() - lastHidden > 300000) queryClient.invalidateQueries();
            } else {
                (window as any).lastHiddenTime = Date.now();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('kramizShareIntent' as any, handleKramizShare);
        };
    }, [queryClient, setPendingShare]);

    return (
        <MainLayout
            user={user}
            handleLogout={onLogout}
            deferredPrompt={deferredPrompt}
            setDeferredPrompt={setDeferredPrompt}
            setRunTour={setRunTour}
            runTour={runTour}
            isSettings={isSettings}
        >
            <Outlet />

            {showInstallPopup && deferredPrompt && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px] md:bg-transparent md:items-end md:justify-start md:p-8">
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <div className="flex items-start gap-4">
                            <div className="h-16 w-16 bg-gray-50 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-inner">
                                <img src="/Kramiz%20app%20icon.png" alt="Kramiz" className="w-10 h-10 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-black text-gray-900 leading-tight">Install Kramiz (Beta)</h3>
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Add Kramiz to your home screen for high-speed tracking.</p>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button onClick={handleInstall} className="flex-1 py-3 bg-[#008069] text-white rounded-xl font-bold text-sm hover:bg-[#006a57] shadow-lg transition-all active:scale-95">Install Now</button>
                            <button onClick={() => setShowInstallPopup(false)} className="px-5 py-3 bg-gray-50 text-gray-400 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all font-blanka">Later</button>
                        </div>
                    </div>
                </div>
            )}

            <ProductTour
                currentUser={user}
                run={runTour}
                onFinish={() => {
                    setRunTour(false);
                    localStorage.setItem('kramiz_onboarded', 'true');
                }}
            />

            {pendingShare && (
                <KramizSharePopup
                    currentUser={user}
                    content={{ type: 'file', fileUrl: pendingShare.url, fileName: pendingShare.content || 'Shared File' }}
                    onClose={() => setPendingShare(null)}
                    onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['channels'] }); }}
                />
            )}
        </MainLayout>
    );
};

const ChatRoomWrapper: React.FC<{ user: User }> = ({ user }) => {
    const { groupId } = useParams();
    const navigate = useNavigate();

    const { data: allChannels = [] } = useQuery({
        queryKey: ['channels', user.id],
        queryFn: () => api.getAllChannels(user),
    });

    const { data: orders = [] } = useQuery({
        queryKey: ['orders', user.id],
        queryFn: () => api.getOrders(user),
    });

    const { data: userCompany } = useQuery({
        queryKey: ['company', user.company_id],
        queryFn: () => api.getCompany(user.company_id),
        enabled: !!user.company_id
    });

    const selectedChannel = findGroupByIdOrSlug(groupId, allChannels, orders, userCompany || undefined);
    const selectedOrder = selectedChannel ? (orders.find(p => p.id === selectedChannel.order_id) || (selectedChannel as any).order) : null;

    if (!selectedChannel || !selectedOrder) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
            </div>
        );
    }

    return (
        <ChatRoom
            currentUser={user}
            channel={selectedChannel}
            order={selectedOrder}
            onBack={() => navigate('/chats')}
        />
    );
};

const AppRoutes: React.FC<{
    user: User | null;
    handleDemoLogin: () => Promise<void>;
    handleLogin: (loggedInUser: User, rememberMe: boolean) => void;
    handleLogout: () => void;
}> = ({ user, handleDemoLogin, handleLogin, handleLogout }) => {
    const navigate = useNavigate();

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : (isNative ? <Navigate to="/login" replace /> : <LandingPage onDemoLogin={handleDemoLogin} />)} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} onBack={() => navigate('/')} />} />
            <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup onBack={() => navigate('/')} onSignupSuccess={() => navigate('/login')} />} />

            {/* Protected Routes */}
            <Route element={user ? <AuthenticatedLayout user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />}>
                <Route path="/dashboard/*" element={<DashboardView currentUser={user} />} />
                <Route path="/chats" element={<WelcomeView />} />
                <Route path="/group/:groupId" element={<ChatRoomWrapper user={user} />} />
                <Route path="/settings/*" element={<SettingsPage currentUser={user} onLogout={handleLogout} />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App: React.FC = () => {
    const {
        user, isRestoringSession, handleLogin, handleLogout, handleDemoLogin
    } = useAppSync();


    if (isRestoringSession) {
        return (
            <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
                <div className="text-center">
                    <div className="h-20 w-48 mb-6 flex items-center justify-center mx-auto">
                        <img src="/logo_v2.png" alt="Kramiz" className="w-full h-full object-contain animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 font-blanka tracking-widest uppercase">Kramiz</h2>
                    <p className="text-sm text-gray-500 mt-2">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <HashRouter>
            <AppRoutes
                user={user}
                handleDemoLogin={handleDemoLogin}
                handleLogin={handleLogin}
                handleLogout={handleLogout}
            />
        </HashRouter>
    );
};

export default App;
