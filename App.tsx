
import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatRoom } from './components/ChatRoom';
import { LandingPage } from './components/LandingPage';
import { Signup } from './components/Signup';
import { User, Channel, PurchaseOrder } from './types';
import { saveSession, loadSession, clearSession } from './sessionUtils';

type ViewState = 'LANDING' | 'LOGIN' | 'SIGNUP' | 'APP';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<{ c: Channel, p: PurchaseOrder } | null>(null);
    const [view, setView] = useState<ViewState>('LANDING');
    const [isRestoringSession, setIsRestoringSession] = useState(true);

    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPopup, setShowInstallPopup] = useState(false);

    // Unified function to handle onboarding prompts (Notifications -> Install)
    const showOnboardingPrompts = () => {
        // 1. Ask for notification permission first
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                console.log('Notification permission:', permission);
            });
        }

        // 2. Wait 8 seconds before showing Install Prompt (as requested 7-10s)
        if (deferredPrompt) {
            setTimeout(() => {
                setShowInstallPopup(true);
            }, 8000);
        }
    };

    // Restore session on app load
    useEffect(() => {
        const savedUser = loadSession();
        if (savedUser) {
            setUser(savedUser);
            setView('APP');
            // Trigger sequence for returning users after a small stability delay
            setTimeout(showOnboardingPrompts, 2000);
        }
        setIsRestoringSession(false);
    }, [deferredPrompt]); // Depend on deferredPrompt to ensure it's captured

    // Listen for install prompt
    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });
    }, []);

    const handleLogin = (loggedInUser: User, rememberMe: boolean) => {
        saveSession(loggedInUser, rememberMe); // Save to storage
        setUser(loggedInUser);
        setView('APP');

        showOnboardingPrompts();
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

    // Show loading screen while restoring session
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

    if (view === 'LANDING') {
        return <LandingPage onNavigate={(page) => setView(page)} />;
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
                            Kramiz Web
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
                                <h3 className="text-xl font-black text-gray-900 leading-tight">Install Kramiz</h3>
                                <p className="text-sm text-gray-500 mt-1 leading-relaxed">Add Kramiz to your home screen for high-speed tracking and instant follow-ups.</p>
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
        </div>
    );
};

export default App;
