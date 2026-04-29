/**
 * usePartnerships.ts
 * Feature: Handshake Protocol (Phase 2)
 *
 * Manages all partnership state and actions:
 *   - Search for a company by GST number or Kramiz ID
 *   - Send a partnership invite
 *   - Accept or reject incoming invites
 *   - List active partners and pending invites
 *
 * Used by: PartnershipsPage.tsx
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../supabaseAPI';
import { User, Company } from '../../types';

export const usePartnerships = (currentUser: User) => {
    const queryClient = useQueryClient();

    // ─── Search state ─────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<Company | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // ─── Data queries ──────────────────────────────────────────────────────────

    const { data: allPartnerships = [], isLoading: loadingAll } = useQuery({
        queryKey: ['all-partnerships', currentUser.company_id],
        queryFn: () => api.getAllPartnerships(currentUser),
    });

    const { data: pendingInvites = [], isLoading: loadingInvites } = useQuery({
        queryKey: ['pending-invites', currentUser.company_id],
        queryFn: () => api.getPendingInvites(currentUser),
        refetchInterval: 30_000, // Poll every 30s so invites appear without refresh
    });

    const partners = allPartnerships
        .filter(p => p.status === 'ACCEPTED')
        .map(p => (p.requester_id === currentUser.company_id ? p.receiver : p.requester)) as Company[];

    const loadingPartners = loadingAll;

    // ─── Search handler ────────────────────────────────────────────────────────

    const handleSearch = async () => {
        const query = searchQuery.trim().toUpperCase();
        if (!query) return;

        setIsSearching(true);
        setSearchError(null);
        setSearchResult(null);

        try {
            const result = await api.searchCompany(query);

            if (!result) {
                setSearchError('No company found. Check the GST number or Kramiz ID and try again.');
            } else if (result.id === currentUser.company_id) {
                setSearchError("That's your own company!");
            } else if (allPartnerships.some(p => 
                (p.requester_id === result.id || p.receiver_id === result.id) && 
                (p.status === 'ACCEPTED' || p.status === 'PENDING')
            )) {
                setSearchError('A partnership request is already active or pending with this company.');
            } else {
                setSearchResult(result);
            }
        } catch (err: any) {
            setSearchError(err.message || 'Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResult(null);
        setSearchError(null);
    };

    // ─── Mutations ─────────────────────────────────────────────────────────────

    const sendInviteMutation = useMutation({
        mutationFn: (targetCompanyId: string) =>
            api.sendPartnershipRequest(currentUser, targetCompanyId),
        onSuccess: () => {
            clearSearch();
            queryClient.invalidateQueries({ queryKey: ['all-partnerships'] });
            queryClient.invalidateQueries({ queryKey: ['partners'] });
        },
        onError: (err: any) => alert(err.message || 'Failed to send invite'),
    });

    const acceptMutation = useMutation({
        mutationFn: (partnershipId: string) =>
            api.acceptPartnershipRequest(currentUser, partnershipId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-partnerships'] });
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
        },
        onError: (err: any) => alert(err.message || 'Failed to accept invite'),
    });

    const rejectMutation = useMutation({
        mutationFn: (partnershipId: string) =>
            api.rejectPartnershipRequest(currentUser, partnershipId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-partnerships'] });
            queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
        },
        onError: (err: any) => alert(err.message || 'Failed to decline invite'),
    });

    return {
        // Search
        searchQuery, setSearchQuery,
        searchResult, searchError,
        isSearching, handleSearch, clearSearch,

        // Data
        partners, loadingPartners,
        pendingInvites, loadingInvites,

        // Actions
        sendInvite: sendInviteMutation.mutate,
        isSendingInvite: sendInviteMutation.isPending,
        inviteSent: sendInviteMutation.isSuccess,

        acceptInvite: acceptMutation.mutate,
        isAccepting: acceptMutation.isPending,

        rejectInvite: rejectMutation.mutate,
        isRejecting: rejectMutation.isPending,
    };
};
