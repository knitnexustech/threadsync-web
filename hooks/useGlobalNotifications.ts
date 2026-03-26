import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Message } from '../types';
import { playNotificationSound, triggerVibration } from '../notificationUtils';
import { scheduleLocalNotification, isNative } from '../capacitorUtils';

export const useGlobalNotifications = (user: User | null, currentGroupId?: string) => {
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
                if (currentGroupId === newMsg.channel_id) return;

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
    }, [user, currentGroupId]);
};
