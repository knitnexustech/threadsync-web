import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { User } from '../types';
import { useTeam } from '../hooks/useTeam';
import { useSettings } from '../hooks/useSettings';

// Modular Screen Components
import { CompanyProfileSettings } from './settings/CompanyProfileSettings';
import { NotificationsSettings } from './settings/NotificationsSettings';
import { TeamSettings } from './settings/TeamSettings';
import { PartnersSettings } from './settings/PartnersSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { DangerSettings } from './settings/DangerSettings';
import { SettingsListPanel } from './settings/SettingsListPanel';

interface SettingsPageProps {
    currentUser: User;
    onLogout: () => void;
}

// ── Right panel empty state (desktop only) ───────────────────────────────────
const RightPlaceholder: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-[#f0f2f5]">
        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-2xl mb-4">
            ⚙️
        </div>
        <p className="text-[15px] font-medium text-gray-500">Select a setting</p>
        <p className="text-[12px] text-gray-400 mt-1">Choose from the list on the left</p>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onLogout }) => {
    const location = useLocation();

    const isRoot = location.pathname === '/settings' || location.pathname === '/settings/';
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const activeRoute = pathSegments[1] || ''; // 'company', 'team', etc.

    const { teamList } = useTeam(currentUser);
    const { userCompany } = useSettings(currentUser);



    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* LEFT: settings list */}
            <div className={`
                h-full flex-shrink-0 border-r border-gray-200 bg-[#f0f2f5]
                ${!isRoot ? 'hidden md:block md:w-72 lg:w-80' : 'block w-full md:w-72 lg:w-80'}
            `}>
                <SettingsListPanel 
                    currentUser={currentUser}
                    userCompany={userCompany}
                    teamCount={teamList.length}
                    activeRoute={activeRoute}
                    onLogout={onLogout}
                />
            </div>

            {/* RIGHT: sub-screen */}
            <div className={`
                h-full overflow-hidden
                ${!isRoot ? 'block flex-1' : 'hidden md:block md:flex-1'}
            `}>
                <Routes>
                    <Route path="/" element={<RightPlaceholder />} />
                    <Route path="/company" element={<CompanyProfileSettings currentUser={currentUser} />} />
                    <Route path="/notifications" element={<NotificationsSettings />} />
                    <Route path="/team" element={<TeamSettings currentUser={currentUser} />} />
                    <Route path="/partners" element={<PartnersSettings currentUser={currentUser} />} />
                    <Route path="/security" element={<SecuritySettings currentUser={currentUser} />} />
                    <Route path="/danger" element={<DangerSettings currentUser={currentUser} onLogout={onLogout} />} />
                </Routes>
            </div>
        </div>
    );
};
