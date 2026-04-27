import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SubScreenContent } from './SettingsLayout';

export const NotificationsSettings: React.FC = () => {
    const navigate = useNavigate();

    return (
        <SubScreenContent title="Notifications" onBack={() => navigate('/settings')}>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
                        className="px-4 py-2 border border-blue-200 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-50 transition-all w-full sm:w-auto"
                    >
                        Send Test
                    </button>
                </div>
            </div>
        </SubScreenContent>
    );
};
