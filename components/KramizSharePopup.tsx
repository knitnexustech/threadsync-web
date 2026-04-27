
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Channel, Order } from '../types';
import { api } from '../supabaseAPI';
import { Modal } from './Modal';

interface KramizSharePopupProps {
    currentUser: User;
    content: {
        type: 'text' | 'file';
        text?: string;
        fileUrl?: string;
        fileName?: string;
    };
    onClose: () => void;
    onSuccess?: () => void;
}

export const KramizSharePopup: React.FC<KramizSharePopupProps> = ({ 
    currentUser, 
    content, 
    onClose,
    onSuccess
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSending, setIsSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: allChannels = [], isLoading: loadingChannels } = useQuery<Channel[]>({
        queryKey: ['channels', currentUser.id],
        queryFn: () => api.getAllChannels(currentUser),
    });

    const { data: orders = [] } = useQuery<Order[]>({
        queryKey: ['orders', currentUser.id],
        queryFn: () => api.getOrders(currentUser),
    });

    const filteredChannels = useMemo(() => {
        if (!searchQuery.trim()) return allChannels;
        const q = searchQuery.toLowerCase();
        return allChannels.filter(ch => {
            const order = orders.find(o => o.id === ch.order_id);
            return (
                ch.name.toLowerCase().includes(q) || 
                order?.order_number.toLowerCase().includes(q) ||
                order?.style_number?.toLowerCase().includes(q)
            );
        });
    }, [allChannels, orders, searchQuery]);

    const groupedChannels = useMemo(() => {
        const groups: Record<string, { order: Order | null; channels: Channel[] }> = {};
        
        filteredChannels.forEach(ch => {
            const order = orders.find(o => o.id === ch.order_id) || null;
            const key = order ? order.id : 'General';
            if (!groups[key]) groups[key] = { order, channels: [] };
            groups[key].channels.push(ch);
        });

        return Object.values(groups).sort((a, b) => {
            if (!a.order) return 1;
            if (!b.order) return -1;
            return b.order.created_at.localeCompare(a.order.created_at);
        });
    }, [filteredChannels, orders]);

    const handleToggle = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    const handleSend = async () => {
        if (selectedIds.size === 0) return;
        setIsSending(true);
        try {
            const targets = Array.from(selectedIds);
            await Promise.all(targets.map(async (channelId) => {
                if (content.type === 'file') {
                    // Send file tag first if needed, or just the file message
                    await api.sendMessage(currentUser, channelId, `[FILE] ${content.fileUrl} | ${content.fileName || 'Attachment'}`);
                } else if (content.text) {
                    await api.sendMessage(currentUser, channelId, content.text);
                }
            }));

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            alert('Failed to share: ' + err.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal 
            isOpen={true} 
            onClose={onClose} 
            title="Share with Groups"
            footer={
                <button 
                    onClick={handleSend}
                    disabled={selectedIds.size === 0 || isSending}
                    className="w-full py-4 bg-[#008069] text-white font-bold rounded-2xl shadow-lg hover:bg-[#006a57] disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {isSending ? 'Sending...' : `Send to ${selectedIds.size} Groups`}
                </button>
            }
        >
            <div className="flex flex-col gap-4 max-h-[70vh]">
                {/* Search Bar */}
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="Search groups or order #..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#008069]"
                    />
                    <span className="absolute left-3 top-3.5 text-gray-400 text-lg">🔍</span>
                </div>

                {/* Content Preview */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-left">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Preview:</p>
                    <p className="text-sm text-gray-700 truncate font-medium">
                        {content.type === 'file' ? `📄 ${content.fileName || 'File Attachment'}` : content.text}
                    </p>
                </div>

                {/* Groups List */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-1 minimal-scrollbar">
                    {loadingChannels ? (
                        <div className="py-10 text-center text-gray-400 animate-pulse font-medium">Fetching active groups...</div>
                    ) : groupedChannels.length === 0 ? (
                        <div className="py-10 text-center text-gray-400 text-sm italic">No matching groups found.</div>
                    ) : (
                        groupedChannels.map(({ order, channels }) => (
                            <div key={order?.id || 'general'} className="space-y-2">
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {order ? `Order ${order.order_number}` : 'General'}
                                    </span>
                                    {order?.style_number && (
                                        <span className="text-[10px] font-bold text-gray-300">
                                            ({order.style_number})
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {channels.map(ch => (
                                        <button 
                                            key={ch.id} 
                                            onClick={() => handleToggle(ch.id)}
                                            className={`w-full text-left p-3.5 border rounded-2xl transition-all flex items-center justify-between group shadow-sm ${selectedIds.has(ch.id) ? 'bg-green-50 border-green-200 ring-1 ring-green-100' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-colors ${selectedIds.has(ch.id) ? 'bg-[#008069] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                    {ch.name[0]}
                                                </div>
                                                <span className={`font-bold text-sm ${selectedIds.has(ch.id) ? 'text-[#008069]' : 'text-gray-700'}`}>
                                                    {ch.name}
                                                </span>
                                            </div>
                                            {selectedIds.has(ch.id) && (
                                                <div className="h-6 w-6 bg-[#008069] rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-sm">✓</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
};
