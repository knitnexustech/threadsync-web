import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Channel, AttachedFile, User } from '../types';
import { api } from '../supabaseAPI';
import { compressImage } from '../imageUtils';

export const useSpecs = (channel: Channel, currentUser: User) => {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'SPECS' | 'FILES'>('SPECS');
    const [files, setFiles] = useState<AttachedFile[]>([...(channel.files || [])]);
    const [specs, setSpecs] = useState(channel.specs || []);
    const [isEditingDueDate, setIsEditingDueDate] = useState(false);
    const [editedDueDate, setEditedDueDate] = useState(channel.due_date || '');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setFiles([...(channel.files || [])]);
        setSpecs(channel.specs || []);
        setEditedDueDate(channel.due_date || '');
        setIsEditingDueDate(false);
    }, [channel.id]);

    const editChannelMutation = useMutation({
        mutationFn: (updates: Partial<Channel>) => api.updateChannel(currentUser, channel.id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setIsEditingDueDate(false);
        }
    });

    const handleFileUpload = async (selectedFiles: File[]) => {
        setIsUploading(true);
        try {
            (window as any).isKramizUploading = true;
            for (const file of selectedFiles) {
                const fileToUpload = await compressImage(file);
                const publicUrl = await api.uploadFile(fileToUpload as File);
                const newFile = await api.addFileToChannel(currentUser, channel.id, file.name, publicUrl);
                setFiles(prev => [...prev, newFile]);
            }
        } catch (err: any) {
            console.error(err);
            throw err;
        } finally {
            setIsUploading(false);
            (window as any).isKramizUploading = false;
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        await api.deleteFileFromChannel(channel.id, fileId);
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleRenameFile = async (fileId: string, newName: string) => {
        await api.renameFile(fileId, newName);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName } : f));
    };

    const handleAddSpec = async (content: string) => {
        const newSpec = await api.addSpecToChannel(currentUser, channel.id, content);
        setSpecs(prev => [newSpec, ...prev]);
    };

    const handleDeleteSpec = async (specId: string) => {
        await api.deleteSpecFromChannel(channel.id, specId);
        setSpecs(prev => prev.filter(s => s.id !== specId));
    };

    const handleSaveDueDate = () => {
        editChannelMutation.mutate({ due_date: editedDueDate || null });
    };

    return {
        isOpen,
        setIsOpen,
        activeTab,
        setActiveTab,
        files,
        specs,
        isEditingDueDate,
        setIsEditingDueDate,
        editedDueDate,
        setEditedDueDate,
        isUploading,
        handleFileUpload,
        handleDeleteFile,
        handleRenameFile,
        handleAddSpec,
        handleDeleteSpec,
        handleSaveDueDate,
        editChannelMutation,
        isOverdue: (date: string | undefined) => {
            if (!date) return false;
            const d = new Date(date);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            d.setHours(0, 0, 0, 0);
            return d < now;
        }
    };
};
