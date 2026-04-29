import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Company, hasPermission } from '../../types';
import { Card } from './SettingsLayout';

interface ListPanelProps {
    currentUser: User;
    userCompany: Company | null | undefined;
    teamCount: number;
    activeRoute: string;
    onLogout: () => void;
}

const ListRow: React.FC<{
    icon: string;
    iconBg: string;
    label: string;
    subtitle?: string;
    onClick: () => void;
    destructive?: boolean;
    active?: boolean;
}> = ({ icon, iconBg, label, subtitle, onClick, destructive, active }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left ${
            active ? 'bg-green-50 border-l-4 border-l-[#008069]' : ''
        }`}
    >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${iconBg}`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className={`text-[15px] font-normal ${destructive ? 'text-red-600' : 'text-gray-900'}`}>{label}</p>
            {subtitle && <p className="text-[12px] text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
    </button>
);

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <p className="text-[12px] text-gray-500 uppercase tracking-wide px-4 pt-5 pb-1">{label}</p>
);

export const SettingsListPanel: React.FC<ListPanelProps> = ({ 
    currentUser,
    userCompany, 
    teamCount, 
    activeRoute, 
    onLogout 
}) => {
    const navigate = useNavigate();
    const canManagePartners = hasPermission(currentUser.role, 'MANAGE_CONTACTS');
    const canDeleteOrg = hasPermission(currentUser.role, 'DELETE_ORG');

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5]">
            <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shadow-sm safe-pt">
                <h1 className="text-[17px] font-semibold text-gray-900">Settings</h1>
                <button onClick={onLogout} className="text-[13px] text-red-500 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    Logout
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-20">
                <SectionLabel label="Account" />
                <Card>
                    <ListRow 
                        icon="🏢" 
                        iconBg="bg-blue-100"   
                        label="Company & Account" 
                        subtitle={userCompany?.name || 'Manage your company details'} 
                        onClick={() => navigate('/settings/company')}       
                        active={activeRoute === 'company'} 
                    />
                    <ListRow 
                        icon="🔔" 
                        iconBg="bg-yellow-100" 
                        label="Notifications"     
                        subtitle="Test and manage push alerts"                          
                        onClick={() => navigate('/settings/notifications')} 
                        active={activeRoute === 'notifications'} 
                    />
                </Card>

                <SectionLabel label="Team" />
                <Card>
                    <ListRow 
                        icon="👥" 
                        iconBg="bg-green-100" 
                        label="Team Members"     
                        subtitle={`${teamCount} member${teamCount !== 1 ? 's' : ''}`} 
                        onClick={() => navigate('/settings/team')}     
                        active={activeRoute === 'team'} 
                    />
                    {canManagePartners && (
                        <ListRow 
                            icon="🤝" 
                            iconBg="bg-teal-100" 
                            label="Partner Companies" 
                            subtitle="Connect with vendor & supplier companies" 
                            onClick={() => navigate('/settings/partners')} 
                            active={activeRoute === 'partners'} 
                        />
                    )}
                </Card>

                <SectionLabel label="Security" />
                <Card>
                    <ListRow 
                        icon="🔐" 
                        iconBg="bg-purple-100" 
                        label="Change Passcode"     
                        subtitle="Update your 4-digit login passcode" 
                        onClick={() => navigate('/settings/security')} 
                        active={activeRoute === 'security'} 
                    />

                    {canDeleteOrg && (
                        <ListRow 
                            icon="⚠️" 
                            iconBg="bg-red-100" 
                            label="Delete Organization" 
                            subtitle="Permanently wipe all data" 
                            onClick={() => navigate('/settings/danger')} 
                            destructive 
                            active={activeRoute === 'danger'} 
                        />
                    )}
                </Card>

                <SectionLabel label="App" />
                <Card>
                    <div className="px-4 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg">ℹ️</div>
                        <div>
                            <p className="text-[15px] text-gray-800">Kramiz Beta</p>
                            <p className="text-[12px] text-gray-400">Production follow-up simplified</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
