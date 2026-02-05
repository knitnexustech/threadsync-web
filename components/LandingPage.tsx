
import React, { useState } from 'react';

interface LandingPageProps {
    onNavigate: (page: 'LOGIN' | 'SIGNUP') => void;
}

const swipeFeatures = [
    {
        title: "Invite your Suppliers",
        description: "Stop using messy group chats. Create private groups for your vendors and keep your business talk organized in one place.",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
        bg: "bg-green-50 text-[#008069]"
    },
    {
        title: "Upload Specification Files",
        description: "Attach your tech packs, lab dips, and design files directly to the chat. Your suppliers can download them with one click.",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        bg: "bg-blue-50 text-blue-600"
    },
    {
        title: "Install as an App",
        description: "You don't need to visit the website every time. Add Kramiz to your Phone Home Screen and use it like a regular mobile app.",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        ),
        bg: "bg-purple-50 text-purple-600"
    },
    {
        title: "Get Instant Notifications",
        description: "Stay updated on the go. Receive a notification on your device the moment a supplier sends you a message or an update.",
        icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
        ),
        bg: "bg-orange-50 text-orange-600"
    }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    const [activeFeature, setActiveFeature] = useState(0);

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="h-10 w-28 flex items-center">
                        <img src="/logo_v2.png" alt="Kramiz" className="h-full object-contain" />
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => onNavigate('LOGIN')} className="text-sm font-bold text-gray-600 hover:text-[#008069]">Sign In</button>
                        <button onClick={() => onNavigate('SIGNUP')} className="px-5 py-2 bg-[#008069] text-white text-sm font-bold rounded-full hover:bg-[#006a57] transition-all">Get Started</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-16 px-6">
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <div className="inline-block px-4 py-1.5 bg-green-50 text-[#008069] rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                        The simple way to track production
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black leading-[1.1] text-gray-900 uppercase">
                        Stop the <span className="text-[#008069]">Follow-up</span> <br /> Chaos today.
                    </h1>
                    <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
                        Kramiz is a simple app that helps manufacturers and vendors talk to each other. Track your orders, share files, and hit your deadlines without the mess.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <button onClick={() => onNavigate('SIGNUP')} className="px-8 py-4 bg-[#008069] text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-900/20 hover:scale-105 active:scale-95 transition-all">
                            Create Free Account
                        </button>
                        <button onClick={() => onNavigate('LOGIN')} className="px-8 py-4 bg-gray-50 text-gray-700 rounded-2xl font-bold text-lg border border-gray-200 hover:bg-white hover:border-gray-400 transition-all">
                            Login Member
                        </button>
                    </div>
                </div>
            </section>

            {/* Problem vs Solution Section */}
            <section className="py-20 bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Is your production stuck in WhatsApp?</h2>
                        <p className="text-gray-500 font-medium max-w-2xl mx-auto text-lg">
                            You have 50 active orders involved with 10 different vendors. And 1000 unread messages mixed with personal chats.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200 hover:border-red-200 transition-all duration-300">
                            <div className="text-xs font-black text-red-500 uppercase tracking-widest mb-4">The Old Way</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Chaos & Panic</h3>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-gray-500 font-medium">
                                    <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">✕</div>
                                    Lost in endless group chats
                                </li>
                                <li className="flex items-center gap-3 text-gray-500 font-medium">
                                    <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">✕</div>
                                    "I didn't see that message"
                                </li>
                                <li className="flex items-center gap-3 text-gray-500 font-medium">
                                    <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xs font-bold">✕</div>
                                    Files expired or lost
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border-2 border-[#008069] shadow-xl shadow-green-900/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-10 -mt-10"></div>
                            <div className="text-xs font-black text-[#008069] uppercase tracking-widest mb-4 relative z-10">The Kramiz Way</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">Organized Speed</h3>
                            <ul className="space-y-4 relative z-10">
                                <li className="flex items-center gap-3 text-gray-800 font-bold">
                                    <div className="h-6 w-6 rounded-full bg-[#008069] flex items-center justify-center text-white text-xs font-bold">✓</div>
                                    One group per order
                                </li>
                                <li className="flex items-center gap-3 text-gray-800 font-bold">
                                    <div className="h-6 w-6 rounded-full bg-[#008069] flex items-center justify-center text-white text-xs font-bold">✓</div>
                                    Separate from personal chats
                                </li>
                                <li className="flex items-center gap-3 text-gray-800 font-bold">
                                    <div className="h-6 w-6 rounded-full bg-[#008069] flex items-center justify-center text-white text-xs font-bold">✓</div>
                                    Files saved forever
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Swipe Section */}
            <section className="py-20 bg-gray-50 border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-extrabold text-gray-900">Core Features</h2>
                        <p className="text-gray-500 mt-2 font-medium">Simple tools built for production teams.</p>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 flex flex-col items-center text-center space-y-6 min-h-[380px] justify-center transition-all duration-500">
                            <div className={`p-6 rounded-2xl ${swipeFeatures[activeFeature].bg} animate-in zoom-in duration-300`}>
                                {swipeFeatures[activeFeature].icon}
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">{swipeFeatures[activeFeature].title}</h3>
                            <p className="text-gray-500 text-lg leading-relaxed font-medium">
                                {swipeFeatures[activeFeature].description}
                            </p>
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center items-center gap-6 mt-10">
                            <button
                                onClick={() => setActiveFeature((prev) => (prev - 1 + swipeFeatures.length) % swipeFeatures.length)}
                                className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white hover:border-[#008069] hover:text-[#008069] transition-all bg-white shadow-sm"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="flex gap-2">
                                {swipeFeatures.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveFeature(i)}
                                        className={`h-2 rounded-full transition-all ${i === activeFeature ? 'w-8 bg-[#008069]' : 'w-2 bg-gray-200'}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => setActiveFeature((prev) => (prev + 1) % swipeFeatures.length)}
                                className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white hover:border-[#008069] hover:text-[#008069] transition-all bg-white shadow-sm"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-block px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">
                            Start in 3 Minutes
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900">How it Works</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-100 z-0"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white border-4 border-gray-50 rounded-full flex items-center justify-center text-2xl font-black text-gray-300 mb-6 shadow-sm">
                                01
                            </div>
                            <h3 className="text-xl font-bold mb-3">Create an Order</h3>
                            <p className="text-gray-500 font-medium">Add your Style Number and PO Number to create a secure workspace.</p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white border-4 border-[#008069] rounded-full flex items-center justify-center text-2xl font-black text-[#008069] mb-6 shadow-lg shadow-green-900/10">
                                02
                            </div>
                            <h3 className="text-xl font-bold mb-3">Invite Vendor</h3>
                            <p className="text-gray-500 font-medium">Add your supplier's phone number. They get an invite to join instantly.</p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-white border-4 border-gray-50 rounded-full flex items-center justify-center text-2xl font-black text-gray-300 mb-6 shadow-sm">
                                03
                            </div>
                            <h3 className="text-xl font-bold mb-3">Start Tracking</h3>
                            <p className="text-gray-500 font-medium">Share files, chat, and watch the status move from Pending to Completed.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Detailed Info Grid */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="space-y-4">
                            <div className="text-2xl font-black text-[#008069]">01.</div>
                            <h4 className="text-xl font-bold uppercase tracking-tight">For Admins</h4>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                Manage your entire team from one place. Delete old members, add new users, and see every order in your factory with zero effort.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="text-2xl font-black text-[#008069]">02.</div>
                            <h4 className="text-xl font-bold uppercase tracking-tight">For Vendors</h4>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                Update your customer on order status without multiple phone calls. Everything is synced in real-time so everyone is happy.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="text-2xl font-black text-[#008069]">03.</div>
                            <h4 className="text-xl font-bold uppercase tracking-tight">For Managers</h4>
                            <p className="text-gray-500 font-medium leading-relaxed">
                                Find bottlenecks before they happen. Track exactly how many days an order has been pending and fix issues immediately.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto bg-gray-900 rounded-[2.5rem] p-12 text-center text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#008069]/20 blur-[100px] rounded-full"></div>
                    <h2 className="text-3xl md:text-5xl font-extrabold mb-6 relative z-10">Start Tracking Smarter.</h2>
                    <p className="text-gray-400 text-lg mb-10 relative z-10 max-w-lg mx-auto">Join the production teams that save 10 hours a week on follow-ups.</p>
                    <button onClick={() => onNavigate('SIGNUP')} className="px-10 py-5 bg-[#008069] text-white rounded-2xl font-bold text-xl hover:bg-[#006a57] relative z-10 active:scale-95 transition-all">
                        Get Started Free
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-100 flex flex-col items-center space-y-6">
                <div className="h-10 w-28 opacity-40 grayscale">
                    <img src="/logo_v2.png" alt="Kramiz" className="h-full object-contain" />
                </div>
                <div className="flex gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                    <a href="#" className="hover:text-gray-900">Privacy</a>
                    <a href="#" className="hover:text-gray-900">Security</a>
                    <a href="#" className="hover:text-gray-900">Contact</a>
                </div>
                <p className="text-xs text-gray-400">© 2024 Kramiz. Follow-ups Simplified.</p>
            </footer>
        </div>
    );
};
