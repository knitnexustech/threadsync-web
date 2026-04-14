/**
 * ItemsTable.tsx
 * Feature: Delivery Challan (Phase 3)
 *
 * Reusable editable table for DC / Inward Challan line items.
 * Each row: Description | Quantity | Unit | [delete]
 *
 * Used by: DCForm, InwardChallanForm
 */

import React from 'react';
import { DCItem } from '../../../types';

const COMMON_UNITS = ['KG', 'MTR', 'PCS', 'SET', 'BAG', 'BOX', 'ROLL', 'BUNDLE', 'DOZEN'];

interface ItemsTableProps {
    items:    DCItem[];
    onChange: (items: DCItem[]) => void;
}

const BLANK_ITEM: DCItem = { description: '', quantity: 0, unit: 'KG' };

export const ItemsTable: React.FC<ItemsTableProps> = ({ items, onChange }) => {
    const update = (index: number, patch: Partial<DCItem>) => {
        const next = items.map((item, i) => i === index ? { ...item, ...patch } : item);
        onChange(next);
    };

    const addRow  = () => onChange([...items, { ...BLANK_ITEM }]);
    const removeRow = (index: number) => onChange(items.filter((_, i) => i !== index));
    const duplicateRow = (index: number) => {
        const rowToCopy = items[index];
        const next = [...items];
        next.splice(index + 1, 0, { ...rowToCopy });
        onChange(next);
    };

    return (
        <div className="space-y-3 md:space-y-4">
            {/* Header row: Hidden on mobile */}
            <div className="hidden md:grid grid-cols-[3fr_1fr_1.2fr_80px] gap-3 px-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Qty</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unit</p>
                <span />
            </div>

            {/* Item rows */}
            {items.map((item, i) => (
                <div key={i} className="flex flex-col md:grid md:grid-cols-[3fr_1fr_1.2fr_80px] gap-2 md:gap-3 p-3 md:p-0 bg-gray-50/50 md:bg-transparent rounded-2xl md:rounded-none relative border border-gray-100 md:border-0 hover:bg-gray-50/80 md:hover:bg-transparent transition-all">
                    
                    {/* Row 1 (Mobile) / Col 1 (Desktop): Description */}
                    <div className="flex flex-col gap-1">
                        <label className="md:hidden text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Item Description</label>
                        <input
                            type="text"
                            value={item.description}
                            onChange={e => update(i, { description: e.target.value })}
                            placeholder={`e.g. Cotton fabric, Buttons...`}
                            className="px-3 py-2.5 bg-white md:bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all"
                        />
                    </div>

                    {/* Row 2 (Mobile) Container */}
                    <div className="flex items-end gap-2 md:contents">
                        {/* Quantity */}
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="md:hidden text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Qty</label>
                            <input
                                type="number"
                                min={0}
                                value={item.quantity || ''}
                                onChange={e => update(i, { quantity: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                                className="w-full px-3 py-2.5 bg-white md:bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all text-center"
                            />
                        </div>

                        {/* Unit */}
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="md:hidden text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Unit</label>
                            <select
                                value={item.unit}
                                onChange={e => update(i, { unit: e.target.value })}
                                className="w-full px-2 py-2.5 bg-white md:bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all"
                            >
                                {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                <option value={item.unit === '' || !COMMON_UNITS.includes(item.unit) ? item.unit : ''} disabled hidden>
                                    {item.unit}
                                </option>
                            </select>
                        </div>

                        {/* Actions: Duplicate + Remove */}
                        <div className="flex items-center gap-1 pb-0.5 md:pb-0">
                            <button
                                type="button"
                                onClick={() => duplicateRow(i)}
                                className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                title="Duplicate row"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => removeRow(i)}
                                disabled={items.length === 1}
                                className="w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-0"
                                title="Remove row"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Add row */}
            <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 text-sm font-bold text-[#008069] hover:text-[#006a57] transition-colors mt-1"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
            </button>
        </div>
    );
};
