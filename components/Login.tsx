

import React, { useState } from 'react';
import { api } from '../supabaseAPI';
import { User } from '../types';

interface LoginProps {
    onLogin: (user: User, rememberMe: boolean) => void;
    onBack: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onBack }) => {
    const [phone, setPhone] = useState('');
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(true); // Default to checked

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate phone number (must be exactly 10 digits)
        if (!/^\d{10}$/.test(phone)) {
            setError('Phone number must be exactly 10 digits');
            return;
        }

        // Validate passcode (must be exactly 4 digits)
        if (!/^\d{4}$/.test(passcode)) {
            setError('Passcode must be exactly 4 digits');
            return;
        }

        setLoading(true);
        try {
            const { user } = await api.login(phone, passcode);
            onLogin(user, rememberMe); // Pass rememberMe flag
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
        if (value.length <= 10) {
            setPhone(value);
        }
    };

    const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
        if (value.length <= 4) {
            setPasscode(value);
        }
    };

    return (
        <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm relative">
                <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="text-center mb-8">
                    <div className="h-16 w-40 mx-auto mb-2 flex items-center justify-center">
                        <img src="/logo_v2.png" alt="Kramiz" className="w-full h-full object-contain" />
                    </div>
                    <p className="text-gray-500 text-sm">Follow-ups Simplified</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={handlePhoneChange}
                            placeholder="10-digit phone number"
                            className="w-full border-b-2 border-green-500 focus:outline-none py-2 text-lg bg-gray-50 px-2 text-gray-900 placeholder-gray-400"
                            autoFocus
                            maxLength={10}
                        />
                        <p className="text-xs text-gray-400 mt-1">{phone.length}/10 digits</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Passcode</label>
                        <input
                            type="password"
                            value={passcode}
                            onChange={handlePasscodeChange}
                            placeholder="4-digit passcode"
                            className="w-full border-b-2 border-green-500 focus:outline-none py-2 text-center text-2xl tracking-widest bg-gray-50 text-gray-900 placeholder-gray-300"
                            maxLength={4}
                        />
                        <p className="text-xs text-gray-400 mt-1">{passcode.length}/4 digits</p>
                    </div>

                    {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</p>}

                    {/* Remember Me Checkbox */}
                    <div className="flex items-center gap-2 py-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-[#008069] border-gray-300 rounded focus:ring-[#008069] focus:ring-2 cursor-pointer"
                        />
                        <label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer select-none">
                            Remember me on this device
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 -mt-2 ml-6">
                        {rememberMe ? '✓ Stay logged in for 30 days' : '⚠️ Session will end when browser closes'}
                    </p>

                    <button
                        type="submit"
                        disabled={loading || phone.length !== 10 || passcode.length !== 4}
                        className="w-full bg-[#008069] text-white py-2 rounded font-semibold hover:bg-[#006a57] disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {loading ? 'LOGGING IN...' : 'LOGIN'}
                    </button>
                </form>
            </div>
        </div>
    );
};
