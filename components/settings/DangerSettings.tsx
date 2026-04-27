import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { SubScreenContent } from './SettingsLayout';

interface DangerSettingsProps {
    currentUser: User;
    onLogout: () => void;
}

export const DangerSettings: React.FC<DangerSettingsProps> = ({ currentUser, onLogout }) => {
    const navigate = useNavigate();
    const { userCompany, deleteOrganization, isDeletingOrg } = useSettings(currentUser);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const handleDeleteOrg = async () => {
        if (deleteConfirmText !== userCompany?.name) return alert(`Type "${userCompany?.name}" exactly to confirm.`);
        if (window.confirm('FINAL WARNING: Permanent wipeout. Continue?')) {
            await deleteOrganization();
            onLogout();
            navigate('/');
        }
    };

    return (
        <SubScreenContent title="Danger Zone" onBack={() => navigate('/settings')}>
            <div className="bg-red-50 rounded-2xl p-5 border border-red-100 space-y-4">
                <p className="text-sm text-red-700">Deleting your organization will permanently wipe all orders, files, and users. This cannot be undone.</p>
                <input
                    placeholder={`Type "${userCompany?.name}" to confirm`}
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                    onClick={handleDeleteOrg}
                    disabled={isDeletingOrg || deleteConfirmText !== userCompany?.name}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-medium shadow-sm hover:bg-red-700 disabled:opacity-40 transition-all"
                >
                    {isDeletingOrg ? 'Deleting...' : 'Delete Organization Forever'}
                </button>
            </div>
        </SubScreenContent>
    );
};
