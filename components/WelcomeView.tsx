
import React from 'react';

const WelcomeView: React.FC = () => {
    return (
        <div className="flex-1 bg-white flex flex-col items-center justify-center text-center p-6">
            <div className="h-20 w-48 mb-8">
                <img src="/logo_v2.png" alt="Kramiz" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-5xl font-black tracking-[0.15em] text-gray-900 mb-4 font-blanka uppercase">
                Kramiz (Beta) Web
            </h1>
            <p className="text-xl text-gray-500 max-w-md leading-relaxed">
                Select an order to start simplifying your follow-ups. <br />
                <span className="text-sm font-medium text-gray-400">Everything you need from order to shipment.</span>
            </p>
            <div className="mt-12 flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] border-t border-gray-50 pt-8">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                End-to-end encrypted
            </div>
        </div>
    );
};

export default WelcomeView;
