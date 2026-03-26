
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
import { SendIntent } from '@mindlib-capacitor/send-intent';

const AuthenticatedApp: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { groupId } = useParams();

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPopup, setShowInstallPopup] = useState(false);
    const [runTour, setRunTour] = useState(false);

    // Fetch data for the layout (needed for notifications and tour)
    const { data: allChannels = [] } = useQuery({
        queryKey: ['channels', user.id],
        queryFn: () => api.getAllChannels(user),
    });

    const { data: pos = [] } = useQuery({
        queryKey: ['pos', user.id],
        queryFn: () => api.getPOs(user),
    });

    const { data: userCompany } = useQuery({
        queryKey: ['company', user.company_id],
        queryFn: () => api.getCompany(user.company_id),
        enabled: !!user.company_id
    });

    const selectedChannel = findGroupByIdOrSlug(groupId, allChannels, pos, userCompany || undefined);
    const selectedPO = selectedChannel ? pos.find(p => p.id === selectedChannel.po_id) || null : null;

    // Unified function to handle onboarding prompts
    const showOnboardingPrompts = () => {
        if (runTour) {
            setTimeout(showOnboardingPrompts, 5000);
            return;
        }
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        if (deferredPrompt) {
            setTimeout(() => setShowInstallPopup(true), 15000);
        }
    };

    useEffect(() => {
        const hasOnboarded = localStorage.getItem('kramiz_onboarded');
        if (!hasOnboarded) {
            setTimeout(() => setRunTour(true), 1500);
        }
        setTimeout(showOnboardingPrompts, 3000);

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });

        // Initialize Share Target Listener
        const checkIncomingShare = async () => {
            try {
                const result = await SendIntent.checkSendIntentReceived();
                if (result && (result.title || result.url || result.description)) {
                    // For now, securely catch the share and notify the user until UI is fully built
                    let description = result.description || 'a message';
                    if (result.type?.includes('image')) description = 'an image';
                    if (result.url) description = 'a file';
                    
                    alert(`Kramiz received ${description} from another app! You can share this to a chat soon.`);
                }
            } catch (err) { }
        };

        if (isNative) {
            checkIncomingShare();
            // In Android, tapping Kramiz in the share menu might resume the app and trigger a custom app event
            window.addEventListener('appUrlOpen', () => checkIncomingShare());
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !(window as any).isKramizUploading) {
                queryClient.invalidateQueries();
                if (isNative) checkIncomingShare();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('appUrlOpen', checkIncomingShare);
        };
    }, []);

    // Global Notifications & Realtime Sync
    useEffect(() => {
        if (!user) return;

        const globalMsgSubscription = supabase
            .channel('global-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, async (payload) => {
                const newMsg = payload.new as Message;
                if (newMsg.user_id === user.id) return;

                // Avoid duplicate notification if current channel is active
                if (groupId === newMsg.channel_id) return;

                playNotificationSound();
                triggerVibration();

                if (isNative) {
                    const { data: ch } = await supabase.from('channels').select('name').eq('id', newMsg.channel_id).single();
                    const title = ch ? `New Message in ${ch.name}` : 'New Message';
                    await scheduleLocalNotification(title, newMsg.content, undefined, { channel_id: newMsg.channel_id });
                } else if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
                    const { data: ch } = await supabase.from('channels').select('name').eq('id', newMsg.channel_id).single();
                    const title = ch ? `New Message in ${ch.name}` : 'New Message';

                    if ('serviceWorker' in navigator) {
                        const reg = await navigator.serviceWorker.ready;
                        reg.showNotification(title, {
                            body: newMsg.content,
                            icon: '/Kramiz%20app%20icon.png',
                            badge: '/favicon.png',
                            tag: newMsg.channel_id,
                            renotify: true
                        } as any);
                    } else {
                        new Notification(title, { body: newMsg.content });
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(globalMsgSubscription);
        };
    }, [user, groupId]);

    return (
        <MainLayout
            user={user}
            handleLogout={onLogout}
            deferredPrompt={deferredPrompt}
            setDeferredPrompt={setDeferredPrompt}
            setRunTour={setRunTour}
            runTour={runTour}
        >
            {groupId ? (
                selectedChannel && selectedPO ? (
                    <ChatRoom
                        currentUser={user}
                        channel={selectedChannel}
                        po={selectedPO}
                        onBack={() => navigate('/')}
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
                                onClick={() => {
                                    deferredPrompt.prompt();
                                    deferredPrompt.userChoice.then(() => {
                                        setDeferredPrompt(null);
                                        setShowInstallPopup(false);
                                    });
                                }}
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
            <Route path="/group/:groupId" element={user ? <AuthenticatedApp user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isRestoringSession, setIsRestoringSession] = useState(true);

    useEffect(() => {
        const initApp = async () => {
            try {
                // Initialize native plugins (Permissions, Status Bar, Channels, etc.)
                await initializeNativePlugins({
                    onTokenReceived: (token) => {
                        console.log('[Native] Token received:', token);
                        localStorage.setItem('native_push_token', token);
                        // If user is already loaded, save it now
                        const savedUser = loadSession();
                        if (savedUser) {
                            api.saveNativePushToken(savedUser.id, token);
                        }
                    },
                    onNotificationAction: (action) => {
                        console.log('[Native] Notification action:', action);
                        const data = action.notification?.data;
                        if (data && data.channel_id) {
                            // Navigate to the channel
                            window.location.hash = `#/group/${data.channel_id}`;
                        }
                    }
                });

                const savedUser = loadSession();
                if (savedUser) {
                    setUser(savedUser);
                    // If we already have a token, save it
                    const token = localStorage.getItem('native_push_token');
                    if (token) {
                        api.saveNativePushToken(savedUser.id, token);
                    }
                }
            } catch (err) {
                console.error("Session restoration failed:", err);
                clearSession();
            } finally {
                setIsRestoringSession(false);
            }
        };
        initApp();
    }, []);

    const handleLogin = (loggedInUser: User, rememberMe: boolean) => {
        saveSession(loggedInUser, rememberMe);
        setUser(loggedInUser);

        // Save native token on login
        const token = localStorage.getItem('native_push_token');
        if (token) {
            api.saveNativePushToken(loggedInUser.id, token);
        }
    };

    const handleLogout = () => {
        clearSession();
        setUser(null);
    };

    const handleDemoLogin = async () => {
        const mask = document.getElementById('global-loader');
        if (mask) mask.style.display = 'flex';
        try {
            const { user: demoUser } = await api.login('9876543210', '1234');
            await api.ensureDemoData(demoUser);
            saveSession(demoUser, true);
            setUser(demoUser);
        } catch (err) {
            console.error('Demo login failed:', err);
            alert('Demo is currently unavailable.');
        } finally {
            if (mask) mask.style.display = 'none';
        }
    };

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
