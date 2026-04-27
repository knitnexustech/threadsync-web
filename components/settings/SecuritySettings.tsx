import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../../types';
import { useSettings } from '../../hooks/useSettings';
import { SubScreenContent, inputCls } from './SettingsLayout';

interface SecuritySettingsProps {
    currentUser: User;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const { updatePasscode, isUpdatingPasscode } = useSettings(currentUser);
    const [passcodeData, setPasscodeData] = useState({ oldPasscode: '', newPasscode: '', confirmPasscode: '' });

    const handleUpdatePasscode = () => {
        if (!passcodeData.oldPasscode || !passcodeData.newPasscode || !passcodeData.confirmPasscode) return alert('Fill all fields');
        if (passcodeData.newPasscode !== passcodeData.confirmPasscode) return alert('Mismatched new passcodes');
        updatePasscode({ oldPasscode: passcodeData.oldPasscode, newPasscode: passcodeData.newPasscode });
    };

    return (
        <SubScreenContent title="Security" onBack={() => navigate('/settings')}>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
                <h2 className="text-[15px] font-semibold text-gray-800">Change Passcode</h2>
                <input 
                    type="password" 
                    placeholder="Current 4-digit passcode" 
                    maxLength={4} 
                    value={passcodeData.oldPasscode} 
                    onChange={e => setPasscodeData({ ...passcodeData, oldPasscode: e.target.value })} 
                    className={inputCls + ' tracking-widest'} 
                />
                <div className="grid grid-cols-2 gap-3">
                    <input 
                        type="password" 
                        placeholder="New" 
                        maxLength={4} 
                        value={passcodeData.newPasscode} 
                        onChange={e => setPasscodeData({ ...passcodeData, newPasscode: e.target.value })} 
                        className={inputCls + ' tracking-widest'} 
                    />
                    <input 
                        type="password" 
                        placeholder="Confirm" 
                        maxLength={4} 
                        value={passcodeData.confirmPasscode} 
                        onChange={e => setPasscodeData({ ...passcodeData, confirmPasscode: e.target.value })} 
                        className={inputCls + ' tracking-widest'} 
                    />
                </div>
                <button 
                    onClick={handleUpdatePasscode} 
                    disabled={isUpdatingPasscode} 
                    className="w-full py-3 bg-[#008069] text-white rounded-xl font-medium shadow-sm hover:bg-[#006a57] transition-all disabled:opacity-50"
                >
                    {isUpdatingPasscode ? 'Updating...' : 'Update Passcode'}
                </button>
            </div>
        </SubScreenContent>
    );
};
