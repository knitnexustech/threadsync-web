/**
 * Capacitor Native Utilities
 * 
 * This module provides a unified interface for native device features.
 * When running in a browser, it gracefully falls back to web APIs.
 * When running inside Capacitor (Android/iOS), it uses native plugins.
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';

// ============================================
// PLATFORM DETECTION
// ============================================

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'

// ============================================
// PUSH NOTIFICATIONS
// ============================================

export interface PushNotificationToken {
    value: string;
}

/**
 * Register for push notifications on native platforms.
 * Returns the device token for server-side notification delivery.
 */
export const registerPushNotifications = async (
    onTokenReceived: (token: PushNotificationToken) => void,
    onNotificationReceived: (notification: any) => void,
    onNotificationAction: (action: any) => void,
): Promise<void> => {
    if (!isNative) {
        console.log('[Capacitor] Push notifications not available on web — using Web Push API fallback');
        return;
    }

    try {
        // Request permission
        const permStatus = await PushNotifications.requestPermissions();

        if (permStatus.receive === 'granted') {
            // Register with APNs / FCM
            await PushNotifications.register();
        } else {
            console.warn('[Capacitor] Push notification permission denied');
            return;
        }

        // Listen for registration success
        PushNotifications.addListener('registration', (token) => {
            console.log('[Capacitor] Push token received:', token.value);
            onTokenReceived(token);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
            console.error('[Capacitor] Push registration error:', error);
        });

        // Listen for incoming notifications while app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[Capacitor] Push notification received:', notification);
            onNotificationReceived(notification);
        });

        // Listen for notification tap actions
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('[Capacitor] Push notification action:', action);
            onNotificationAction(action);
        });

    } catch (error) {
        console.error('[Capacitor] Failed to register push notifications:', error);
    }
};

/**
 * Remove all delivered notifications from the notification tray.
 */
export const clearPushNotifications = async (): Promise<void> => {
    if (!isNative) return;
    try {
        await PushNotifications.removeAllDeliveredNotifications();
    } catch (error) {
        console.error('[Capacitor] Failed to clear notifications:', error);
    }
};

// ============================================
// LOCAL NOTIFICATIONS
// ============================================

/**
 * Schedule a local notification (useful for in-app alerts, reminders).
 */
export const scheduleLocalNotification = async (
    title: string,
    body: string,
    id?: number,
    extra?: Record<string, any>,
): Promise<void> => {
    if (!isNative) {
        // Fallback to Web Notification API
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.png' });
        }
        return;
    }

    try {
        const permStatus = await LocalNotifications.requestPermissions();
        if (permStatus.display !== 'granted') return;

        await LocalNotifications.schedule({
            notifications: [
                {
                    id: id || Date.now(),
                    title,
                    body,
                    schedule: { at: new Date(Date.now() + 100) }, // Immediate
                    extra: extra || {},
                    smallIcon: 'ic_stat_icon',
                    iconColor: '#008069',
                },
            ],
        });
    } catch (error) {
        console.error('[Capacitor] Failed to schedule local notification:', error);
    }
};

// ============================================
// CAMERA
// ============================================

/**
 * Take a photo or select from gallery.
 * Returns a base64-encoded image or a file URI.
 */
export const takePhoto = async (source: 'camera' | 'gallery' = 'camera'): Promise<string | null> => {
    if (!isNative) {
        // Fallback: return null and let the web file input handle it
        return null;
    }

    try {
        const image = await Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
            width: 1200,
            height: 1200,
            correctOrientation: true,
        });

        return image.webPath || image.path || null;
    } catch (error) {
        console.error('[Capacitor] Camera error:', error);
        return null;
    }
};

// ============================================
// FILESYSTEM
// ============================================

/**
 * Download a file to the device's Documents directory.
 */
export const downloadFile = async (url: string, fileName: string): Promise<string | null> => {
    if (!isNative) {
        // Fallback: trigger browser download
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return null;
    }

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const reader = new FileReader();

        return new Promise((resolve) => {
            reader.onloadend = async () => {
                const base64Data = (reader.result as string).split(',')[1];
                const result = await Filesystem.writeFile({
                    path: `Kramiz/${fileName}`,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true,
                });
                console.log('[Capacitor] File saved:', result.uri);
                resolve(result.uri);
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('[Capacitor] File download error:', error);
        return null;
    }
};

// ============================================
// HAPTICS
// ============================================

/**
 * Trigger haptic feedback on native platforms.
 */
export const hapticFeedback = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium'): Promise<void> => {
    if (!isNative) {
        // Fallback to web Vibration API
        if ('vibrate' in navigator) {
            navigator.vibrate(type === 'light' ? 50 : type === 'heavy' ? 200 : 100);
        }
        return;
    }

    try {
        switch (type) {
            case 'light':
                await Haptics.impact({ style: ImpactStyle.Light });
                break;
            case 'medium':
                await Haptics.impact({ style: ImpactStyle.Medium });
                break;
            case 'heavy':
                await Haptics.impact({ style: ImpactStyle.Heavy });
                break;
            case 'success':
                await Haptics.notification({ type: NotificationType.Success });
                break;
            case 'warning':
                await Haptics.notification({ type: NotificationType.Warning });
                break;
            case 'error':
                await Haptics.notification({ type: NotificationType.Error });
                break;
        }
    } catch (error) {
        console.error('[Capacitor] Haptics error:', error);
    }
};

// ============================================
// STATUS BAR
// ============================================

/**
 * Configure the native status bar appearance.
 */
export const configureStatusBar = async (
    backgroundColor: string = '#008069',
    style: 'dark' | 'light' = 'dark',
): Promise<void> => {
    if (!isNative) return;

    try {
        await StatusBar.setBackgroundColor({ color: backgroundColor });
        await StatusBar.setStyle({
            style: style === 'dark' ? StatusBarStyle.Dark : StatusBarStyle.Light,
        });
    } catch (error) {
        console.error('[Capacitor] StatusBar error:', error);
    }
};

export const hideStatusBar = async (): Promise<void> => {
    if (!isNative) return;
    try {
        await StatusBar.hide();
    } catch (error) {
        console.error('[Capacitor] StatusBar hide error:', error);
    }
};

export const showStatusBar = async (): Promise<void> => {
    if (!isNative) return;
    try {
        await StatusBar.show();
    } catch (error) {
        console.error('[Capacitor] StatusBar show error:', error);
    }
};

// ============================================
// SPLASH SCREEN
// ============================================

/**
 * Hide the native splash screen (auto-hidden by default after 2s).
 */
export const hideSplashScreen = async (): Promise<void> => {
    if (!isNative) return;
    try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
    } catch (error) {
        console.error('[Capacitor] SplashScreen error:', error);
    }
};

// ============================================
// KEYBOARD
// ============================================

/**
 * Listen for keyboard show/hide events on native platforms.
 */
export const setupKeyboardListeners = (
    onShow?: (height: number) => void,
    onHide?: () => void,
): (() => void) => {
    if (!isNative) return () => { };

    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
        onShow?.(info.keyboardHeight);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
        onHide?.();
    });

    // Return cleanup function
    return () => {
        showListener.then(l => l.remove());
        hideListener.then(l => l.remove());
    };
};

// ============================================
// APP LIFECYCLE
// ============================================

/**
 * Listen for app state changes (foreground/background).
 */
export const setupAppStateListener = (
    onStateChange: (isActive: boolean) => void,
): (() => void) => {
    if (!isNative) {
        // Fallback to visibility API
        const handler = () => onStateChange(!document.hidden);
        document.addEventListener('visibilitychange', handler);
        return () => document.removeEventListener('visibilitychange', handler);
    }

    const listener = App.addListener('appStateChange', (state) => {
        onStateChange(state.isActive);
    });

    return () => {
        listener.then(l => l.remove());
    };
};

/**
 * Handle the hardware back button on Android.
 */
export const setupBackButtonListener = (
    onBackButton: () => void,
): (() => void) => {
    if (!isNative || platform !== 'android') return () => { };

    const listener = App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
            window.history.back();
        } else {
            onBackButton();
        }
    });

    return () => {
        listener.then(l => l.remove());
    };
};

// ============================================
// BROWSER (In-App Browser for external links)
// ============================================

/**
 * Open a URL in the in-app browser (native) or new tab (web).
 */
export const openInAppBrowser = async (url: string): Promise<void> => {
    if (!isNative) {
        window.open(url, '_blank');
        return;
    }

    try {
        await Browser.open({
            url,
            toolbarColor: '#008069',
            presentationStyle: 'popover',
        });
    } catch (error) {
        console.error('[Capacitor] Browser error:', error);
    }
};

// ============================================
// SHARE
// ============================================

/**
 * Share content using the native share sheet.
 */
export const shareContent = async (
    title: string,
    text: string,
    url?: string,
): Promise<void> => {
    if (!isNative) {
        // Fallback to Web Share API
        if (navigator.share) {
            await navigator.share({ title, text, url });
        }
        return;
    }

    try {
        await Share.share({ title, text, url, dialogTitle: 'Share via' });
    } catch (error) {
        console.error('[Capacitor] Share error:', error);
    }
};

// ============================================
// DEVICE INFO
// ============================================

/**
 * Get device information (model, OS, battery, etc.).
 */
export const getDeviceInfo = async () => {
    try {
        const info = await Device.getInfo();
        const batteryInfo = await Device.getBatteryInfo();
        return { ...info, ...batteryInfo };
    } catch (error) {
        console.error('[Capacitor] Device info error:', error);
        return null;
    }
};

// ============================================
// NETWORK
// ============================================

/**
 * Get current network status and listen for changes.
 */
export const getNetworkStatus = async () => {
    try {
        return await Network.getStatus();
    } catch (error) {
        console.error('[Capacitor] Network status error:', error);
        return { connected: true, connectionType: 'unknown' as const };
    }
};

export const setupNetworkListener = (
    onStatusChange: (isConnected: boolean, type: string) => void,
): (() => void) => {
    const listener = Network.addListener('networkStatusChange', (status) => {
        onStatusChange(status.connected, status.connectionType);
    });

    return () => {
        listener.then(l => l.remove());
    };
};

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize all native plugins. Call this once in your app entry point.
 */
export const initializeNativePlugins = async (): Promise<void> => {
    if (!isNative) {
        console.log('[Capacitor] Running on web — native plugins skipped');
        return;
    }

    console.log(`[Capacitor] Initializing on ${platform}...`);

    // Configure status bar
    await configureStatusBar('#008069', 'dark');

    // Request notification permissions and register for push (if not already done)
    try {
        const pushStatus = await PushNotifications.requestPermissions();
        if (pushStatus.receive === 'granted') {
            await PushNotifications.register();
        }

        const localStatus = await LocalNotifications.requestPermissions();
        if (localStatus.display === 'granted') {
            console.log('[Capacitor] Local notifications granted');
        }
    } catch (err) {
        console.warn('[Capacitor] Initial permission request error:', err);
    }

    // Foreground listener logic (display notifications while app is open)
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('[Capacitor] Foreground push received:', notification);

        // When received in foreground, we force an alert using LocalNotifications
        if (isNative) {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: Date.now(),
                        title: notification.title || 'New Message',
                        body: notification.body || 'You have a new update in Kramiz',
                        schedule: { at: new Date(Date.now() + 100) },
                        smallIcon: 'ic_stat_icon',
                        iconColor: '#008069',
                    }
                ]
            });
        }
    });

    // Hide splash screen after app is ready
    await hideSplashScreen();

    // Log device info
    const deviceInfo = await getDeviceInfo();
    console.log('[Capacitor] Device:', deviceInfo);

    console.log('[Capacitor] Native plugins initialized successfully');
};
