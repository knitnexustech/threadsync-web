/**
 * AddContactModal.tsx
 * Feature: Contacts Book (Phase 2.5)
 *
 * Modal for adding a new manual contact OR editing an existing one.
 * Reused for both flows (editingId === null → add, otherwise edit).
 *
 * Fields:
 *   - Company name (required)
 *   - GST number (optional, 15-char validated)
 *   - Address, State, PIN code
 *   - Phone (used for WhatsApp invite)
 *   - Notes (free text reminder)
 *
 * Used by: features/contacts/ContactsPage.tsx
 */

import React from 'react';
import { ContactForm } from '../useContacts';

interface AddContactModalProps {
    form:            ContactForm;
    setForm:         React.Dispatch<React.SetStateAction<ContactForm>>;
    isEditing:       boolean;
    isSaving:        boolean;
    isGSTValid:      boolean;
    isPINValid:       boolean;
    handleGSTInput:  (v: string) => void;
    handlePINInput:  (v: string) => void;
    onSave:          () => void;
    onClose:         () => void;
}

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
    <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</label>
        {children}
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }> = ({ hasError, className = '', ...props }) => (
    <input
        {...props}
        className={`w-full px-4 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
            hasError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-[#008069]'
        } ${className}`}
    />
);

export const AddContactModal: React.FC<AddContactModalProps> = ({
    form, setForm, isEditing, isSaving,
    isGSTValid, isPINValid, handleGSTInput, handlePINInput,
    onSave, onClose,
}) => {
    const set = (patch: Partial<ContactForm>) => setForm(f => ({ ...f, ...patch }));

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-black text-gray-900 text-base">
                            {isEditing ? 'Edit Contact' : 'Add Contact'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isEditing ? 'Update their details' : 'Add a company that may or may not be on Kramiz'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">

                    <Field label="Company Name *">
                        <Input
                            value={form.name}
                            onChange={e => set({ name: e.target.value })}
                            placeholder="e.g. Sharma Knitting Works"
                            autoFocus
                        />
                    </Field>

                    <Field
                        label="GST Number"
                        hint="15 characters — uppercase letters and numbers only"
                    >
                        <Input
                            value={form.gst_number}
                            onChange={e => handleGSTInput(e.target.value)}
                            placeholder="e.g. 27AABCU9603R1ZX"
                            maxLength={15}
                            className="font-mono tracking-widest uppercase"
                            hasError={!isGSTValid}
                        />
                        {form.gst_number && (
                            <div className="flex justify-between mt-1">
                                {!isGSTValid && <p className="text-xs text-red-500">Must be exactly 15 characters</p>}
                                <p className={`text-xs font-mono ml-auto ${
                                    form.gst_number.length === 15 ? 'text-green-500' : 'text-amber-500'
                                }`}>{form.gst_number.length}/15</p>
                            </div>
                        )}
                    </Field>

                    <Field label="Phone Number" hint="Used for WhatsApp invite — include country code if outside India">
                        <div className="flex">
                            <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-500 font-bold">+91</span>
                            <Input
                                value={form.phone}
                                onChange={e => {
                                    const v = e.target.value.replace(/\D/g, '');
                                    if (v.length <= 10) set({ phone: v });
                                }}
                                placeholder="10-digit number"
                                maxLength={10}
                                className="rounded-l-none border-l-0 font-mono"
                            />
                        </div>
                    </Field>

                    <Field label="Address">
                        <Input
                            value={form.address}
                            onChange={e => set({ address: e.target.value })}
                            placeholder="Street / locality / area"
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="State">
                            <Input
                                value={form.state}
                                onChange={e => set({ state: e.target.value })}
                                placeholder="State"
                            />
                        </Field>
                        <Field label="PIN Code">
                            <Input
                                value={form.pincode}
                                onChange={e => handlePINInput(e.target.value)}
                                placeholder="6 digits"
                                maxLength={6}
                                className="font-mono"
                                hasError={!isPINValid}
                            />
                        </Field>
                    </div>

                    <Field label="Notes">
                        <textarea
                            value={form.notes}
                            onChange={e => set({ notes: e.target.value })}
                            placeholder="e.g. Main yarn supplier, contact Ravi for orders"
                            rows={2}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all resize-none"
                        />
                    </Field>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-gray-200 text-gray-500 rounded-2xl font-black text-sm hover:border-gray-300 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSaving || !form.name.trim() || !isGSTValid || !isPINValid}
                        className="flex-[2] py-3 bg-[#008069] text-white rounded-2xl font-black text-sm shadow-md hover:bg-[#006a57] disabled:opacity-40 transition-all"
                    >
                        {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Contact'}
                    </button>
                </div>
            </div>
        </div>
    );
};
