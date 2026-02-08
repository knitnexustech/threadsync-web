
// Utility to handle sounds and haptics
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
    if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
    }
};
