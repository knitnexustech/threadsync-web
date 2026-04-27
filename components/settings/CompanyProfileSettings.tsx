import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { CompanyIdentityCard } from '../../features/company-identity/CompanyIdentityCard';
import { SubScreenContent } from './SettingsLayout';

interface CompanyProfileSettingsProps {
    currentUser: User;
}

export const CompanyProfileSettings: React.FC<CompanyProfileSettingsProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { userCompany } = useSettings(currentUser);

    return (
        <SubScreenContent title="Company & Account" onBack={() => navigate('/settings')}>
            <CompanyIdentityCard currentUser={currentUser} userCompany={userCompany} />
        </SubScreenContent>
    );
};
