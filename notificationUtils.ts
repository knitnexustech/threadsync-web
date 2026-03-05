
// Utility to handle sounds and haptics — with Capacitor native support
import { isNative, hapticFeedback, scheduleLocalNotification } from './capacitorUtils';

export const playNotificationSound = () => {
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'); // Clean ping sound
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Sound blocked by browser policy:', e));
    } catch (err) {
        console.error('Audio playback failed:', err);
    }
};

export const triggerVibration = () => {
    if (isNative) {
        // Use native haptic feedback on Capacitor
        hapticFeedback('medium');
    } else if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
    }
};

/**
 * Show a native notification (local) on the device.
 * On web, falls back to the browser Notification API.
 */
export const showNativeNotification = async (title: string, body: string, data?: Record<string, any>) => {
    if (isNative) {
        await scheduleLocalNotification(title, body, undefined, data);
    } else if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.png' });
    }
};
