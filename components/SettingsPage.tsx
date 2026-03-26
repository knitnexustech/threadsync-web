
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { useTeam } from '../hooks/useTeam';
import { useSettings } from '../hooks/useSettings';
import { CompanyIdentityCard } from '../features/company-identity/CompanyIdentityCard';
import { PartnershipsPage } from '../features/partnerships/PartnershipsPage';

interface SettingsPageProps {
    currentUser: User;
    onLogout: () => void;
}

type SubScreen = null | 'GENERAL' | 'TEAM' | 'PARTNERS' | 'SECURITY' | 'NOTIFICATIONS' | 'DANGER';

const SubScreenContent: React.FC<{
    title: string;
    onBack: () => void;
    children: React.ReactNode;
}> = ({ title, onBack, children }) => (
    <div className="flex flex-col h-full bg-[#f0f2f5] w-full">
        {/* Header - Back button visible on mobile only */}
        <div className="bg-white px-4 py-4 md:py-6 flex items-center gap-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] z-10 sticky top-0">
            <button
                onClick={onBack}
                className="p-1.5 -ml-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors md:hidden"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 md:ml-4">{title}</h1>
        </div>
        
        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8">
            {/* Constrain width on large screens to prevent stretching */}
            <div className="max-w-4xl mx-auto space-y-6">
                {children}
            </div>
        </div>
    </div>
);

// ── List Row ─────────────────────────────────────────────────────────────────
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

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        {children}
    </div>
);

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
    const navigate = useNavigate();
    const [activeScreen, setActiveScreen] = useState<SubScreen>(null);

    const { teamList, addTeamMember, deleteTeamMember, inviteLink: teamInvite, setInviteLink: setTeamInvite, isAdding: isAddingTeam } = useTeam(currentUser);
    const { userCompany, updatePasscode, deleteOrganization, isUpdatingPasscode, isDeletingOrg } = useSettings(currentUser);

    const [newTeamMember, setNewTeamMember] = useState({ name: '', phone: '', passcode: '', role: 'JUNIOR_MERCHANDISER' as User['role'] });
    const [passcodeData, setPasscodeData] = useState({ oldPasscode: '', newPasscode: '', confirmPasscode: '' });
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const isAdmin = currentUser.role === 'ADMIN';

    const handleUpdatePasscode = () => {
        if (!passcodeData.oldPasscode || !passcodeData.newPasscode || !passcodeData.confirmPasscode) return alert('Fill all fields');
        if (passcodeData.newPasscode !== passcodeData.confirmPasscode) return alert('Mismatched new passcodes');
        updatePasscode({ oldPasscode: passcodeData.oldPasscode, newPasscode: passcodeData.newPasscode });
    };

    const handleDeleteOrg = async () => {
        if (deleteConfirmText !== userCompany?.name) return alert(`Type "${userCompany?.name}" exactly to confirm.`);
        if (window.confirm('FINAL WARNING: Permanent wipeout. Continue?')) {
            await deleteOrganization();
            onLogout();
            navigate('/');
        }
    };

    const inputCls = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008069]';

    // ── Sub-screen content (rendered in right panel) ─────────────────────────
    const renderSubScreen = () => {
        switch (activeScreen) {
            case 'GENERAL':
                return (
                    <SubScreenContent title="Company & Account" onBack={() => setActiveScreen(null)}>
                        <CompanyIdentityCard currentUser={currentUser} userCompany={userCompany} />
                    </SubScreenContent>
                );

            case 'NOTIFICATIONS':
                return (
                    <SubScreenContent title="Notifications" onBack={() => setActiveScreen(null)}>
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[15px] text-gray-900">Push Notifications</p>
                                    <p className="text-[12px] text-gray-400 mt-0.5">Test if your device is receiving alerts</p>
                                </div>
                                <button
                                    onClick={() => {
                                        if ('Notification' in window && Notification.permission === 'granted') {
                                            new Notification('Kramiz Test', { body: 'Working! ✅' });
                                        } else {
                                            alert('Please enable notifications in your browser first.');
                                        }
                                    }}
                                    className="px-4 py-2 border border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-all"
                                >
                                    Send Test
                                </button>
                            </div>
                        </div>
                    </SubScreenContent>
                );

            case 'TEAM':
                return (
                    <SubScreenContent title="Team Members" onBack={() => setActiveScreen(null)}>
                        {isAdmin && (
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
                                <h2 className="text-[15px] font-semibold text-gray-800">Add New Member</h2>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Full Name</label>
                                        <input type="text" value={newTeamMember.name} onChange={e => setNewTeamMember({ ...newTeamMember, name: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Role</label>
                                        <select value={newTeamMember.role} onChange={e => setNewTeamMember({ ...newTeamMember, role: e.target.value as any })} className={inputCls}>
                                            <option value="JUNIOR_MERCHANDISER">Junior Merchandiser</option>
                                            <option value="SENIOR_MERCHANDISER">Senior Merchandiser</option>
                                            <option value="JUNIOR_MANAGER">Junior Manager</option>
                                            <option value="SENIOR_MANAGER">Senior Manager</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Phone Number</label>
                                        <input type="tel" value={newTeamMember.phone} onChange={e => setNewTeamMember({ ...newTeamMember, phone: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-gray-400 mb-1">Passcode (4 digits)</label>
                                        <input type="password" maxLength={4} value={newTeamMember.passcode} onChange={e => setNewTeamMember({ ...newTeamMember, passcode: e.target.value })} className={inputCls} />
                                    </div>
                                </div>
                                <button onClick={() => addTeamMember(newTeamMember)} disabled={isAddingTeam} className="w-full mt-2 py-3 bg-[#008069] text-white rounded-xl font-medium shadow-sm hover:bg-[#006a57] transition-all">
                                    {isAddingTeam ? 'Inviting...' : 'Invite via WhatsApp'}
                                </button>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <p className="text-[11px] text-gray-400 px-5 py-3 border-b border-gray-100">Current Team ({teamList.length})</p>
                            <div className="divide-y divide-gray-100">
                                {teamList.map(member => (
                                    <div key={member.id} className="flex items-center gap-3 px-5 py-4">
                                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15px] text-gray-900 truncate">{member.name} {member.id === currentUser.id && <span className="text-[12px] text-gray-400">(You)</span>}</p>
                                            <p className="text-[12px] text-gray-400">{member.role.replace(/_/g, ' ')} · {member.phone}</p>
                                        </div>
                                        {isAdmin && member.id !== currentUser.id && (
                                            <button onClick={() => deleteTeamMember(member.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {teamInvite && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                                <div className="w-full max-w-sm bg-white rounded-3xl p-8">
                                    <div className="w-20 h-20 bg-green-100 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6">✅</div>
                                    <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">Invite Ready!</h3>
                                    <p className="text-gray-500 text-center mb-8 text-sm">Send the login details to your new team member via WhatsApp.</p>
                                    <a href={teamInvite} target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-[#25D366] text-white text-center rounded-2xl font-semibold shadow-xl hover:bg-[#128C7E] transition-all mb-3" onClick={() => setTeamInvite(null)}>
                                        Share on WhatsApp
                                    </a>
                                    <button onClick={() => setTeamInvite(null)} className="w-full py-3 text-gray-400 hover:text-gray-600 transition-all text-sm">Dismiss</button>
                                </div>
                            </div>
                        )}
                    </SubScreenContent>
                );

            case 'PARTNERS':
                return (
                    <SubScreenContent title="Partner Companies" onBack={() => setActiveScreen(null)}>
                        <PartnershipsPage currentUser={currentUser} />
                    </SubScreenContent>
                );

            case 'SECURITY':
                return (
                    <SubScreenContent title="Security" onBack={() => setActiveScreen(null)}>
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
                            <h2 className="text-[15px] font-semibold text-gray-800">Change Passcode</h2>
                            <input type="password" placeholder="Current 4-digit passcode" maxLength={4} value={passcodeData.oldPasscode} onChange={e => setPasscodeData({ ...passcodeData, oldPasscode: e.target.value })} className={inputCls + ' tracking-widest'} />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="password" placeholder="New" maxLength={4} value={passcodeData.newPasscode} onChange={e => setPasscodeData({ ...passcodeData, newPasscode: e.target.value })} className={inputCls + ' tracking-widest'} />
                                <input type="password" placeholder="Confirm" maxLength={4} value={passcodeData.confirmPasscode} onChange={e => setPasscodeData({ ...passcodeData, confirmPasscode: e.target.value })} className={inputCls + ' tracking-widest'} />
                            </div>
                            <button onClick={handleUpdatePasscode} disabled={isUpdatingPasscode} className="w-full py-3 bg-[#008069] text-white rounded-xl font-medium shadow-sm hover:bg-[#006a57] transition-all">
                                Update Passcode
                            </button>
                        </div>
                    </SubScreenContent>
                );

            case 'DANGER':
                return (
                    <SubScreenContent title="Danger Zone" onBack={() => setActiveScreen(null)}>
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
                                Delete Organization Forever
                            </button>
                        </div>
                    </SubScreenContent>
                );

            default:
                return null;
        }
    };

    // ── Left panel (settings list) ───────────────────────────────────────────
    const ListPanel = () => (
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
                    <ListRow icon="🏢" iconBg="bg-blue-100"   label="Company & Account" subtitle={userCompany?.name || 'Manage your company details'} onClick={() => setActiveScreen('GENERAL')}       active={activeScreen === 'GENERAL'} />
                    <ListRow icon="🔔" iconBg="bg-yellow-100" label="Notifications"     subtitle="Test and manage push alerts"                          onClick={() => setActiveScreen('NOTIFICATIONS')} active={activeScreen === 'NOTIFICATIONS'} />
                </Card>

                <SectionLabel label="Team" />
                <Card>
                    <ListRow icon="👥" iconBg="bg-green-100" label="Team Members"     subtitle={`${teamList.length} member${teamList.length !== 1 ? 's' : ''}`} onClick={() => setActiveScreen('TEAM')}     active={activeScreen === 'TEAM'} />
                    {isAdmin && (
                        <ListRow icon="🤝" iconBg="bg-teal-100" label="Partner Companies" subtitle="Connect with vendor & supplier companies" onClick={() => setActiveScreen('PARTNERS')} active={activeScreen === 'PARTNERS'} />
                    )}
                </Card>

                <SectionLabel label="Security" />
                <Card>
                    <ListRow icon="🔐" iconBg="bg-purple-100" label="Change Passcode"     subtitle="Update your 4-digit login passcode" onClick={() => setActiveScreen('SECURITY')} active={activeScreen === 'SECURITY'} />
                    {isAdmin && (
                        <ListRow icon="⚠️" iconBg="bg-red-100" label="Delete Organization" subtitle="Permanently wipe all data" onClick={() => setActiveScreen('DANGER')} destructive active={activeScreen === 'DANGER'} />
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

    return (
        <div className="flex h-full w-full overflow-hidden">

            {/* LEFT: settings list
                Mobile:  full-width, hidden when sub-screen active
                Desktop: fixed 288px, always visible                  */}
            <div className={`
                h-full flex-shrink-0 border-r border-gray-200 bg-[#f0f2f5]
                ${activeScreen
                    ? 'hidden md:block md:w-72 lg:w-80'
                    : 'block w-full   md:w-72 lg:w-80'
                }
            `}>
                <ListPanel />
            </div>

            {/* RIGHT: sub-screen
                Mobile:  full-screen when active, hidden otherwise
                Desktop: fills all remaining space                    */}
            <div className={`
                h-full overflow-hidden
                ${activeScreen ? 'block flex-1' : 'hidden md:block md:flex-1'}
            `}>
                {activeScreen ? renderSubScreen() : <RightPlaceholder />}
            </div>
        </div>
    );
};
