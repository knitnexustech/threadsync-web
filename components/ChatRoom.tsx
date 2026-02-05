
import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, PurchaseOrder, Message, hasPermission } from '../types';
import { api } from '../supabaseAPI';
import { SpecDrawer } from './SpecDrawer';
import { Modal } from './Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

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

    // Help show notification
    const showNotification = (title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/app-icon.png',
                badge: '/app-icon.png'
            });
        }
    };

    // Realtime Subscription
    useEffect(() => {
        const channelSubscription = supabase
            .channel(`messages:${channel.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${channel.id}`
            }, (payload) => {
                const newMsg = payload.new as Message;
                // Don't show notification for own messages or system updates
                if (newMsg.user_id !== currentUser.id && !newMsg.is_system_update) {
                    showNotification(`New Message in ${channel.name}`, newMsg.content);
                }
                queryClient.invalidateQueries({ queryKey: ['messages', channel.id] });
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${channel.id}`
            }, (payload) => {
                // For updates/deletes, just refresh
                if (payload.eventType !== 'INSERT') {
                    queryClient.invalidateQueries({ queryKey: ['messages', channel.id] });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channelSubscription); };
    }, [channel.id, channel.name, currentUser.id, queryClient]);

    // Mutations
    const sendMessageMutation = useMutation({
        mutationFn: ({ content, isSystem }: { content: string, isSystem?: boolean }) =>
            api.sendMessage(currentUser, channel.id, content, isSystem),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', channel.id] })
    });

    const updateStatusMutation = useMutation({
        mutationFn: (newStat: string) => api.updateChannelStatus(channel.id, newStat),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
    });

    const addMembersMutation = useMutation({
        mutationFn: (userIds: string[]) => Promise.all(userIds.map(uid => api.addChannelMember(currentUser, channel.id, uid))),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['members', channel.id] });
            setShowAddMemberModal(false);
        }
    });

    const editChannelMutation = useMutation({
        mutationFn: (name: string) => api.updateChannel(currentUser, channel.id, { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setIsEditingChannelName(false);
        }
    });

    const deleteChannelMutation = useMutation({
        mutationFn: () => api.deleteChannel(currentUser, channel.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            onBack();
        }
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
            fileInputRef.current?.click();
            setShowAttachMenu(false);
        }
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            setIsUploading(true);

            try {
                for (const file of selectedFiles) {
                    const publicUrl = await api.uploadFile(file);
                    let msgContent = file.type.startsWith('image/') ? `[IMAGE] ${publicUrl} | ${file.name}` : `[FILE] ${publicUrl} | ${file.name}`;
                    sendMessageMutation.mutate({ content: msgContent });
                }
            } catch (err: any) {
                console.error(err);
                alert("Upload failed: " + err.message);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const renderMessageContent = (content: string) => {
        if (content.startsWith('[IMAGE]')) {
            const parts = content.split('|');
            const url = parts[0].replace('[IMAGE]', '').trim();
            return <div className="mt-1"><img src={url} alt="Attachment" className="max-w-full rounded-lg max-h-60 object-cover border border-gray-200" /></div>;
        }
        if (content.startsWith('[FILE]')) {
            const parts = content.split('|');
            const url = parts[0].replace('[FILE]', '').trim();
            const name = parts[1] ? parts[1].trim() : 'Document';
            return <div className="mt-1"><a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"><div className="h-10 w-10 bg-red-100 text-red-500 rounded flex items-center justify-center font-bold text-xs">FILE</div><div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-800 truncate">{name}</div><div className="text-[10px] text-gray-500 uppercase">Download</div></div></a></div>;
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
        try {
            await api.removeChannelMember(currentUser, channel.id, userId);
            queryClient.invalidateQueries({ queryKey: ['members', channel.id] });
        } catch (err: any) { alert(err.message || "Failed"); }
    };

    const confirmDeleteMessage = async () => {
        if (!deletingMessageId) return;
        try {
            const msg = messages.find(m => m.id === deletingMessageId);
            if (msg) {
                await api.editMessage(currentUser, deletingMessageId, `[DELETED] ${msg.content}`);
                queryClient.invalidateQueries({ queryKey: ['messages', channel.id] });
            }
            setDeletingMessageId(null);
        } catch (err: any) { alert(err.message || "Failed"); }
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
                            <div className="flex items-center gap-12"><h2 className="font-bold text-lg truncate">{channel.name}</h2><select value={currentStatus} onChange={handleStatusChange} className={`text-[12px] px-2 py-0.75 rounded-full border-none focus:ring-0 cursor-pointer font-bold ${currentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' : currentStatus === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}><option value="PENDING">PENDING</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="COMPLETED">COMPLETED</option></select></div>
                            <p className="text-xs text-green-100 truncate">{po.order_number} • {po.style_number}</p>
                        </div>
                    </div>
                    <button onClick={() => setShowGroupInfo(true)} className="hover:bg-white/10 p-2 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></button>
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
                                <div key={msg.id} className={`flex items-end gap-1 ${isMe ? 'justify-end' : 'justify-start'} group`} onMouseEnter={() => setHoveredMessageId(msg.id)} onMouseLeave={() => { setHoveredMessageId(null); setOpenDropdownId(null); }}>
                                    {isMe && hoveredMessageId === msg.id && canDelete && (
                                        <div className="relative mb-1">
                                            <button onClick={() => setOpenDropdownId(showDropdown ? null : msg.id)} className="p-1 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100"><svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg></button>
                                            {showDropdown && <div className="absolute left-0 bottom-full mb-1 bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden z-20 min-w-[100px]"><button onClick={() => { setDeletingMessageId(msg.id); setOpenDropdownId(null); }} className="w-full px-4 py-2.5 text-sm hover:bg-red-50 text-red-600">Delete</button></div>}
                                        </div>
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
                                        <div className="pr-10 pb-1">{isDeleted ? <div className="text-gray-400 italic text-[11px]">Deleted</div> : renderMessageContent(msg.content)}</div>
                                        <div className="text-[9px] text-gray-400 absolute bottom-1 right-2">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-2 relative">
                    <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                    {showAttachMenu && (
                        <div className="absolute bottom-12 left-0 bg-white shadow-2xl rounded-2xl p-1 w-48 z-50 border border-gray-100 overflow-hidden divide-y divide-gray-50">
                            <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => handleAttachmentOption('Image')}
                                className="w-full flex items-center gap-3 p-3 hover:bg-green-50 text-left transition-colors disabled:opacity-50"
                            >
                                <div className="h-8 w-8 rounded-lg bg-green-100 text-[#008069] flex items-center justify-center">
                                    {isUploading ? <div className="w-4 h-4 border-2 border-[#008069] border-t-transparent animate-spin rounded-full"></div> : '📷'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-800 tracking-tight">Images</span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Photos / Art</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => handleAttachmentOption('Document')}
                                className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 text-left transition-colors disabled:opacity-50"
                            >
                                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                    {isUploading ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent animate-spin rounded-full"></div> : '📄'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-gray-800 tracking-tight">Documents</span>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Tech Packs</span>
                                </div>
                            </button>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                    />
                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 py-3 px-4 rounded-full border-none focus:ring-0 text-sm shadow-sm" />
                    <button type="submit" disabled={!newMessage.trim()} className={`p-3 rounded-full shadow-md ${newMessage.trim() ? 'bg-[#008069] text-white' : 'bg-gray-300 text-gray-500'}`}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg></button>
                </form>
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
                                <><h2 className="text-2xl font-black text-gray-900">{channel.name}</h2>{canEditChannel && <button onClick={() => setIsEditingChannelName(true)} className="p-2 text-gray-400 hover:text-[#008069]">✎</button>}</>
                            )}
                        </div>
                        <p className="text-sm font-medium text-gray-500">{po.order_number}</p>
                    </div>
                    <div className="p-6 space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-4"><h4 className="text-xs font-bold text-gray-400 uppercase">Participants</h4>{canAddMembers && <button onClick={handleAddMember} className="text-[10px] font-bold text-[#008069]">+ Add Member</button>}</div>
                            <div className="space-y-3">{members.map(m => (<div key={m.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-50 group"><div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">{m.name[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-800 truncate">{m.name}{m.id === currentUser.id && ' (You)'}</p><p className="text-[10px] text-gray-500 uppercase tracking-widest">{m.company?.name || '...'}</p></div>{canRemoveMembers && m.id !== currentUser.id && m.role !== 'ADMIN' && <button onClick={() => handleRemoveMember(m.id, m.name)} className="opacity-0 group-hover:opacity-100 text-red-400">✕</button>}</div>))}</div>
                        </div>
                        {canDeleteChannel && <div className="pt-8 border-t"><button onClick={handleDeleteChannel} className="w-full py-3 border-2 border-dashed border-red-100 text-red-500 text-xs font-bold uppercase rounded-xl hover:bg-red-50">Delete Group</button></div>}
                    </div>
                </div>
            )}

            <Modal isOpen={deletingMessageId !== null} onClose={() => setDeletingMessageId(null)} title="Delete Message?"><div className="space-y-4"><p className="text-sm">Delete this message? This action is permanent.</p><div className="flex gap-3 justify-end"><button onClick={() => setDeletingMessageId(null)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button><button onClick={confirmDeleteMessage} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button></div></div></Modal>
            <Modal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} title="Add Members" footer={<button onClick={commitAddMembers} disabled={selectedUserIds.size === 0 || isAdding} className={`px-4 py-2 rounded ${selectedUserIds.size > 0 ? 'bg-[#008069] text-white' : 'bg-gray-300'}`}>{isAdding ? 'Adding...' : 'Add Selected'}</button>}>
                <div className="max-h-80 overflow-y-auto space-y-2">{teamMembers.map(user => { const added = members.some(m => m.id === user.id); return (<div key={user.id} className={`flex items-center justify-between p-3 border rounded ${added ? 'bg-gray-50 opacity-60' : 'bg-white'}`}><div className="flex items-center gap-3"><div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-bold">{user.name[0]}</div><div><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-gray-500">{user.role}</p></div></div>{added ? <span className="text-xs text-green-600 font-bold">Added</span> : <input type="checkbox" checked={selectedUserIds.has(user.id)} onChange={() => toggleMemberSelection(user.id)} />}</div>); })}</div>
            </Modal>
        </div>
    );
};
