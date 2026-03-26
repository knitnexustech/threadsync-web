import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, Order, Message, hasPermission } from '../types';
import { api } from '../supabaseAPI';
import { SpecDrawer } from './SpecDrawer';
import { Modal } from './Modal';
import { compressImage } from '../imageUtils';
import { useChat } from '../hooks/useChat';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ChatRoomProps {
    currentUser: User;
    channel: Channel;
    order: Order;
    onBack: () => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, channel, order, onBack }) => {
    const queryClient = useQueryClient();
    const {
        messages, members, loading, sendMessage, updateStatus,
        addMembers, deleteMessage, hasPerformedInitialScroll,
        setHasPerformedInitialScroll, initialLastReadAt
    } = useChat(currentUser, channel);

    const [newMessage, setNewMessage] = useState('');
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

    // Voice Note States
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const recordingTimerRef = useRef<any>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Group editing state
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [editedGroupName, setEditedGroupName] = useState(channel.name);

    // Add Member Modal state
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [teamMembersList, setTeamMembersList] = useState<User[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [isAdding, setIsAdding] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ROLE-BASED PERMISSIONS
    const canAddMembers = hasPermission(currentUser.role, 'ADD_CHANNEL_MEMBER');
    const canEditGroup = hasPermission(currentUser.role, 'EDIT_CHANNEL');
    const canDeleteGroup = hasPermission(currentUser.role, 'DELETE_CHANNEL');
    const canRemoveMembers = hasPermission(currentUser.role, 'REMOVE_CHANNEL_MEMBER');

    const [currentStatus, setCurrentStatus] = useState(channel.status);

    useEffect(() => {
        setEditedGroupName(channel.name);
        setIsEditingGroupName(false);
        setCurrentStatus(channel.status);
    }, [channel.id]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        if (!loading && messages.length > 0 && !hasPerformedInitialScroll) {
            const firstUnread = messages.find(m =>
                initialLastReadAt &&
                new Date(m.timestamp) > new Date(initialLastReadAt) &&
                m.user_id !== currentUser.id
            );

            if (firstUnread) {
                setTimeout(() => {
                    const element = document.getElementById(`msg-${firstUnread.id}`);
                    if (element) element.scrollIntoView({ block: 'center', behavior: 'instant' });
                    else scrollToBottom('instant');
                }, 50);
            } else {
                scrollToBottom('instant');
            }
            setHasPerformedInitialScroll(true);
        } else if (hasPerformedInitialScroll && !loading) {
            scrollToBottom('smooth');
        }
    }, [messages, loading, hasPerformedInitialScroll]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessage(newMessage);
        setNewMessage('');
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStat = e.target.value;
        setCurrentStatus(newStat);
        updateStatus(newStat);
        sendMessage(`Changed status to ${newStat}`, true);
    };

    const [isUploading, setIsUploading] = useState(false);

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert("Your browser does not support audio recording.");
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);
            chunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                if (chunksRef.current.length > 0) {
                    setIsUploading(true);
                    try {
                        (window as any).isKramizUploading = true;
                        const publicUrl = await api.uploadFile(new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' }));
                        sendMessage(`[AUDIO] ${publicUrl}`);
                    } finally { setIsUploading(false); (window as any).isKramizUploading = false; }
                }
                stream.getTracks().forEach(track => track.stop());
            };
            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err: any) { alert("Could not start recording: " + err.message); }
    };

    const stopRecording = (cancel = false) => {
        if (mediaRecorder && isRecording) {
            if (cancel) chunksRef.current = [];
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(recordingTimerRef.current);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            try {
                (window as any).isKramizUploading = true;
                for (const file of Array.from(e.target.files)) {
                    const compressed = await compressImage(file);
                    const url = await api.uploadFile(compressed as File);
                    const tag = file.type.startsWith('image/') ? '[IMAGE]' : '[FILE]';
                    sendMessage(`${tag} ${url} | ${file.name}`);
                }
            } finally { setIsUploading(false); (window as any).isKramizUploading = false; if (fileInputRef.current) fileInputRef.current.value = ''; }
        }
    };

    const handleAddMember = async () => {
        try {
            const team = await api.getTeamMembers(currentUser);
            setTeamMembersList(team);
            setSelectedUserIds(new Set());
            setShowAddMemberModal(true);
        } catch (err) { alert("Failed to load team members"); }
    };

    const renderMessageContent = (content: string) => {
        if (content.startsWith('[IMAGE]')) {
            const url = content.split('|')[0].replace('[IMAGE]', '').trim();
            return <img src={url} alt="Attachment" className="max-w-full rounded-lg max-h-60 object-cover border border-gray-200 cursor-pointer hover:opacity-95" onClick={() => setSelectedImageUrl(url)} />;
        }
        if (content.startsWith('[FILE]')) {
            const parts = content.split('|');
            const url = parts[0].replace('[FILE]', '').trim();
            const name = parts[1]?.trim() || 'Document';
            return <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100"><div className="h-10 w-10 bg-red-100 text-red-500 rounded flex items-center justify-center font-bold text-xs">FILE</div><div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-800 truncate">{name}</div><div className="text-[10px] text-gray-500">Download</div></div></a>;
        }
        if (content.startsWith('[AUDIO]')) {
            return <audio src={content.replace('[AUDIO]', '').trim()} controls className="w-full h-8 mt-2" />;
        }
        return <div className="text-gray-900 break-words">{content}</div>;
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    }, [newMessage]);

    return (
        <div className="flex h-full w-full relative">
            <div className="flex flex-col h-full bg-[#efeae2] relative flex-1">
                <div className="bg-[#008069] text-white px-4 py-3 flex items-center shadow-md z-30 justify-between safe-pt">
                    <div className="flex items-center flex-1 min-w-0">
                        <button onClick={onBack} className="mr-3 md:hidden"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-12">
                                <h2 className="font-bold text-lg truncate">{channel.name}</h2>
                                <select value={currentStatus} onChange={handleStatusChange} className="text-[12px] px-2 py-0.5 rounded-full border-none focus:ring-0 cursor-pointer font-bold bg-white/20 text-white"><option value="PENDING">PENDING</option><option value="IN_PROGRESS">ACTIVE</option><option value="COMPLETED">DONE</option></select>
                            </div>
                            <p className="text-xs text-green-100 truncate">{order.order_number} • {order.style_number}</p>
                        </div>
                    </div>
                    <button onClick={() => setShowGroupInfo(true)} className="p-2 hover:bg-white/10 rounded-full"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                </div>

                <SpecDrawer channel={channel} currentUser={currentUser} />

                <div className="flex-1 overflow-y-auto p-4 space-y-2 whatsapp-bg">
                    {messages.map(msg => {
                        const isMe = msg.user_id === currentUser.id;
                        const isDeleted = msg.content?.startsWith('[DELETED]');
                        if (msg.is_system_update) return <div key={msg.id} className="flex justify-center my-3"><span className="bg-[#d5f4e6] text-gray-700 text-xs px-4 py-1.5 rounded-full">{msg.content}</span></div>;
                        return (
                            <div key={msg.id} id={`msg-${msg.id}`} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} group max-w-full`}>
                                {isMe && !isDeleted && <button onClick={() => setDeletingMessageId(msg.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500">✕</button>}
                                <div className={`max-w-[75%] rounded-xl px-3 py-1.5 shadow-sm text-sm relative ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                    {!isMe && <div className="mb-1 text-[14px] font-bold text-[#008069]">{msg.user?.name}</div>}
                                    <div className="pr-16 pb-1">{isDeleted ? <span className="text-gray-400 italic">Deleted</span> : renderMessageContent(msg.content)}</div>
                                    <div className="text-[9px] text-gray-400 absolute bottom-1 right-2">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-2 relative safe-pb border-t border-gray-200">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                    <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#008069] hover:bg-white rounded-full transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                    {showAttachMenu && (
                        <div className="absolute bottom-16 left-4 bg-white shadow-2xl rounded-2xl p-2 z-50 border border-gray-100 animate-in slide-in-from-bottom-2 duration-200">
                            <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left rounded-xl transition-colors">
                                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-xl">📁</div>
                                <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Gallery & Files</span><span className="text-[10px] text-gray-400">Images, PDFs, etc.</span></div>
                            </button>
                        </div>
                    )}
                    
                    <div className="flex-1 flex items-end gap-2 bg-white rounded-2xl px-3 py-1 shadow-sm border border-gray-100 minimal-scrollbar overflow-hidden">
                        <textarea
                            ref={textareaRef}
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend(e);
                                }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 py-2 px-1 bg-transparent border-none focus:ring-0 text-[15px] resize-none minimal-scrollbar"
                            style={{ minHeight: '44px', maxHeight: '150px' }}
                        />
                    </div>

                    {isRecording && (
                        <button onClick={() => stopRecording(true)} className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                            ✕
                        </button>
                    )}

                    <button 
                        onClick={isRecording ? () => stopRecording(false) : (newMessage.trim() ? handleSend : startRecording)} 
                        className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl text-white shadow-lg transition-all active:scale-95 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#008069]'}`}
                    >
                        {isRecording ? (
                            <span className="font-bold text-xs">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                        ) : newMessage.trim() ? (
                            <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {showGroupInfo && (
                <div className="w-80 bg-white border-l h-full absolute right-0 top-0 z-40 shadow-xl md:static">
                    <div className="bg-[#f0f2f5] p-4 flex items-center gap-3 border-b"><button onClick={() => setShowGroupInfo(false)}>✕</button><h3 className="font-semibold">Group Info</h3></div>
                    <div className="p-8 text-center border-b">
                        <h2 className="text-2xl font-black">{channel.name}</h2>
                        <p className="text-sm text-gray-500">{order.order_number}</p>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4"><h4 className="text-xs font-bold text-gray-400 uppercase">Participants</h4>{canAddMembers && <button onClick={handleAddMember} className="text-xs text-[#008069] font-bold">+ Add</button>}</div>
                        <div className="space-y-3">{members.map(m => (<div key={m.id} className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center font-bold">{m.name[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{m.name}</p></div></div>))}</div>
                    </div>
                </div>
            )}

            <Modal isOpen={deletingMessageId !== null} onClose={() => setDeletingMessageId(null)} title="Delete Message?">
                <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to delete this message? This action cannot be undone.</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={() => setDeletingMessageId(null)} className="px-6 py-2.5 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-all">Cancel</button>
                    <button onClick={() => { deleteMessage(deletingMessageId!); setDeletingMessageId(null); }} className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all">Delete</button>
                </div>
            </Modal>
            <Modal isOpen={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} title="Add Members">
                <div className="max-h-60 overflow-y-auto space-y-2 minimal-scrollbar pr-1">
                    {teamMembersList.map(u => { 
                        const added = members.some(m => m.id === u.id); 
                        return (
                            <div key={u.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-2xl bg-gray-50/50">
                                <span className="text-sm font-bold text-gray-700">{u.name}</span>
                                {added ? (
                                    <span className="text-[10px] bg-green-100 text-[#008069] px-2 py-0.5 rounded-full font-black uppercase tracking-tight">Active</span>
                                ) : (
                                    <input 
                                        type="checkbox" 
                                        checked={selectedUserIds.has(u.id)} 
                                        onChange={() => { 
                                            const next = new Set(selectedUserIds); 
                                            if (next.has(u.id)) next.delete(u.id); else next.add(u.id); 
                                            setSelectedUserIds(next); 
                                        }} 
                                        className="w-5 h-5 rounded-lg border-gray-200 text-[#008069] focus:ring-[#008069]"
                                    />
                                )}
                            </div>
                        ); 
                    })}
                </div>
                <button 
                    onClick={() => { addMembers(Array.from(selectedUserIds)); setShowAddMemberModal(false); }} 
                    disabled={selectedUserIds.size === 0}
                    className="w-full mt-6 py-3 bg-[#008069] text-white rounded-2xl font-bold shadow-lg hover:bg-[#006a57] disabled:opacity-40 transition-all"
                >
                    Add Selected Members
                </button>
            </Modal>
        </div>
    );
};
