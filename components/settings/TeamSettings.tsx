import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useTeam } from '../../hooks/useTeam';
import { SubScreenContent, Card, inputCls } from './SettingsLayout';

interface TeamSettingsProps {
    currentUser: User;
}

export const TeamSettings: React.FC<TeamSettingsProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { teamList, addTeamMember, deleteTeamMember, updateUserRole, inviteLink, setInviteLink, isAdding } = useTeam(currentUser);
    
    const [newTeamMember, setNewTeamMember] = useState({ 
        name: '', 
        phone: '', 
        passcode: '', 
        role: 'MERCHANDISER' as User['role'] 
    });

    const isAdmin = currentUser.role === 'ADMIN';

    const roles = [
        { value: 'MERCHANDISER', label: 'Merchandiser' },
        { value: 'MANAGER', label: 'Manager' },
        { value: 'SENIOR_STAFF', label: 'Senior Staff' },
        { value: 'JUNIOR_STAFF', label: 'Junior Staff' },
        { value: 'ADMIN', label: 'Admin' },
    ];

    return (
        <SubScreenContent title="Team Members" onBack={() => navigate('/settings')}>
            {isAdmin && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
                    <h2 className="text-[15px] font-semibold text-gray-800">Add New Member</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Full Name</label>
                            <input 
                                type="text" 
                                value={newTeamMember.name} 
                                onChange={e => setNewTeamMember({ ...newTeamMember, name: e.target.value })} 
                                className={inputCls} 
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Role</label>
                            <select 
                                value={newTeamMember.role} 
                                onChange={e => setNewTeamMember({ ...newTeamMember, role: e.target.value as any })} 
                                className={inputCls}
                            >
                                {roles.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Phone Number</label>
                            <input 
                                type="tel" 
                                value={newTeamMember.phone} 
                                onChange={e => setNewTeamMember({ ...newTeamMember, phone: e.target.value })} 
                                className={inputCls} 
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] text-gray-400 mb-1">Passcode (4 digits)</label>
                            <input 
                                type="password" 
                                maxLength={4} 
                                value={newTeamMember.passcode} 
                                onChange={e => setNewTeamMember({ ...newTeamMember, passcode: e.target.value })} 
                                className={inputCls} 
                            />
                        </div>
                    </div>
                    <button 
                        onClick={() => addTeamMember(newTeamMember)} 
                        disabled={isAdding} 
                        className="w-full mt-2 py-3 bg-[#008069] text-white rounded-xl font-medium shadow-sm hover:bg-[#006a57] transition-all disabled:opacity-50"
                    >
                        {isAdding ? 'Inviting...' : 'Invite via WhatsApp'}
                    </button>
                </div>
            )}

            <Card className="mt-6">
                <p className="text-[11px] text-gray-400 px-5 py-3 border-b border-gray-100">Current Team ({teamList.length})</p>
                <div className="divide-y divide-gray-100">
                    {teamList.map(member => (
                        <div key={member.id} className="flex items-center gap-3 px-5 py-4">
                            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm shrink-0">
                                {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] text-gray-900 truncate">
                                    {member.name} {member.id === currentUser.id && <span className="text-[12px] text-gray-400">(You)</span>}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {isAdmin && member.id !== currentUser.id ? (
                                        <select
                                            value={member.role}
                                            onChange={(e) => updateUserRole({ userId: member.id, role: e.target.value as any })}
                                            className="text-[12px] bg-transparent text-[#008069] font-semibold border-none p-0 focus:ring-0 cursor-pointer hover:underline decoration-dotted"
                                        >
                                            {roles.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-[12px] text-gray-400">{member.role.replace(/_/g, ' ')}</p>
                                    )}
                                    <span className="text-[12px] text-gray-300">·</span>
                                    <p className="text-[12px] text-gray-400 font-mono">{member.phone}</p>
                                </div>
                            </div>
                            {isAdmin && member.id !== currentUser.id && (
                                <button 
                                    onClick={() => deleteTeamMember(member.id)} 
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {inviteLink && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl">
                        <div className="w-20 h-20 bg-green-100 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6">✅</div>
                        <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">Invite Ready!</h3>
                        <p className="text-gray-500 text-center mb-8 text-sm">Send the login details to your new team member via WhatsApp.</p>
                        <a 
                            href={inviteLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block w-full py-4 bg-[#25D366] text-white text-center rounded-2xl font-semibold shadow-xl hover:bg-[#128C7E] transition-all mb-3" 
                            onClick={() => setInviteLink(null)}
                        >
                            Share on WhatsApp
                        </a>
                        <button 
                            onClick={() => setInviteLink(null)} 
                            className="w-full py-3 text-gray-400 hover:text-gray-600 transition-all text-sm"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </SubScreenContent>
    );
};
