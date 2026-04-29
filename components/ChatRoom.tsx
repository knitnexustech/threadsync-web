import React, { useState, useEffect, useRef } from 'react';
import { User, Channel, Order, Message, hasPermission } from '../types';
import { api } from '../supabaseAPI';
import { SpecDrawer } from './SpecDrawer';
import { Modal } from './Modal';
import { compressImage } from '../imageUtils';
import { useChat } from '../hooks/useChat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isNative, shareFile, shareContent } from '../capacitorUtils';
import { KramizSharePopup } from './KramizSharePopup';
import { DCForm } from '@/features/delivery-challan/components/DCForm';
import { InwardChallanForm } from '@/features/inward-challan/components/InwardChallanForm';
import { QuickSalesInvoiceForm } from '@/features/invoices/components/QuickSalesInvoiceForm';
import { QuickPurchaseInvoiceForm } from '@/features/invoices/components/QuickPurchaseInvoiceForm';
import { SimpleExpenseForm } from '@/features/invoices/components/SimpleExpenseForm';
import { ChallanDetailView } from '@/features/delivery-challan/components/ChallanDetailView';

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
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [openUpwards, setOpenUpwards] = useState(false);
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedTargetChannelIds, setSelectedTargetChannelIds] = useState<Set<string>>(new Set());

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
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Document Modal states
    const [showDCForm, setShowDCForm] = useState(false);
    const [showICForm, setShowICForm] = useState(false);
    const [showSalesInvForm, setShowSalesInvForm] = useState(false);
    const [showPurchaseInvForm, setShowPurchaseInvForm] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);

    // Document Viewing state
    const [viewingDoc, setViewingDoc] = useState<{ type: 'DC' | 'IC' | 'SI' | 'PI' | 'EX', id: string, num: string } | null>(null);
    const [docData, setDocData] = useState<any>(null);
    const [loadingDoc, setLoadingDoc] = useState(false);

    const handleViewDoc = async (type: 'DC' | 'IC' | 'SI' | 'PI' | 'EX', id: string, num: string) => {
        setViewingDoc({ type, id, num });
        setLoadingDoc(true);
        try {
            let data;
            if (type === 'DC') data = await api.getDCById(id);
            else if (type === 'IC') data = await api.getInwardChallanById(id);
            // Invoices/Expenses fetch logic can be added here if needed
            setDocData(data);
        } catch (e) { console.error('Failed to fetch doc', e); }
        finally { setLoadingDoc(false); }
    };

    // ROLE-BASED PERMISSIONS
    const canAddMembers = hasPermission(currentUser.role, 'ADD_CHANNEL_MEMBER');
    const canDeleteGroup = hasPermission(currentUser.role, 'DELETE_CHANNEL');
    const canEditGroup = hasPermission(currentUser.role, 'EDIT_CHANNEL');
    const canRemoveMembers = hasPermission(currentUser.role, 'REMOVE_CHANNEL_MEMBER');

    // Document Permissions
    const canCreateDC = hasPermission(currentUser.role, 'CREATE_DC');
    const canCreateIC = hasPermission(currentUser.role, 'CREATE_IC');
    const canCreateSalesInv = hasPermission(currentUser.role, 'CREATE_SALES_INVOICE');
    const canCreatePurchaseInv = hasPermission(currentUser.role, 'CREATE_PURCHASE_INVOICE');
    const canCreateExpense = hasPermission(currentUser.role, 'CREATE_SIMPLE_EXPENSE');

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
    };

    const { data: allChannels = [] } = useQuery({
        queryKey: ['channels', currentUser.id],
        queryFn: () => api.getAllChannels(currentUser),
        enabled: !!forwardingMessage
    });

    const forwardMessageMutation = useMutation({
        mutationFn: async ({ targetChannelIds, message }: { targetChannelIds: string[], message: Message }) => {
            return Promise.all(targetChannelIds.map(tid => api.sendMessage(currentUser, tid, message.content)));
        },
        onSuccess: () => {
            setForwardingMessage(null);
            setSelectedTargetChannelIds(new Set());
            alert('Forwarded successfully!');
        },
        onError: (err: any) => alert('Forward failed: ' + err.message)
    });

    const handleDeleteChannel = async () => {
        if (!window.confirm("ARE YOU SURE? This will permanently delete the entire group, all messages, all specs, and all attached files. This cannot be undone.")) return;
        if (!window.confirm("FINAL CONFIRMATION: Delete everything in this group?")) return;

        try {
            await api.deleteChannel(currentUser, channel.id);
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            onBack();
        } catch (err: any) {
            alert("Failed to delete: " + err.message);
        }
    };

    const handleShareNative = async (msg: Message) => {
        setOpenDropdownId(null);
        try {
            const isImage = msg.content?.startsWith('[IMAGE]');
            const isFile = msg.content?.startsWith('[FILE]');
            
            if (isImage || isFile) {
                const parts = msg.content.replace(/\[IMAGE\]|\[FILE\]/, '').split('|');
                const url = parts[0].trim();
                const fileName = parts[1]?.trim() || (isImage ? 'photo.jpg' : 'document.pdf');
                
                // 1. Fetch the actual file first
                const response = await fetch(url);
                const blob = await response.blob();
                const file = new File([blob], fileName, { type: blob.type });

                if (isNative) {
                    // Native Capacitor Path
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64data = (reader.result as string).split(',')[1];
                        await shareFile(fileName, base64data, isImage ? 'Share Photo' : 'Share Document');
                    };
                    reader.readAsDataURL(blob);
                } else if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    // Modern Web Path (Mobile Browsers/PWA)
                    await navigator.share({
                        files: [file],
                        title: isImage ? 'Photo from Kramiz' : 'Document from Kramiz',
                    });
                } else {
                    // Fallback: Share URL (Database link exposed here, but this is the last resort)
                    await navigator.share({
                        title: isImage ? 'Photo from Kramiz' : 'Document from Kramiz',
                        text: `Check out this ${isImage ? 'photo' : 'file'} from Kramiz`,
                        url: url
                    });
                }
            } else {
                // Text message sharing
                if (isNative) {
                    await shareContent('Share Message', msg.content);
                } else {
                    await navigator.share({
                        title: 'Message from Kramiz',
                        text: msg.content
                    });
                }
            }
        } catch (e) { 
            console.error('Share error', e); 
            // Fallback to clipboard if sharing fails or is unsupported
            navigator.clipboard.writeText(msg.content);
            alert('Link copied to clipboard');
        }
    };

    const handlePinToSpecs = async (msg: Message) => {
        setOpenDropdownId(null);
        try {
            const isFile = msg.content.startsWith('[FILE]');
            const isImage = msg.content.startsWith('[IMAGE]');
            
            if (isFile || isImage) {
                const parts = msg.content.replace(/\[FILE\]|\[IMAGE\]/, '').split('|');
                const url = parts[0].trim();
                const fileName = parts[1]?.trim() || (isImage ? 'image.jpg' : 'file.dat');
                await api.addFileToChannel(currentUser, channel.id, fileName, url);
                alert('File added to Specs!');
            } else {
                await api.addSpecToChannel(currentUser, channel.id, msg.content);
                alert('Pinned to Specs!');
            }
            
            // Invalidate channels query to refresh SpecDrawer
            queryClient.invalidateQueries({ queryKey: ['channels', currentUser.id] });
        } catch (e) { alert('Failed to pin to specs'); }
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

        // DOCUMENT CARDS
        const isDC = content.startsWith('[DC]');
        const isIC = content.startsWith('[IC]');
        const isSI = content.startsWith('[SI]');
        const isPI = content.startsWith('[PI]');
        const isEX = content.startsWith('[EX]');

        if (isDC || isIC || isSI || isPI || isEX) {
            const parts = content.split('|');
            const label = parts[0].replace(/\[DC\]|\[IC\]|\[SI\]|\[PI\]|\[EX\]/, '').trim();
            const id = parts[1]?.trim() || '';
            const type = isDC ? 'DC' : isIC ? 'IC' : isSI ? 'SI' : isPI ? 'PI' : 'EX';
            const icon = isDC ? '🚚' : isIC ? '📥' : isSI ? '🧾' : isPI ? '💸' : '💰';
            const typeLabel = isDC ? 'Delivery Plan' : isIC ? 'Inward Challan' : isSI ? 'Sales Invoice' : isPI ? 'Purchase Invoice' : 'Expense';
            const colorClass = isDC ? 'bg-green-50 border-green-100 text-green-700' : 
                              isIC ? 'bg-blue-50 border-blue-100 text-blue-700' :
                              isSI ? 'bg-purple-50 border-purple-100 text-purple-700' :
                              isPI ? 'bg-orange-50 border-orange-100 text-orange-700' :
                              'bg-red-50 border-red-100 text-red-700';

            return (
                <div 
                    onClick={() => handleViewDoc(type, id, label)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all active:scale-95 mt-1 ${colorClass}`}
                >
                    <div className="w-12 h-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">{typeLabel}</p>
                        <p className="text-sm font-bold truncate">{label}</p>
                        <p className="text-[10px] font-medium opacity-50 mt-1">Tap to view details</p>
                    </div>
                </div>
            );
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
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-lg truncate text-white">{channel.name}</h2>
                                <select 
                                    value={currentStatus} 
                                    onChange={handleStatusChange} 
                                    className={`text-[10px] px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer font-black ml-3 transition-all uppercase tracking-widest shadow-sm
                                        ${currentStatus === 'PENDING' ? 'bg-[#FFD700] text-[#4A3C00]' : 
                                          currentStatus === 'IN_PROGRESS' ? 'bg-[#25D366] text-white' : 
                                          'bg-[#94A3B8] text-white'}`}
                                >
                                    <option value="PENDING" className="text-gray-900 bg-white">PENDING</option>
                                    <option value="IN_PROGRESS" className="text-gray-900 bg-white">ACTIVE</option>
                                    <option value="COMPLETED" className="text-gray-900 bg-white">COMPLETED</option>
                                </select>
                            </div>
                            <p className="text-xs text-green-100 truncate">{order.order_number} • {order.style_number}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowGroupInfo(true)} className="p-2 hover:bg-white/10 rounded-full text-white"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                    </div>
                </div>

                <SpecDrawer channel={channel} currentUser={currentUser} />

                {/* Selection Action Bar */}
                {selectionMode && (
                    <div className="absolute top-0 left-0 right-0 h-[60px] bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 animate-in slide-in-from-top duration-300">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectionMode(false); setSelectedMessageIds(new Set()); }} className="p-2 text-gray-500 hover:text-gray-700">✕</button>
                            <span className="font-bold text-gray-800">{selectedMessageIds.size} Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    const combinedContent = Array.from(selectedMessageIds)
                                        .map(id => messages.find(m => m.id === id))
                                        .filter(Boolean)
                                        .map(m => m!.content)
                                        .join('\n\n');
                                    setForwardingMessage({ 
                                        id: 'combined', 
                                        channel_id: channel.id, 
                                        user_id: currentUser.id, 
                                        content: combinedContent, 
                                        timestamp: new Date().toISOString() 
                                    });
                                    setSelectionMode(false); 
                                    setSelectedMessageIds(new Set());
                                }}
                                disabled={selectedMessageIds.size === 0}
                                className="flex flex-col items-center gap-0.5 px-3 py-1 text-[#008069] disabled:opacity-30"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 17 20 12 15 7" />
                                    <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                                </svg>
                                <span className="text-[10px] font-black uppercase">Forward</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-2 whatsapp-bg">
                    {messages.map(msg => {
                        const isMe = msg.user_id === currentUser.id;
                        const isDeleted = msg.content?.startsWith('[DELETED]');
                        const isSelected = selectedMessageIds.has(msg.id);

                        if (msg.is_system_update) return <div key={msg.id} className="flex justify-center my-3"><span className="bg-[#d5f4e6] text-gray-700 text-xs px-4 py-1.5 rounded-full">{msg.content}</span></div>;
                        
                        return (
                            <div key={msg.id} id={`msg-${msg.id}`} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} group max-w-full relative`}>
                                {/* Multi-select Checkbox */}
                                {selectionMode && !isDeleted && (
                                    <div className={`mr-2 mb-2 transition-all ${isMe ? 'order-first' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => {
                                                const next = new Set(selectedMessageIds);
                                                if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id);
                                                setSelectedMessageIds(next);
                                            }}
                                            className="w-5 h-5 rounded-full border-gray-300 text-[#008069] focus:ring-[#008069]"
                                        />
                                    </div>
                                )}

                                <div 
                                    onContextMenu={(e) => {
                                        if (selectionMode) return;
                                        e.preventDefault();
                                        setSelectionMode(true);
                                        setSelectedMessageIds(new Set([msg.id]));
                                    }}
                                    className={`max-w-[85%] rounded-xl px-3 py-1.5 shadow-sm text-sm relative transition-all ${isSelected ? 'ring-2 ring-[#008069] scale-[0.98]' : ''} ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}
                                >
                                    {!isMe && <div className="mb-1 text-[14px] font-bold text-[#008069]">{msg.user?.name}</div>}
                                    
                                    {!isDeleted && !selectionMode && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (openDropdownId === msg.id) {
                                                    setOpenDropdownId(null);
                                                } else {
                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                    setOpenUpwards(spaceBelow < 200);
                                                    setOpenDropdownId(msg.id);
                                                }
                                            }}
                                            className={`absolute top-1 right-1 p-1 rounded-full transition-colors z-10 bg-white/70 backdrop-blur-sm shadow-sm md:opacity-0 group-hover:opacity-100 ${openDropdownId === msg.id ? 'opacity-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                    )}

                                    {openDropdownId === msg.id && !isDeleted && !selectionMode && (
                                        <div className={`absolute ${openUpwards ? 'bottom-8' : 'top-8'} right-0 bg-white shadow-2xl rounded-2xl py-1.5 w-52 z-20 border border-gray-100 animate-in fade-in zoom-in-95 duration-100`}>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(msg.content.replace(/\[IMAGE\]|\[FILE\]|\[AUDIO\]/, '').split('|')[0].trim());
                                                    setOpenDropdownId(null);
                                                }} 
                                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                            >
                                                <span className="text-base">📋</span> Copy Text
                                            </button>
                                            <button onClick={() => { setSelectionMode(true); setSelectedMessageIds(new Set([msg.id])); setOpenDropdownId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                                <span className="text-base">✅</span> Select Multiple
                                            </button>
                                            <button onClick={() => handlePinToSpecs(msg)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                                <span className="text-base">📌</span> Pin to Specs
                                            </button>
                                            <button onClick={() => { setOpenDropdownId(null); setForwardingMessage(msg); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="15 17 20 12 15 7" />
                                                    <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                                                </svg>
                                                Forward
                                            </button>
                                            <button onClick={() => handleShareNative(msg)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="18" cy="5" r="3" />
                                                    <circle cx="6" cy="12" r="3" />
                                                    <circle cx="18" cy="19" r="3" />
                                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                                </svg>
                                                Share
                                            </button>
                                            {isMe && (
                                                <button 
                                                    onClick={() => { setOpenDropdownId(null); setDeletingMessageId(msg.id); }} 
                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-gray-50 mt-1 transition-colors"
                                                >
                                                    <span className="text-base">🗑️</span> Delete
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="pr-10 pb-1">{isDeleted ? <span className="text-gray-400 italic">Deleted</span> : renderMessageContent(msg.content)}</div>
                                    <div className="text-[9px] text-gray-400 absolute bottom-1 right-2">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-2 relative safe-pb-deep border-t border-gray-200">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                    <input type="file" ref={photoInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
                    <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#008069] hover:bg-white rounded-full transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                    {showAttachMenu && (
                        <div className="absolute bottom-16 left-4 bg-white shadow-2xl rounded-2xl p-2 z-50 border border-gray-100 animate-in slide-in-from-bottom-2 duration-200 w-64">
                            <button onClick={() => { photoInputRef.current?.click(); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left rounded-xl transition-colors border-b border-gray-50">
                                <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Photos</span><span className="text-[10px] text-gray-400">Camera & Gallery</span></div>
                            </button>

                            <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left rounded-xl transition-colors border-b border-gray-50">
                                <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Documents</span><span className="text-[10px] text-gray-400">PDFs, Docs, etc.</span></div>
                            </button>

                            {canCreateDC && (
                                <button onClick={() => { setShowDCForm(true); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left rounded-xl transition-colors">
                                    <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Delivery Challan</span><span className="text-[10px] text-gray-400">Create Outward DC</span></div>
                                </button>
                            )}

                            {canCreateIC && (
                                <button onClick={() => { setShowICForm(true); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left rounded-xl transition-colors">
                                    <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Inward Challan</span><span className="text-[10px] text-gray-400">Record goods receipt</span></div>
                                </button>
                            )}

                            {canCreateSalesInv && (
                                <button onClick={() => { setShowSalesInvForm(true); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left rounded-xl transition-colors">
                                    <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Sales Invoice</span><span className="text-[10px] text-gray-400">Bill your partner</span></div>
                                </button>
                            )}

                            {canCreatePurchaseInv && (
                                <button onClick={() => { setShowPurchaseInvForm(true); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left rounded-xl transition-colors">
                                    <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Purchase Invoice</span><span className="text-[10px] text-gray-400">Record bill from partner</span></div>
                                </button>
                            )}

                            {canCreateExpense && (
                                <button onClick={() => { setShowExpenseForm(true); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left rounded-xl transition-colors">
                                    <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Simple Expense</span><span className="text-[10px] text-gray-400">Quick spend record</span></div>
                                </button>
                            )}
                        </div>
                    )}
                    
                    <div className="flex-1 flex items-end gap-2 bg-white rounded-[14px] px-4 py-1 shadow-sm border border-gray-100 overflow-hidden">
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
                            className="flex-1 py-1.5 bg-transparent border-none focus:ring-0 focus:outline-none text-[15px] resize-none minimal-scrollbar"
                            style={{ minHeight: '24px', maxHeight: '150px', lineHeight: '24px' }}
                            rows={1}
                        />
                    </div>

                    {isRecording && (
                        <button onClick={() => stopRecording(true)} className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                            ✕
                        </button>
                    )}

                    <button 
                        onClick={isRecording ? () => stopRecording(false) : (newMessage.trim() ? handleSend : startRecording)} 
                        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-95 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#008069]'}`}
                    >
                        {isRecording ? (
                            <span className="font-bold text-[10px]">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                        ) : newMessage.trim() ? (
                            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" /></svg>
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
                        <div className="space-y-3 mb-8">{members.map(m => (<div key={m.id} className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center font-bold">{m.name[0]}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{m.name}</p></div></div>))}</div>
                        
                        {canDeleteGroup && (
                            <div className="pt-6 border-t border-gray-100">
                                <button 
                                    onClick={handleDeleteChannel}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold border border-red-100"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Group
                                </button>
                                <p className="text-[10px] text-gray-400 text-center mt-2">All files, specs, and messages will be permanently removed.</p>
                            </div>
                        )}
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
            {/* Forwarding Modal (using unified popup) */}
            {forwardingMessage && (
                <KramizSharePopup
                    currentUser={currentUser}
                    content={{
                        type: forwardingMessage.content.startsWith('[FILE]') || forwardingMessage.content.startsWith('[IMAGE]') ? 'file' : 'text',
                        text: forwardingMessage.content,
                        fileUrl: forwardingMessage.content.split('|')[0].replace(/\[IMAGE\]|\[FILE\]/, '').trim(),
                        fileName: forwardingMessage.content.split('|')[1]?.trim() || 'Forwarded File'
                    }}
                    onClose={() => setForwardingMessage(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['channels'] });
                    }}
                />
            )}

            {/* Document Forms */}
            {showDCForm && (
                <DCForm 
                    currentUser={currentUser} 
                    channelId={channel.id} 
                    onCreated={(id, num) => {
                        sendMessage(`[DC] Created Delivery Challan: ${num} | ${id}`);
                        setShowDCForm(false);
                        queryClient.invalidateQueries({ queryKey: ['dcs'] });
                    }}
                    onClose={() => setShowDCForm(false)}
                />
            )}

            {showICForm && (
                <InwardChallanForm
                    currentUser={currentUser}
                    channelId={channel.id}
                    onCreated={(id, num) => {
                        sendMessage(`[IC] Created Inward Challan: ${num} | ${id}`);
                        setShowICForm(false);
                        queryClient.invalidateQueries({ queryKey: ['inward_challans'] });
                    }}
                    onClose={() => setShowICForm(false)}
                />
            )}

            {showSalesInvForm && (
                <QuickSalesInvoiceForm
                    currentUser={currentUser}
                    onCreated={(id, num) => {
                        sendMessage(`[SI] Created Sales Invoice: ${num} | ${id}`);
                        setShowSalesInvForm(false);
                    }}
                    onClose={() => setShowSalesInvForm(false)}
                />
            )}

            {showPurchaseInvForm && (
                <QuickPurchaseInvoiceForm
                    currentUser={currentUser}
                    onCreated={(id, num) => {
                        sendMessage(`[PI] Created Purchase Invoice: ${num} | ${id}`);
                        setShowPurchaseInvForm(false);
                    }}
                    onClose={() => setShowPurchaseInvForm(false)}
                />
            )}

            {showExpenseForm && (
                <SimpleExpenseForm
                    currentUser={currentUser}
                    onCreated={(id, desc) => {
                        sendMessage(`[EX] Recorded Expense: ${desc} | ${id}`);
                        setShowExpenseForm(false);
                    }}
                    onClose={() => setShowExpenseForm(false)}
                />
            )}

            {/* Document Detail Views */}
            {viewingDoc && (viewingDoc.type === 'DC' || viewingDoc.type === 'IC') && docData && (
                <ChallanDetailView 
                    data={docData} 
                    type={viewingDoc.type} 
                    onClose={() => { setViewingDoc(null); setDocData(null); }} 
                />
            )}

            {viewingDoc && loadingDoc && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#008069] border-t-transparent"></div>
                        <p className="text-sm font-bold text-gray-700">Fetching Document...</p>
                    </div>
                </div>
            )}
        </div>
    );
};
