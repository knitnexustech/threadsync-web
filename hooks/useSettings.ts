
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../supabaseAPI';
import { User, Company } from '../types';

export const useSettings = (currentUser: User) => {
    const queryClient = useQueryClient();

    const { data: userCompany } = useQuery({
        queryKey: ['company', currentUser.company_id],
        queryFn: () => api.getCompany(currentUser.company_id),
        enabled: !!currentUser.company_id
    });

    const updateCompanyMutation = useMutation({
        mutationFn: (newName: string) => api.updateCompanyName(currentUser.company_id, newName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company'] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        },
        onError: (err: any) => alert(err.message || "Failed to update company name")
    });

    const updatePasscodeMutation = useMutation({
        mutationFn: (data: { oldPasscode: string; newPasscode: string }) => 
            api.updatePasscode(currentUser.id, data.oldPasscode, data.newPasscode),
        onSuccess: () => alert("Passcode updated successfully!"),
        onError: (err: any) => alert(err.message || "Failed to update passcode")
    });

    const deleteOrganizationMutation = useMutation({
        mutationFn: () => api.deleteOrganization(currentUser, currentUser.company_id),
        onError: (err: any) => alert(err.message || "Failed to delete organization")
    });

    return {
        userCompany,
        updateCompanyName: updateCompanyMutation.mutate,
        isUpdatingCompany: updateCompanyMutation.isPending,
        updatePasscode: updatePasscodeMutation.mutate,
        isUpdatingPasscode: updatePasscodeMutation.isPending,
        deleteOrganization: deleteOrganizationMutation.mutateAsync,
        isDeletingOrg: deleteOrganizationMutation.isPending,
    };
};
