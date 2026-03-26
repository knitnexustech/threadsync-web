/**
 * useCompanyIdentity.ts
 * Feature: Company Identity (Phase 1)
 *
 * Manages reads and updates for a company's identity fields:
 *   - Company name
 *   - GST number (verified identity, optional)
 *   - Kramiz ID (auto-generated, read-only)
 *
 * Used by: CompanyIdentityCard.tsx → rendered inside SettingsPage (General tab)
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../supabaseAPI';
import { Company } from '../../types';

interface UseCompanyIdentityProps {
    companyId: string;
    userCompany: Company | null | undefined;
    canEdit: boolean;
}

export const useCompanyIdentity = ({ companyId, userCompany, canEdit }: UseCompanyIdentityProps) => {
    const queryClient = useQueryClient();

    // Local form state
    const [editCompanyName, setEditCompanyName] = useState(userCompany?.name || '');
    const [editGSTNumber, setEditGSTNumber] = useState(userCompany?.gst_number || '');
    const [editAddress, setEditAddress]     = useState(userCompany?.address  || '');
    const [editState, setEditState]         = useState(userCompany?.state    || '');
    const [editPincode, setEditPincode]     = useState(userCompany?.pincode  || '');

    // GST validation: must be exactly 15 uppercase alphanumeric characters (or empty)
    const isGSTValid = editGSTNumber === '' || editGSTNumber.length === 15;

    // Strip any invalid characters while typing (lowercase, symbols, spaces)
    const handleGSTChange = (value: string) => {
        const cleaned = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
        if (cleaned.length <= 15) setEditGSTNumber(cleaned);
    };

    // Pincode: digits only, max 6
    const handlePincodeChange = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length <= 6) setEditPincode(cleaned);
    };

    const isPincodeValid = editPincode === '' || editPincode.length === 6;

    // ─── Mutations ────────────────────────────────────────────────────────────

    const updateNameMutation = useMutation({
        mutationFn: (newName: string) => api.updateCompanyName(companyId, newName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company'] });
        },
        onError: (err: any) => alert(err.message || 'Failed to update company name'),
    });

    const updateGSTMutation = useMutation({
        mutationFn: (gstNumber: string) => api.updateGSTNumber(companyId, gstNumber),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company'] });
            alert('GST number updated successfully!');
        },
        onError: (err: any) => alert(err.message || 'Failed to update GST number'),
    });

    const updateProfileMutation = useMutation({
        mutationFn: (profile: { address?: string; state?: string; pincode?: string }) =>
            api.updateCompanyProfile(companyId, profile),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company'] });
        },
        onError: (err: any) => alert(err.message || 'Failed to update address'),
    });

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleSaveName = () => {
        if (!canEdit) return;
        if (!editCompanyName.trim()) return alert('Company name cannot be empty');
        updateNameMutation.mutate(editCompanyName);
    };

    const handleSaveGST = () => {
        if (!canEdit) return;
        if (!isGSTValid) return alert('GST number must be exactly 15 characters, or leave it blank');
        updateGSTMutation.mutate(editGSTNumber);
    };

    const handleSaveAddress = () => {
        if (!canEdit) return;
        if (!isPincodeValid) return alert('PIN code must be exactly 6 digits, or leave it blank');
        updateProfileMutation.mutate({
            address: editAddress,
            state: editState,
            pincode: editPincode,
        });
    };

    const addressUnchanged =
        editAddress === (userCompany?.address  || '') &&
        editState   === (userCompany?.state    || '') &&
        editPincode === (userCompany?.pincode  || '');

    return {
        // Form state
        editCompanyName, setEditCompanyName,
        editGSTNumber, handleGSTChange, isGSTValid,
        editAddress, setEditAddress,
        editState, setEditState,
        editPincode, handlePincodeChange, isPincodeValid,

        // Derived
        nameUnchanged: editCompanyName === (userCompany?.name || ''),
        gstUnchanged: editGSTNumber === (userCompany?.gst_number || ''),
        addressUnchanged,

        // Handlers
        handleSaveName,
        handleSaveGST,
        handleSaveAddress,

        // Loading states
        isSavingName: updateNameMutation.isPending,
        isSavingGST: updateGSTMutation.isPending,
        isSavingAddress: updateProfileMutation.isPending,
    };
};
