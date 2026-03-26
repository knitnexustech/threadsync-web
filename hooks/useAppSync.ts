import { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../supabaseAPI';
import { initializeNativePlugins } from '../capacitorUtils';
import { saveSession, loadSession, clearSession } from '../sessionUtils';

export const useAppSync = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isRestoringSession, setIsRestoringSession] = useState(true);

    useEffect(() => {
        const initApp = async () => {
            try {
                await initializeNativePlugins({
                    onTokenReceived: (token) => {
                        console.log('[Native] Token received:', token);
                        localStorage.setItem('native_push_token', token);
                        const savedUser = loadSession();
                        if (savedUser) {
                            api.saveNativePushToken(savedUser.id, token);
                        }
                    },
                    onNotificationAction: (action) => {
                        console.log('[Native] Notification action:', action);
                        const data = action.notification?.data;
                        if (data && data.channel_id) {
                            window.location.hash = `#/group/${data.channel_id}`;
                        }
                    }
                });

                const savedUser = loadSession();
                if (savedUser) {
                    setUser(savedUser);
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

    return {
        user,
        setUser,
        isRestoringSession,
        handleLogin,
        handleLogout,
        handleDemoLogin
    };
};
