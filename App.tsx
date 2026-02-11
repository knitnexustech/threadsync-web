
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Login } from './components/Login';
import { api } from './supabaseAPI';
import { Sidebar } from './components/Sidebar';
import { ChatRoom } from './components/ChatRoom';
import { LandingPage } from './components/LandingPage';
import { Signup } from './components/Signup';
import { ProductTour } from './components/ProductTour';
import { User, Channel, PurchaseOrder, Message } from './types';
import { saveSession, loadSession, clearSession } from './sessionUtils';
import { supabase } from './supabaseClient';
import { playNotificationSound, triggerVibration } from './notificationUtils';

type ViewState = 'LANDING' | 'LOGIN' | 'SIGNUP' | 'APP';

const App: React.FC = () => {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<User | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<{ c: Channel, p: PurchaseOrder } | null>(null);
    const [view, setView] = useState<ViewState>('LANDING');
    const [isRestoringSession, setIsRestoringSession] = useState(true);

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPopup, setShowInstallPopup] = useState(false);
    const [runTour, setRunTour] = useState(false);
    const [isLoadingFromBackground, setIsLoadingFromBackground] = useState(false);

    // Unified function to handle onboarding prompts (Notifications -> Install)
    const showOnboardingPrompts = () => {
        // If tour is active, wait and retry
        if (runTour) {
            setTimeout(showOnboardingPrompts, 5000);
            return;
        }

        // 1. Ask for notification permission first
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }

        // 2. Wait 30 seconds before showing Install Prompt (as requested 25-30s)
        if (deferredPrompt) {
            setTimeout(() => {
                setShowInstallPopup(true);
            }, 15000);
        }
    };

    // Restore session on app load - Run ONCE on mount
    useEffect(() => {
        const initApp = async () => {
            try {
                const savedUser = loadSession();
                if (savedUser) {
                    setUser(savedUser);
                    setView('APP');
                    // Check if user needs onboarding
                    const hasOnboarded = localStorage.getItem('kramiz_onboarded');
                    if (!hasOnboarded) {
                        setTimeout(() => setRunTour(true), 1500); // Start tour slightly after app load
                    }
                    // Small delay to let the app settle before asking for permissions
                    setTimeout(showOnboardingPrompts, 3000);
                }
            } catch (err) {
                console.error("Session restoration failed:", err);
                clearSession();
            } finally {
                setIsRestoringSession(false);
            }
        };

        initApp();
    }, []); // Only run once on mount

    // Listen for install prompt
    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });

        // App Resume Listener (Refresh effect)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // If an upload is in progress OR user just opened the file picker, skip refresh.
                // This prevents the global loader from unmounting the app and killing the upload.
                if ((window as any).isKramizUploading) {
                    console.log('Skipping background refresh: Upload or File Picker active');
                    // Reset the 'just opened picker' state after a small delay to allow resume
                    return;
                }

                setIsLoadingFromBackground(true);
                queryClient.invalidateQueries();
                setTimeout(() => {
                    setIsLoadingFromBackground(false);
                }, 600);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Global Notifications & Realtime Sync
    useEffect(() => {
        if (!user || view !== 'APP') return;

        console.log('Initializing Global Realtime Listener for user:', user.id);

        const globalMsgSubscription = supabase
            .channel('global-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
            }, async (payload) => {
                const newMsg = payload.new as Message;

                // 1. Basic filtering: Don't notify if it's our own message or a system update
                if (newMsg.user_id === user.id || newMsg.is_system_update) return;

                // 2. Avoid duplicate notification if ChatRoom is already handling it
                if (selectedChannel && newMsg.channel_id === selectedChannel.c.id) {
                    console.log('Skipping global notification as channel is active');
                    return;
                }

                // 3. Play Sound/Vibration
                playNotificationSound();
                triggerVibration();

                // 4. Show Notification (Only if user is not actively looking at the app)
                if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
                    // Try to get channel info for better notification
                    const { data: channelData } = await supabase
                        .from('channels')
                        .select('name')
                        .eq('id', newMsg.channel_id)
                        .single();

                    const title = channelData ? `New Message in ${channelData.name}` : 'New Message';

                    if ('serviceWorker' in navigator) {
                        const reg = await navigator.serviceWorker.ready;
                        reg.showNotification(title, {
                            body: newMsg.content,
                            icon: '/Kramiz%20app%20icon.png',
                            badge: '/favicon.png',
                            tag: newMsg.channel_id, // Group by channel
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
    }, [user, view, selectedChannel]);

    const handleLogin = (loggedInUser: User, rememberMe: boolean) => {
        saveSession(loggedInUser, rememberMe); // Save to storage
        setUser(loggedInUser);
        setView('APP');

        showOnboardingPrompts();
    };

    const handleDemoLogin = async () => {
        const mask = document.getElementById('global-loader');
        if (mask) mask.style.display = 'flex';
        try {
            const { user: demoUser } = await api.login('9876543210', '1234');
            // Ensure Order 505 exists for this demo user
            await api.ensureDemoData(demoUser);

            saveSession(demoUser, true);
            setUser(demoUser);
            setView('APP');
            setRunTour(true);
        } catch (err) {
            console.error('Demo login failed:', err);
            alert('Demo is currently unavailable. Please try again later.');
        } finally {
            if (mask) mask.style.display = 'none';
        }
    };

    const handleLogout = () => {
        clearSession(); // Clear from storage
        setUser(null);
        setSelectedChannel(null);
        setView('LANDING');
    };

    const handleSignupSuccess = () => {
        setView('LOGIN');
    };

    // Show loading screen while restoring session or resuming
    if (isRestoringSession || isLoadingFromBackground) {
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

    if (view === 'LANDING') {
        return <LandingPage onNavigate={(page) => setView(page)} onDemoLogin={handleDemoLogin} />;
    }

    if (view === 'LOGIN') {
        return <Login onLogin={handleLogin} onBack={() => setView('LANDING')} />;
    }

    if (view === 'SIGNUP') {
        return <Signup onBack={() => setView('LANDING')} onSignupSuccess={handleSignupSuccess} />;
    }

    if (!user) {
        // Fallback
        setView('LANDING');
        return null;
    }

    // Responsive logic: 
    // Desktop: Show Sidebar and Chat side-by-side.
    // Mobile: Show Sidebar. If channel selected, overlay Chat (or switch view).

    return (
        <div className="flex h-screen overflow-hidden bg-[#f0f2f5]">
            {/* Sidebar Area: Visible on mobile if no chat selected, always visible on Desktop */}
            <div className={`${selectedChannel ? 'hidden md:block' : 'w-full'} md:w-auto h-full`}>
                <Sidebar
                    currentUser={user}
                    selectedChannelId={selectedChannel?.c.id}
                    onSelectChannel={(c, p) => setSelectedChannel({ c, p })}
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

            {/* Chat Area: Visible on mobile if chat selected, always visible on Desktop */}
            <div className={`flex-1 h-full relative ${!selectedChannel ? 'hidden md:flex' : 'flex'}`}>
                {selectedChannel ? (
                    <ChatRoom
                        currentUser={user}
                        channel={selectedChannel.c}
                        po={selectedChannel.p}
                        onBack={() => setSelectedChannel(null)}
                    />
                ) : (
                    // Empty State (Desktop only)
                    <div className="flex-1 bg-white flex flex-col items-center justify-center text-center p-6">
                        <div className="h-20 w-48 mb-8">
                            <img src="/logo_v2.png" alt="Kramiz" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-5xl font-black tracking-[0.15em] text-gray-900 mb-4 font-blanka uppercase">
                            Kramiz (Beta) Web
                        </h1>
                        <p className="text-xl text-gray-500 max-w-md leading-relaxed">
                            Select an order to start simplifying your follow-ups. <br />
                            <span className="text-sm font-medium text-gray-400">Everything you need from order to shipment.</span>
                        </p>
                        <div className="mt-12 flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] border-t border-gray-50 pt-8">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            End-to-end encrypted
                        </div>
                    </div>
                )}
            </div>
            {/* Premium Installation Prompt */}
            {showInstallPopup && deferredPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px] md:bg-transparent md:items-end md:justify-start md:p-8">
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <div className="flex items-start gap-4">
                            <div className="h-16 w-16 bg-gray-50 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-inner">
                                <img src="/Kramiz%20app%20icon.png" alt="Kramiz" className="w-10 h-10 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-black text-gray-900 leading-tight">Install Kramiz (Beta)</h3>
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Add Kramiz (Beta) to your home screen for high-speed tracking and instant follow-ups.</p>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => {
                                    deferredPrompt.prompt();
                                    deferredPrompt.userChoice.then((choice: any) => {
                                        if (choice.outcome === 'accepted') {
                                            console.log('User accepted the install prompt');
                                        }
                                        setDeferredPrompt(null);
                                        setShowInstallPopup(false);
                                    });
                                }}
                                className="flex-1 py-3 bg-[#008069] text-white rounded-xl font-bold text-sm hover:bg-[#006a57] shadow-lg shadow-green-900/10 transition-all active:scale-95"
                            >
                                Install Now
                            </button>
                            <button
                                onClick={() => setShowInstallPopup(false)}
                                className="px-5 py-3 bg-gray-50 text-gray-400 rounded-xl font-bold text-sm hover:bg-gray-100 hover:text-gray-600 transition-all font-blanka"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {user && (
                <ProductTour
                    currentUser={user}
                    run={runTour}
                    onFinish={() => {
                        setRunTour(false);
                        localStorage.setItem('kramiz_onboarded', 'true');
                    }}
                />
            )}
        </div>
    );
};

export default App;
