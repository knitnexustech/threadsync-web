import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Channel, Message, PurchaseOrder } from '../types';
import { api } from '../supabaseAPI';
import { supabase } from '../supabaseClient';
import { playNotificationSound, triggerVibration } from '../notificationUtils';

export const useChat = (currentUser: User, channel: Channel) => {
    const queryClient = useQueryClient();
    const [hasPerformedInitialScroll, setHasPerformedInitialScroll] = useState(false);
    const initialLastReadAtRef = useRef<string | undefined>(channel.last_read_at);

    // Queries
    const { data: messages = [], isLoading: loadingMessages } = useQuery({
        queryKey: ['messages', channel.id],
        queryFn: () => api.getMessages(currentUser, channel.id),
    });

    const { data: members = [], isLoading: loadingMembers } = useQuery({
        queryKey: ['members', channel.id],
        queryFn: () => api.getChannelMembers(channel.id),
    });

    // Mark as read
    useEffect(() => {
        api.markChannelAsRead(currentUser, channel.id).then(() => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        });
    }, [channel.id, currentUser, queryClient]);

    // Realtime Subscription
    useEffect(() => {
        const channelSubscription = supabase
            .channel(`room:${channel.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${channel.id}`
            }, (payload) => {
                const newMsg = payload.new as Message;
                
                // Direct Cache Injection
                queryClient.setQueryData(['messages', channel.id], (old: Message[] | undefined) => {
                    const current = old || [];
                    if (current.some(m => m.id === newMsg.id)) return current;
                    
                    // Match and replace optimistic message
                    const optimisticIndex = current.findIndex(m =>
                        m.user_id === newMsg.user_id &&
                        m.content === newMsg.content &&
                        (m.id.includes('.') || m.id.length < 15) // Robust optimistic check
                    );

                    if (optimisticIndex !== -1) {
                        const updated = [...current];
                        updated[optimisticIndex] = { ...newMsg, user: newMsg.user || currentUser };
                        return updated;
                    }
                    return [...current, { ...newMsg, user: newMsg.user || currentUser }];
                });

                if (newMsg.user_id !== currentUser.id) {
                    playNotificationSound();
                    triggerVibration();
                    if (document.visibilityState === 'visible') {
                        api.markChannelAsRead(currentUser, channel.id);
                        queryClient.invalidateQueries({ queryKey: ['channels'] });
                    }
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${channel.id}`
            }, (payload) => {
                if (payload.eventType !== 'INSERT') {
                    // Force refresh for edits/deletes to maintain consistency
                    queryClient.invalidateQueries({ queryKey: ['messages', channel.id] });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channelSubscription);
        };
    }, [channel.id, currentUser, queryClient]);

    // Mutations
    const sendMessageMutation = useMutation({
        mutationFn: ({ content, isSystem }: { content: string, isSystem?: boolean }) =>
            api.sendMessage(currentUser, channel.id, content, isSystem),
        onMutate: async ({ content }) => {
            await queryClient.cancelQueries({ queryKey: ['messages', channel.id] });
            const previousMessages = queryClient.getQueryData<Message[]>(['messages', channel.id]);
            const optimisticMsg: Message = {
                id: Math.random().toString(),
                channel_id: channel.id,
                user_id: currentUser.id,
                content: content,
                is_system_update: false,
                timestamp: new Date().toISOString(),
                user: currentUser
            } as any;
            queryClient.setQueryData(['messages', channel.id], (old: Message[] | undefined) => [...(old || []), optimisticMsg]);
            return { previousMessages };
        },
        onSuccess: (realMsg) => {
            // Direct Injection on Success to eliminate the "wait time" flicker
            queryClient.setQueryData(['messages', channel.id], (old: Message[] | undefined) => {
                if (!old) return [realMsg];
                const optIndex = old.findIndex(m => 
                    m.user_id === realMsg.user_id && 
                    m.content === realMsg.content && 
                    (m.id.includes('.') || m.id.length < 15)
                );
                
                if (optIndex !== -1) {
                    const updated = [...old];
                    updated[optIndex] = { ...realMsg, user: realMsg.user || currentUser };
                    return updated;
                }
                if (old.some(m => m.id === realMsg.id)) return old;
                return [...old, { ...realMsg, user: realMsg.user || currentUser }];
            });
        },
        onError: (err, variables, context: any) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['messages', channel.id], context.previousMessages);
            }
        },
        onSettled: () => {
            // Only invalidate external state (sidebar unreads)
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: (newStat: string) => api.updateChannelStatus(channel.id, newStat),
        onSuccess: () => queryClient.invalidateQueries()
    });

    const addMembersMutation = useMutation({
        mutationFn: (userIds: string[]) => Promise.all(userIds.map(uid => api.addChannelMember(currentUser, channel.id, uid))),
        onSuccess: () => queryClient.invalidateQueries()
    });

    const deleteMessageMutation = useMutation({
        mutationFn: (messageId: string) => {
            const msg = messages.find(m => m.id === messageId);
            return api.editMessage(currentUser, messageId, `[DELETED] ${msg?.content || ''}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', channel.id] })
    });

    return {
        messages,
        members,
        loading: loadingMessages || loadingMembers,
        sendMessage: (content: string, isSystem?: boolean) => sendMessageMutation.mutate({ content, isSystem }),
        updateStatus: (newStat: string) => updateStatusMutation.mutate(newStat),
        addMembers: (userIds: string[]) => addMembersMutation.mutate(userIds),
        deleteMessage: (messageId: string) => deleteMessageMutation.mutate(messageId),
        hasPerformedInitialScroll,
        setHasPerformedInitialScroll,
        initialLastReadAt: initialLastReadAtRef.current
    };
};
