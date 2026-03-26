
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

const AuthenticatedApp: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const { groupId } = useParams();
    const isSettings = location.pathname.startsWith('/settings');
    const isDashboard = location.pathname.startsWith('/dashboard');

    const {
        deferredPrompt, setDeferredPrompt, showInstallPopup,
        setShowInstallPopup, runTour, setRunTour, handleInstall,
        pendingShare, setPendingShare
    } = useOnboarding();

    useGlobalNotifications(user, groupId);

    // Fetch data for the layout
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
    const selectedOrder = selectedChannel ? orders.find(p => p.id === selectedChannel.order_id) || null : null;


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
            {isSettings ? (
                <SettingsPage currentUser={user} onLogout={onLogout} />
            ) : isDashboard ? (
                <DashboardView currentUser={user} />
            ) : groupId ? (
                selectedChannel && selectedOrder ? (
                    <ChatRoom
                        currentUser={user}
                        channel={selectedChannel}
                        order={selectedOrder}
                        onBack={() => navigate('/chats')}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-white">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008069]"></div>
                    </div>
                )
            ) : (
                <WelcomeView />
            )}

            {/* Premium Installation Prompt */}
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
                            <button
                                onClick={handleInstall}
                                className="flex-1 py-3 bg-[#008069] text-white rounded-xl font-bold text-sm hover:bg-[#006a57] shadow-lg transition-all active:scale-95"
                            >
                                Install Now
                            </button>
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

            {/* Inward Share Modal */}
            {pendingShare && (
                <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black text-[#008069] uppercase tracking-widest">Share to Kramiz</span>
                                <h3 className="font-bold text-gray-900">Select a Group</h3>
                            </div>
                            <button onClick={() => setPendingShare(null)} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm">✕</button>
                        </div>
                        
                        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
                            <div className="p-3 bg-green-50 rounded-xl border border-green-100 mb-4 text-left">
                                <p className="text-[10px] font-bold text-green-700 uppercase tracking-tighter mb-1">Sharing Content:</p>
                                <p className="text-xs text-green-900 truncate font-medium">{pendingShare.content || 'File Attachment'}</p>
                            </div>

                            {orders.map(order => {
                                const orderChannels = allChannels.filter(c => c.order_id === order.id);
                                if (orderChannels.length === 0) return null;
                                
                                return (
                                    <div key={order.id} className="space-y-2 text-left">
                                        <div className="px-2 py-1 bg-gray-100 rounded text-[10px] font-black text-gray-400 uppercase tracking-widest">{order.order_number} - {order.style_number}</div>
                                        {orderChannels.map(ch => (
                                            <button 
                                                key={ch.id} 
                                                onClick={async () => {
                                                    try {
                                                        const targetChannel = ch.id;
                                                        if (pendingShare.url) {
                                                            await api.sendMessage(user, targetChannel, `[SHARED FROM OTHER APP] ${pendingShare.content || ''}`);
                                                            await api.sendMessage(user, targetChannel, `[FILE]${pendingShare.url}|Shared from other app`);
                                                        } else {
                                                            await api.sendMessage(user, targetChannel, pendingShare.content);
                                                        }
                                                        setPendingShare(null);
                                                        navigate(`/group/${ch.id}`);
                                                        alert('Shared successfully!');
                                                    } catch (err: any) {
                                                        alert('Share failed: ' + err.message);
                                                    }
                                                }}
                                                className="w-full text-left p-4 border border-gray-100 rounded-2xl hover:bg-green-50 transition-colors flex items-center justify-between group bg-white shadow-sm"
                                            >
                                                <span className="font-bold text-gray-700">{ch.name}</span>
                                                <span className="text-[#008069] opacity-0 group-hover:opacity-100 font-black">SEND →</span>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
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

            {/* Protected App Routes */}
            <Route path="/dashboard" element={user ? <AuthenticatedApp user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
            <Route path="/chats" element={user ? <AuthenticatedApp user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
            <Route path="/group/:groupId" element={user ? <AuthenticatedApp user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} />
            <Route path="/settings" element={user ? <AuthenticatedApp user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} />

            {/* Fallback */}
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
