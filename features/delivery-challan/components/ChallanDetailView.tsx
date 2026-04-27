import React from 'react';
import { DeliveryChallan, InwardChallan } from '../../../types';

interface ChallanDetailViewProps {
    data:    DeliveryChallan | InwardChallan;
    type:    'DC' | 'IC';
    onClose: () => void;
}

export const ChallanDetailView: React.FC<ChallanDetailViewProps> = ({ data, type, onClose }) => {
    const isDC = type === 'DC';
    const docNumber = isDC ? (data as DeliveryChallan).dc_number : (data as InwardChallan).ic_number;
    const items = (isDC ? (data as DeliveryChallan).items : (data as InwardChallan).items_received) || [];
    
    // Determine Sender/Receiver
    const senderName = data.sender_company?.name || (data as any).sender_contact?.name || 'Unknown Sender';
    const receiverName = (data as any).receiver_company?.name || (data as any).receiver_contact?.name || 'Unknown Receiver';

    return (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
            <div 
                className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom-4 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h3 className="font-extrabold text-xl text-gray-900 tracking-tight">{isDC ? 'Delivery Challan' : 'Inward Challan'}</h3>
                        <p className="text-xs font-bold text-[#008069] tracking-widest uppercase">{docNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Parties Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">From</span>
                            <p className="text-sm font-bold text-gray-900">{senderName}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">To</span>
                            <p className="text-sm font-bold text-gray-900">{receiverName}</p>
                        </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-6 py-4 border-y border-gray-50">
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Date</span>
                            <p className="text-sm font-bold text-gray-900">{new Date(data.created_at || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        {data.ref_order_number && (
                            <div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Reference No.</span>
                                <p className="text-sm font-bold text-gray-900">{data.ref_order_number}</p>
                            </div>
                        )}
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Items Detail</h4>
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{items.length} Rows</span>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                            {items.map((item, idx) => (
                                <div key={idx} className="p-3 flex justify-between items-start hover:bg-gray-50/50 transition-colors text-xs">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900">{item.description}</p>
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className="font-black text-[#008069]">{item.quantity} {item.unit}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Support Details: Notes & Driver */}
                    <div className="space-y-4">
                        {data.notes && (
                            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50">
                                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Notes / Special Instructions</span>
                                <p className="text-sm text-orange-900 whitespace-pre-wrap leading-relaxed">{data.notes}</p>
                            </div>
                        )}

                        {isDC && (data as DeliveryChallan).driver_name && (
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex items-center gap-4">
                                {(data as DeliveryChallan).driver_photo_url ? (
                                    <img src={(data as DeliveryChallan).driver_photo_url} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-sm" alt="Driver" />
                                ) : (
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🚚</div>
                                )}
                                <div>
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-0.5">Driver / Courier</span>
                                    <p className="text-sm font-bold text-blue-900">{(data as DeliveryChallan).driver_name}</p>
                                    <p className="text-xs text-blue-800/60 font-mono">{(data as DeliveryChallan).driver_phone || 'No phone'}</p>
                                </div>
                            </div>
                        )}
                        
                        {!isDC && (data as InwardChallan).discrepancies && (
                            <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">Discrepancies / Issues</span>
                                <p className="text-sm text-red-900">{ (data as InwardChallan).discrepancies }</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
