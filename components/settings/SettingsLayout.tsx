import React, { memo } from 'react';

export const SubScreenContent = memo<{
    title: string;
    onBack: () => void;
    children: React.ReactNode;
}>(({ title, onBack, children }) => (
    <div className="flex flex-col h-full bg-[#f0f2f5] w-full">
        {/* Header - Back button visible on mobile only */}
        <div className="bg-white px-4 py-4 md:py-6 flex items-center gap-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] z-10 sticky top-0">
            <button
                onClick={onBack}
                className="p-1.5 -ml-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors md:hidden"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 md:ml-4">{title}</h1>
        </div>
        
        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8">
            {/* Constrain width on large screens to prevent stretching */}
            <div className="max-w-4xl mx-auto space-y-6">
                {children}
            </div>
        </div>
    </div>
));

export const Card = memo<{ children: React.ReactNode, className?: string }>(({ children, className = "" }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100 ${className}`}>
        {children}
    </div>
));

export const inputCls = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069]';
