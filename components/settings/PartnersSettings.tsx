import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { PartnershipsPage } from '../../features/partnerships/PartnershipsPage';
import { SubScreenContent } from './SettingsLayout';

interface PartnersSettingsProps {
    currentUser: User;
}

export const PartnersSettings: React.FC<PartnersSettingsProps> = ({ currentUser }) => {
    const navigate = useNavigate();

    return (
        <SubScreenContent title="Partner Companies" onBack={() => navigate('/settings')}>
            <PartnershipsPage currentUser={currentUser} />
        </SubScreenContent>
    );
};
