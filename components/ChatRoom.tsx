
import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, PurchaseOrder, Message, hasPermission } from '../types';
import { api } from '../supabaseAPI';
import { SpecDrawer } from './SpecDrawer';
import { Modal } from './Modal';
import { compressImage } from '../imageUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playNotificationSound, triggerVibration } from '../notificationUtils';
import { supabase } from '../supabaseClient';

interface ChatRoomProps {
    currentUser: User;
    channel: Channel;
    po: PurchaseOrder;
    onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, channel, po, onBack }) => {
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState('');
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

    // Voice Note States
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const recordingTimerRef = useRef<any>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

    // Channel editing state
    const [isEditingChannelName, setIsEditingChannelName] = useState(false);
    const [editedChannelName, setEditedChannelName] = useState(channel.name);

    // Add Member Modal state
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [isAdding, setIsAdding] = useState(false);

    // Queries
    const { data: messages = [], isLoading: loadingMessages } = useQuery({
        queryKey: ['messages', channel.id],
        queryFn: () => api.getMessages(currentUser, channel.id),
    });

    const { data: members = [], isLoading: loadingMembers } = useQuery({
        queryKey: ['members', channel.id],
        queryFn: () => api.getChannelMembers(channel.id),
    });

    const loading = loadingMessages || loadingMembers;

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ROLE-BASED PERMISSIONS
    const canAddMembers = hasPermission(currentUser.role, 'ADD_CHANNEL_MEMBER');
    const canEditChannel = hasPermission(currentUser.role, 'EDIT_CHANNEL');
    const canDeleteChannel = hasPermission(currentUser.role, 'DELETE_CHANNEL');
    const canRemoveMembers = hasPermission(currentUser.role, 'REMOVE_CHANNEL_MEMBER');

    const canDeleteMessage = (message: Message) => message.user_id === currentUser.id;

    const [currentStatus, setCurrentStatus] = useState(channel.status);

    useEffect(() => {
        setEditedChannelName(channel.name);
        setIsEditingChannelName(false);
        setCurrentStatus(channel.status);
    }, [channel.id, channel.name, channel.status]);

    // Help show notification (Fixed for Mobile Support)
    const showNotification = async (title: string, body: string) => {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        // Try Service Worker first (Required for Mobile/PWA)
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            if (registration) {
                registration.showNotification(title, {
                    body,
                    icon: '/Kramiz%20app%20icon.png',
                    badge: '/favicon.png',
                    vibrate: [100, 50, 100],
                    data: { url: window.location.href }
                } as any);
                return;
            }
        }

        // Fallback or Desktop only
        new Notification(title, {
            body,
            icon: '/Kramiz%20app%20icon.png',
            badge: '/favicon.png'
        });
    };

    // Mark as read when entering the room
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

                // 1. Update the local cache
                queryClient.setQueryData(['messages', channel.id], (old: Message[] | undefined) => {
                    if (!old) return [newMsg];

                    // Improved duplicate check: 
                    // If we have an optimistic message (ID is a random string vs UUID), 
                    // match by content and user_id to replace it instead of appending.
                    const isDuplicate = old.some(m => m.id === newMsg.id);
                    if (isDuplicate) return old;

                    // Find if there's an optimistic version of this message
                    const optimisticIndex = old.findIndex(m =>
                        m.user_id === newMsg.user_id &&
                        m.content === newMsg.content &&
                        m.id.length < 20 // Crude check for Math.random() ID vs UUID
                    );

                    if (optimisticIndex !== -1) {
                        const updated = [...old];
                        updated[optimisticIndex] = newMsg;
                        return updated;
                    }

                    return [...old, newMsg];
                });

                // 2. Play alert and show notification
                if (newMsg.user_id !== currentUser.id && !newMsg.is_system_update) {
                    playNotificationSound();
                    triggerVibration();

                    if (document.visibilityState === 'hidden') {
                        showNotification(`New Message in ${channel.name}`, newMsg.content);
                    } else {
                        // If user is already in the room, mark as read immediately in DB
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
                    // For updates/deletes, force a clean refresh
                    queryClient.invalidateQueries({ queryKey: ['messages', channel.id] });
                }
            })
            .subscribe();

        // Global check for notifications when this specific chat is NOT the only thing on screen
        // or for general tab focus
        const handleFocus = () => {
            queryClient.invalidateQueries({ queryKey: ['messages', channel.id] });
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            supabase.removeChannel(channelSubscription);
            window.removeEventListener('focus', handleFocus);
        };
    }, [channel.id, channel.name, currentUser.id, queryClient]);

    // Mutations
    const sendMessageMutation = useMutation({
        mutationFn: ({ content, isSystem }: { content: string, isSystem?: boolean }) =>
            api.sendMessage(currentUser, channel.id, content, isSystem),
        // OPTIMISTIC UPDATE: Show message immediately
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
        onError: (err: any, variables, context: any) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['messages', channel.id], context.previousMessages);
            }
            alert("Failed to send: " + err.message);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', channel.id] });
        }
    });

    const handleRefresh = () => {
        queryClient.invalidateQueries();
    };

    const updateStatusMutation = useMutation({
        mutationFn: (newStat: string) => api.updateChannelStatus(channel.id, newStat),
        onSuccess: () => handleRefresh()
    });

    const addMembersMutation = useMutation({
        mutationFn: (userIds: string[]) => Promise.all(userIds.map(uid => api.addChannelMember(currentUser, channel.id, uid))),
        onSuccess: () => handleRefresh()
    });

    const editChannelMutation = useMutation({
        mutationFn: (name: string) => api.updateChannel(currentUser, channel.id, { name }),
        onSuccess: () => handleRefresh()
    });

    const deleteChannelMutation = useMutation({
        mutationFn: () => api.deleteChannel(currentUser, channel.id),
        onSuccess: () => handleRefresh()
    });

    const removeMemberMutation = useMutation({
        mutationFn: (userId: string) => api.removeChannelMember(currentUser, channel.id, userId),
        onSuccess: () => handleRefresh(),
        onError: (err: any) => alert(err.message || "Failed to remove member")
    });

    const deleteMessageMutation = useMutation({
        mutationFn: (messageId: string) => {
            const msg = messages.find(m => m.id === messageId);
            return api.editMessage(currentUser, messageId, `[DELETED] ${msg?.content || ''}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', channel.id] });
            setDeletingMessageId(null);
        },
        onError: (err: any) => alert(err.message || "Failed to delete message")
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const msg = newMessage;
        setNewMessage('');
        sendMessageMutation.mutate({ content: msg });
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStat = e.target.value;
        setCurrentStatus(newStat);
        updateStatusMutation.mutate(newStat);
        sendMessageMutation.mutate({ content: `Changed status to ${newStat}`, isSystem: true });
    };

    const handleAttachmentOption = (type: string) => {
        if (type === 'Contact') {
            sendMessageMutation.mutate({ content: "👤 [Shared Contact]" });
            setShowAttachMenu(false);
        } else {
            (window as any).isKramizUploading = true; // Set flag IMMEDIATELY before picker opens
            fileInputRef.current?.click();
            setShowAttachMenu(false);

            // Safety timeout: if no file is selected within 60s, clear the flag
            setTimeout(() => {
                if (!(fileInputRef.current?.files?.length) && (window as any).isKramizUploading) {
                    (window as any).isKramizUploading = false;
                }
            }, 60000);
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    // Voice Recording Logic
    const startRecording = async () => {
        try {
            // Check if mediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Your browser does not support audio recording.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                if (chunksRef.current.length > 0) {
                    await handleVoiceUpload(audioBlob);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err: any) {
            console.error("Microphone Error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("Microphone access denied. Please enable microphone permissions in your browser settings to send voice notes.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                alert("No microphone detected. Please connect a microphone and try again.");
            } else {
                alert("Could not start recording: " + err.message);
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(recordingTimerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorder && isRecording) {
            chunksRef.current = []; // Clear chunks so onstop doesn't upload
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(recordingTimerRef.current);
        }
    };

    const handleVoiceUpload = async (blob: Blob) => {
        setIsUploading(true);
        try {
            (window as any).isKramizUploading = true;
            const fileName = `voice_${Date.now()}.webm`;
            const file = new File([blob], fileName, { type: 'audio/webm' });
            const publicUrl = await api.uploadFile(file);
            sendMessageMutation.mutate({ content: `[AUDIO] ${publicUrl}` });
        } catch (err: any) {
            alert("Voice note upload failed: " + err.message);
        } finally {
            setIsUploading(false);
            (window as any).isKramizUploading = false;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            setIsUploading(true);

            try {
                // Ensure flag is set during the async compression/upload phase
                (window as any).isKramizUploading = true;
                for (const file of selectedFiles) {
                    // Compress if image
                    const fileToUpload = await compressImage(file);

                    const publicUrl = await api.uploadFile(fileToUpload as File);
                    let msgContent = file.type.startsWith('image/') ? `[IMAGE] ${publicUrl} | ${file.name}` : `[FILE] ${publicUrl} | ${file.name}`;
                    sendMessageMutation.mutate({ content: msgContent });
                }
            } catch (err: any) {
                console.error(err);
                alert("Upload failed: " + err.message);
            } finally {
                setIsUploading(false);
                (window as any).isKramizUploading = false;
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const renderMessageContent = (content: string) => {
        if (content.startsWith('[IMAGE]')) {
            const parts = content.split('|');
            const url = parts[0].replace('[IMAGE]', '').trim();
            return (
                <div className="mt-1">
                    <img
                        src={url}
                        alt="Attachment"
                        className="max-w-full rounded-lg max-h-60 object-cover border border-gray-200 cursor-pointer hover:opacity-95 transition-all"
                        onClick={() => setSelectedImageUrl(url)}
                    />
                </div>
            );
        }
        if (content.startsWith('[FILE]')) {
            const parts = content.split('|');
            const url = parts[0].replace('[FILE]', '').trim();
            const name = parts[1] ? parts[1].trim() : 'Document';
            return <div className="mt-1"><a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"><div className="h-10 w-10 bg-red-100 text-red-500 rounded flex items-center justify-center font-bold text-xs">FILE</div><div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-800 truncate">{name}</div><div className="text-[10px] text-gray-500 uppercase">Download</div></div></a></div>;
        }
        if (content.startsWith('[AUDIO]')) {
            const url = content.replace('[AUDIO]', '').trim();
            return (
                <div className="mt-2 w-64 max-w-full">
                    <audio src={url} controls className="w-full h-8" />
                </div>
            );
        }
        return <div className="text-gray-900 break-words">{content}</div>;
    }

    const handleAddMember = async () => {
        try {
            const team = await api.getTeamMembers(currentUser);
            setTeamMembers(team);
            setSelectedUserIds(new Set());
            setShowAddMemberModal(true);
        } catch (err) { alert("Failed to load team members"); }
    };

    const toggleMemberSelection = (userId: string) => {
        const newSet = new Set(selectedUserIds);
        if (newSet.has(userId)) newSet.delete(userId); else newSet.add(userId);
        setSelectedUserIds(newSet);
    };

    const commitAddMembers = async () => {
        if (selectedUserIds.size === 0) { setShowAddMemberModal(false); return; }
        setIsAdding(true);
        addMembersMutation.mutate(Array.from(selectedUserIds), {
            onSettled: () => setIsAdding(false)
        });
    };

    const handleRemoveMember = async (userId: string, userName: string) => {
        if (!confirm(`Remove ${userName}?`)) return;
        removeMemberMutation.mutate(userId);
    };

    const confirmDeleteMessage = async () => {
        if (!deletingMessageId) return;
        deleteMessageMutation.mutate(deletingMessageId);
    };

    const handleSaveChannelName = () => {
        if (!editedChannelName.trim()) return;
        editChannelMutation.mutate(editedChannelName);
    };

    const handleDeleteChannel = () => {
        if (!confirm(`Delete "${channel.name}"?`)) return;
        deleteChannelMutation.mutate();
    };

    return (
        <div className="flex h-full w-full relative">
            <div className="flex flex-col h-full bg-[#efeae2] relative flex-1">
                {/* Header */}
                <div className="bg-[#008069] text-white px-4 py-3 flex items-center shadow-md z-30 justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                        <button onClick={onBack} className="mr-3 md:hidden"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-12"><h2 className="font-bold text-lg truncate">{channel.name}</h2><select id="tour-status-dropdown" value={currentStatus} onChange={handleStatusChange} className={`text-[12px] px-2 py-0.75 rounded-full border-none focus:ring-0 cursor-pointer font-bold ${currentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' : currentStatus === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}><option value="PENDING">PENDING</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="COMPLETED">COMPLETED</option></select></div>
                            <p className="text-xs text-green-100 truncate">{po.order_number} • {po.style_number}</p>
                        </div>
                    </div>
                    <button id="tour-group-info-btn" onClick={() => setShowGroupInfo(true)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></button>
                </div>

                <SpecDrawer channel={channel} currentUser={currentUser} />

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 whatsapp-bg bg-cover">
                    {loading ? (<div className="text-center py-4 text-gray-500">Loading messages...</div>) : (
                        messages.map((msg) => {
                            const isMe = msg.user_id === currentUser.id;
                            const isSystem = msg.is_system_update;
                            const isDeleted = msg.content?.startsWith('[DELETED]');
                            const canDelete = canDeleteMessage(msg) && !isDeleted;
                            const showDropdown = openDropdownId === msg.id;
                            if (isSystem) return <div key={msg.id} className="flex justify-center my-3"><span className="bg-[#d5f4e6] text-gray-700 text-xs px-4 py-1.5 rounded-full shadow-sm">{msg.content}</span></div>;
                            return (
                                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} group max-w-full`}>
                                    {isMe && canDelete && (
                                        <button
                                            onClick={() => setDeletingMessageId(msg.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 active:text-red-600 transition-colors duration-200 mb-1 flex-shrink-0"
                                            title="Delete message"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                    <div className={`max-w-[75%] rounded-xl px-3 py-1.5 shadow-sm text-sm relative ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                        {!isMe && (
                                            <div className="mb-1 flex items-center gap-2">
                                                <span className="text-[14px] font-bold text-[#008069] leading-tight">{msg.user?.name}</span>
                                                <span className="text-[10px] font-black bg-gray-200 text-gray-500 px-1 py-0 rounded border border-gray-300 uppercase tracking-tighter">
                                                    {msg.user?.role.replace('_', ' ')}
                                                </span>
                                            </div>
                                        )}
                                        <div className="pr-20 pb-1">{isDeleted ? <div className="text-gray-400 italic text-[11px]">Deleted</div> : renderMessageContent(msg.content)}</div>
                                        <div className="text-[9px] text-gray-400 absolute bottom-1 right-2">
                                            {new Date(msg.timestamp).toLocaleDateString([], { day: '2-digit', month: 'short' })} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-2 relative">
                    {!isRecording ? (
                        <>
                            <button id="tour-attach-btn" type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            </button>

                            {showAttachMenu && (
                                <div className="absolute bottom-14 left-4 bg-white shadow-2xl rounded-2xl p-1 w-52 z-50 border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                                    <button
                                        type="button"
                                        disabled={isUploading}
                                        onClick={() => handleAttachmentOption('All')}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-green-50 text-left transition-colors disabled:opacity-50"
                                    >
                                        <div className="h-10 w-10 rounded-xl bg-green-100 text-[#008069] flex items-center justify-center text-xl">
                                            {isUploading ? <div className="w-5 h-5 border-2 border-[#008069] border-t-transparent animate-spin rounded-full"></div> : '📁'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-gray-800 tracking-tight">Gallery & Files</span>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Photos / Tech Packs</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            <input id="tour-chat-input" type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend(e)} placeholder="Type a message..." className="flex-1 py-2.5 px-4 rounded-full border-none focus:ring-0 text-sm shadow-sm" />

                            {newMessage.trim() || isUploading ? (
                                <button type="button" onClick={handleSend} disabled={!newMessage.trim() || isUploading} className={`p-3 rounded-full shadow-md transition-all active:scale-95 ${newMessage.trim() ? 'bg-[#008069] text-white' : 'bg-gray-300 text-gray-500'}`}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                                </button>
                            ) : (
                                <button type="button" onClick={startRecording} className="p-3 bg-[#008069] text-white rounded-full shadow-md transition-all active:scale-95 hover:bg-[#006a57]">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-between bg-white rounded-full px-4 py-2 shadow-sm animate-in slide-in-from-right-2">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium text-gray-700">{formatTime(recordingTime)}</span>
                                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest ml-2">Recording...</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={cancelRecording} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors font-bold text-xs uppercase">Cancel</button>
                                <button type="button" onClick={stopRecording} className="p-2.5 bg-[#008069] text-white rounded-full shadow-md active:scale-95 transition-all">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Group Info */}
            {showGroupInfo && (
                <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto absolute right-0 top-0 z-40 shadow-xl md:static">
                    <div className="bg-[#f0f2f5] p-4 flex items-center gap-3 border-b border-gray-200"><button onClick={() => setShowGroupInfo(false)} className="text-gray-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button><h3 className="font-semibold text-gray-800">Group Info</h3></div>
                    <div className="p-8 flex flex-col items-center border-b border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                            {isEditingChannelName ? (
                                <div className="flex items-center gap-2"><input type="text" value={editedChannelName} onChange={(e) => setEditedChannelName(e.target.value)} className="text-xl font-black border-b-2 border-[#008069] focus:outline-none w-full max-w-[200px]" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveChannelName()} /><button onClick={handleSaveChannelName} className="text-green-600">✓</button></div>
                            ) : (
                                <><h2 className="text-2xl font-black text-gray-900">{channel.name}</h2>{canEditChannel && <button id="tour-edit-channel-btn" onClick={() => setIsEditingChannelName(true)} className="p-2 text-gray-400 hover:text-[#008069]">✎</button>}</>
                            )}
                        </div>
                        <p className="text-sm font-medium text-gray-500">{po.order_number}</p>
                    </div>
                    <div id="tour-group-participants" className="p-6 space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-4"><h4 className="text-xs font-bold text-gray-400 uppercase">Participants</h4>{canAddMembers && <button id="tour-add-member-btn" onClick={handleAddMember} className="text-[10px] font-bold text-[#008069]">+ Add Member</button>}</div>
                            <div className="space-y-3">{members.map(m => (<div key={m.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-50 group"><div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">{m.name[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-800 truncate">{m.name}{m.id === currentUser.id && ' (You)'}</p><p className="text-[10px] text-gray-500 uppercase tracking-widest">{m.company?.name || '...'}</p></div>{canRemoveMembers && m.id !== currentUser.id && m.role !== 'ADMIN' && <button onClick={() => handleRemoveMember(m.id, m.name)} className="opacity-0 group-hover:opacity-100 text-red-400">✕</button>}</div>))}</div>
                        </div>
                        {canDeleteChannel && <div className="pt-8 border-t"><button id="tour-delete-group-btn" onClick={handleDeleteChannel} className="w-full py-3 border-2 border-dashed border-red-100 text-red-500 text-xs font-bold uppercase rounded-xl hover:bg-red-50">Delete Group</button></div>}
                    </div>
                </div>
            )}

            <Modal isOpen={deletingMessageId !== null} onClose={() => setDeletingMessageId(null)} title="Delete Message?"><div className="space-y-4"><p className="text-sm">Delete this message? This action is permanent.</p><div className="flex gap-3 justify-end"><button onClick={() => setDeletingMessageId(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button><button onClick={confirmDeleteMessage} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button></div></div></Modal>
            <Modal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} title="Add Members" footer={<button onClick={commitAddMembers} disabled={selectedUserIds.size === 0 || isAdding} className={`px-4 py-2 rounded ${selectedUserIds.size > 0 ? 'bg-[#008069] text-white' : 'bg-gray-300'}`}>{isAdding ? 'Adding...' : 'Add Selected'}</button>}>
                <div className="max-h-80 overflow-y-auto space-y-2">{teamMembers.map(user => { const added = members.some(m => m.id === user.id); return (<div key={user.id} className={`flex items-center justify-between p-3 border rounded ${added ? 'bg-gray-50 opacity-60' : 'bg-white'}`}><div className="flex items-center gap-3"><div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-bold">{user.name[0]}</div><div><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-gray-500">{user.role}</p></div></div>{added ? <span className="text-xs text-green-600 font-bold">Added</span> : <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => toggleMemberSelection(user.id)} />}</div>); })}</div>
            </Modal>

            {/* Image Preview Modal */}
            {/* Premium Full-Screen Image Preview */}
            {selectedImageUrl && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300"
                    onClick={() => setSelectedImageUrl(null)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setSelectedImageUrl(null)}
                        className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[110] border border-white/20"
                    >
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Image Container */}
                    <div className="relative w-full h-full p-4 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedImageUrl}
                            alt="Full Screen Preview"
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm animate-in zoom-in-95 duration-300"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
