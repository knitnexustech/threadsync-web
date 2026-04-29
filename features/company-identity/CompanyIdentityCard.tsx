/**
 * CompanyIdentityCard.tsx
 * Feature: Company Identity (Phase 1)
 *
 * Renders the "Company Settings" card inside the Settings > General tab.
 * Allows admins to:
 *   - Edit the company display name
 *   - Add / update their GST number (for verified identity & partner search)
 *   - View their auto-generated Kramiz ID (read-only, shareable fallback)
 *
 * Non-admins see all fields as read-only.
 *
 * Used by: SettingsPage.tsx → General section
 */

import React from 'react';
import { Company, User } from '../../types';
import { useCompanyIdentity } from './useCompanyIdentity';

interface CompanyIdentityCardProps {
    currentUser: User;
    userCompany: Company | null | undefined;
}

export const CompanyIdentityCard: React.FC<CompanyIdentityCardProps> = ({
    currentUser,
    userCompany,
}) => {
    const canEdit = currentUser.role === 'ADMIN';

    const {
        editCompanyName, setEditCompanyName,
        editGSTNumber, handleGSTChange, isGSTValid,
        editAddress, setEditAddress,
        editState, setEditState,
        editPincode, handlePincodeChange, isPincodeValid,
        nameUnchanged, gstUnchanged, addressUnchanged,
        handleSaveName, handleSaveGST, handleSaveAddress,
        isSavingName, isSavingGST, isSavingAddress,
    } = useCompanyIdentity({ companyId: currentUser.company_id, userCompany, canEdit });

    return (
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-700">🏢</div>
                Company Settings
            </h2>

            <div className="space-y-5">
                {/* ── Company Name ─────────────────────────────────── */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Company Name
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {!canEdit ? (
                            <div className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 font-medium">
                                {editCompanyName || '—'}
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={editCompanyName}
                                onChange={e => setEditCompanyName(e.target.value)}
                                placeholder={userCompany?.name || 'Company name'}
                                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all w-full"
                            />
                        )}
                        {canEdit && (
                            <button
                                onClick={handleSaveName}
                                disabled={isSavingName || nameUnchanged}
                                className="px-6 py-2 bg-[#008069] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#006a57] disabled:opacity-40 transition-all w-full sm:w-auto"
                            >
                                {isSavingName ? 'Saving...' : 'Update'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── GST Number ───────────────────────────────────── */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        GST Number
                        {userCompany?.gst_number ? (
                            <span className="ml-2 text-green-600 font-normal normal-case text-[10px]">✓ Verified</span>
                        ) : (
                            <span className="ml-2 text-orange-400 font-normal normal-case text-[10px]">
                                Not set
                            </span>
                        )}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {!canEdit ? (
                            <div className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 font-mono tracking-widest uppercase">
                                {editGSTNumber || 'NOT SET'}
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={editGSTNumber}
                                onChange={e => handleGSTChange(e.target.value)}
                                placeholder="e.g. 27AABCU9603R1ZX"
                                maxLength={15}
                                className={`flex-1 px-4 py-2 bg-gray-50 border rounded-xl text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 transition-all w-full ${
                                    !isGSTValid
                                        ? 'border-red-300 focus:ring-red-400'
                                        : editGSTNumber.length === 15
                                        ? 'border-green-300 focus:ring-green-400'
                                        : 'border-gray-200 focus:ring-[#008069]'
                                }`}
                            />
                        )}
                        {canEdit && (
                            <button
                                onClick={handleSaveGST}
                                disabled={isSavingGST || gstUnchanged || !isGSTValid}
                                className="px-6 py-2 bg-[#008069] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#006a57] disabled:opacity-40 transition-all w-full sm:w-auto"
                            >
                                {isSavingGST ? 'Saving...' : 'Save'}
                            </button>
                        )}
                    </div>
                    {canEdit && (
                        <div className="flex justify-between mt-1">
                            <p className="text-xs text-gray-400">15 chars — letters and numbers</p>
                            <p className={`text-xs font-mono ${
                                editGSTNumber.length === 0 ? 'text-gray-300' :
                                editGSTNumber.length === 15 ? 'text-green-500' : 'text-red-400'
                            }`}>
                                {editGSTNumber.length}/15
                            </p>
                        </div>
                    )}
                    {canEdit && !isGSTValid && (
                        <p className="text-xs text-red-500 mt-0.5">GST number must be exactly 15 characters</p>
                    )}
                </div>

                {/* ── Kramiz ID (read-only) ────────────────────────── */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Kramiz ID</p>
                    <p className="text-lg font-black font-mono tracking-widest text-gray-800 break-all">
                        {userCompany?.kramiz_id || '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Share this code with partners who don't have a GST number
                    </p>
                </div>

                {/* ── Address ──────────────────────────────────────── */}
                <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
                        Address
                    </label>

                    {/* Street address */}
                    {!canEdit ? (
                        <div className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700">
                            {editAddress || '—'}
                        </div>
                    ) : (
                        <input
                            type="text"
                            value={editAddress}
                            onChange={e => setEditAddress(e.target.value)}
                            placeholder="Street / locality / area"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all"
                        />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* State */}
                        {!canEdit ? (
                            <div className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700">
                                {editState || '—'}
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={editState}
                                onChange={e => setEditState(e.target.value)}
                                placeholder="State"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069] transition-all"
                            />
                        )}

                        {/* PIN Code */}
                        {!canEdit ? (
                            <div className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 font-mono">
                                {editPincode || '—'}
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={editPincode}
                                onChange={e => handlePincodeChange(e.target.value)}
                                placeholder="PIN code"
                                maxLength={6}
                                className={`w-full px-4 py-2 bg-gray-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                                    !isPincodeValid
                                        ? 'border-red-300 focus:ring-red-400'
                                        : editPincode.length === 6
                                        ? 'border-green-300 focus:ring-green-400'
                                        : 'border-gray-200 focus:ring-[#008069]'
                                }`}
                            />
                        )}
                    </div>

                    {canEdit && (
                        <button
                            onClick={handleSaveAddress}
                            disabled={isSavingAddress || addressUnchanged || !isPincodeValid}
                            className="px-6 py-2 mt-2 bg-[#008069] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#006a57] disabled:opacity-40 transition-all w-full sm:w-auto"
                        >
                            {isSavingAddress ? 'Saving...' : 'Save Address'}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};
