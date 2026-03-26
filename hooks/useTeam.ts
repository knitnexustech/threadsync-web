
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../supabaseAPI';
import { User } from '../types';

export const useTeam = (currentUser: User) => {
    const queryClient = useQueryClient();
    const [inviteLink, setInviteLink] = useState<string | null>(null);

    const { data: teamList = [], isLoading } = useQuery({
        queryKey: ['team', currentUser.company_id],
        queryFn: () => api.getTeamMembers(currentUser),
    });

    const addTeamMemberMutation = useMutation({
        mutationFn: (data: { name: string; phone: string; passcode: string; role: User['role'] }) => 
            api.createTeamMember(currentUser, data.name, data.phone, data.passcode, data.role),
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['team'] });
            const appLink = window.location.origin;
            const message = `Hello ${variables.name},\n\nYou have been added as a ${variables.role.replace('_', ' ')} to the Kramiz production tracking app: ${appLink}\n\nYour login details are:\nPhone: ${variables.phone}\nPasscode: ${variables.passcode}`;
            setInviteLink(`https://wa.me/91${variables.phone}?text=${encodeURIComponent(message)}`);
        },
        onError: (err: any) => alert(err.message || "Failed to add team member")
    });

    const deleteTeamMemberMutation = useMutation({
        mutationFn: (memberId: string) => api.deleteTeamMember(currentUser, memberId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team'] });
        },
        onError: (err: any) => alert(err.message || "Failed to remove team member")
    });

    return {
        teamList,
        isLoading,
        inviteLink,
        setInviteLink,
        addTeamMember: addTeamMemberMutation.mutate,
        isAdding: addTeamMemberMutation.isPending,
        deleteTeamMember: deleteTeamMemberMutation.mutate,
    };
};
