/**
 * shared.tsx
 * Feature: Orders / Dashboard screens
 *
 * Shared UI atoms used across all document list screens (Orders, DCs, ICs, Invoices).
 * Keeps each screen file lean — import these instead of duplicating.
 */

import React from 'react';

// ── Sub-screen header ───────────────────────────────────────────────────────

export const SubScreenHeader: React.FC<{
    title: string;
    subtitle?: string;
    onBack: () => void;
    action?: React.ReactNode;
}> = ({ title, subtitle, onBack, action }) => (
    <div className="bg-white px-4 py-4 md:py-6 flex flex-col gap-1 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] z-10 sticky top-0 flex-shrink-0">
        <div className="flex items-center gap-3">
            <button
                onClick={onBack}
                className="p-1.5 -ml-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors md:hidden"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 flex-1 md:ml-4">{title}</h1>
            {action}
        </div>
        {subtitle && <p className="text-[11px] text-gray-400 md:ml-4">{subtitle}</p>}
    </div>
);

export const cardCls = 'bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]';


// ── Empty state ─────────────────────────────────────────────────────────────

export const EmptyState: React.FC<{
    icon: string;
    title: string;
    subtitle: string;
}> = ({ icon, title, subtitle }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="text-4xl mb-3 opacity-70">{icon}</div>
        <p className="text-[15px] font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-[12px] text-gray-400 leading-relaxed">{subtitle}</p>
    </div>
);

// ── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    PENDING:     'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED:   'bg-green-100 text-green-700',
    DRAFT:       'bg-gray-100 text-gray-600',
    SENT:        'bg-indigo-100 text-indigo-700',
    RECEIVED:    'bg-green-100 text-green-700',
    DISPUTED:    'bg-red-100 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
    IN_PROGRESS: 'Active',
    PENDING:     'Pending',
    COMPLETED:   'Done',
    DRAFT:       'Draft',
    SENT:        'Sent',
    RECEIVED:    'Received',
    DISPUTED:    'Disputed',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
        {STATUS_LABELS[status] ?? status}
    </span>
);

// ── Shared input class ──────────────────────────────────────────────────────

export const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all';
export const labelCls = 'block text-[11px] text-gray-400 mb-1';

// ── Date formatter ──────────────────────────────────────────────────────────

export const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '–';

export const fmtAmount = (n?: number) =>
    n !== undefined ? `₹${n.toLocaleString('en-IN')}` : '–';
