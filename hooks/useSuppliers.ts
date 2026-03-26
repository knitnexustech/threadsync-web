
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../supabaseAPI';
import { User, Company } from '../types';

export const useSuppliers = (currentUser: User) => {
    const queryClient = useQueryClient();
    const [inviteLink, setInviteLink] = useState<string | null>(null);

    const { data: partners = [], isLoading: loadingPartners } = useQuery({
        queryKey: ['partners', currentUser.id],
        queryFn: () => api.getPartners(currentUser),
    });

    const { data: vendorsList = [], isLoading: loadingVendors } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => api.getVendors(),
    });

    const addVendorMutation = useMutation({
        mutationFn: (data: { name: string; phone: string; adminName: string }) => 
            api.createVendor(data.name, data.phone, data.adminName),
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            queryClient.invalidateQueries({ queryKey: ['partners'] });
            const passcode = variables.phone.slice(-4);
            const appLink = window.location.origin;
            const message = `Hello ${variables.adminName},\n\nI am inviting you as a supplier to join our production tracking app: ${appLink}\n\nYour login details are:\nPhone: ${variables.phone}\nPasscode: ${passcode}`;
            setInviteLink(`https://wa.me/91${variables.phone}?text=${encodeURIComponent(message)}`);
        },
        onError: (err: any) => alert(err.message || "Failed to add vendor")
    });

    return {
        partners,
        vendorsList,
        isLoading: loadingPartners || loadingVendors,
        inviteLink,
        setInviteLink,
        addVendor: addVendorMutation.mutate,
        isAdding: addVendorMutation.isPending,
    };
};
