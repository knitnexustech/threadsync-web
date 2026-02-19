import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface LandingPageProps {
    onDemoLogin: () => void;
}

const DEMO_CHAT_MESSAGES = [
    { sender: 'Dyeing Dept', text: 'Received DC #5050. Starting dyeing now.', time: '10:00 AM', myself: false },
    { sender: 'You', text: 'Confirmed. Upload Lab Dips when ready.', time: '10:02 AM', myself: true },
    { sender: 'Dyeing Dept', text: 'Lab dip attached. 📎', time: '10:15 AM', myself: false },
    { sender: 'System', text: 'Status: DYEING -> IN PROGRESS', time: '10:15 AM', isSystem: true },
];

const CHAOS_MESSAGES = [
    { sender: '+91 98765...', text: 'Where is the DC?? Fabric sent yesterday!', time: '09:15 AM', color: 'text-orange-600' },
    { sender: 'Dyeing Master', text: '⚠️ Photo failed to load. Send again.', time: '09:45 AM', color: 'text-blue-600' },
    { sender: 'Knitter', text: 'Status?? Machine is waiting.', time: '10:00 AM', color: 'text-purple-600' },
    { sender: 'Merchandiser', text: 'Who has the file? I lost it.', time: '10:10 AM', color: 'text-red-600' },
    { sender: '+91 99887...', text: '???', time: '10:15 AM', color: 'text-gray-600' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onDemoLogin }) => {
    const navigate = useNavigate();
    const [msgIndex, setMsgIndex] = useState(0);
    const [chaosIndex, setChaosIndex] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    // Auto-play demo chat (Solution)
    useEffect(() => {
        const interval = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % (DEMO_CHAT_MESSAGES.length + 1));
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    // Auto-play chaos chat (Pain)
    useEffect(() => {
        const interval = setInterval(() => {
            setChaosIndex((prev) => (prev + 1) % (CHAOS_MESSAGES.length + 1));
        }, 1200); // Slightly faster chaos
        return () => clearInterval(interval);
    }, []);

    // Scroll listener for nav
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900 selection:bg-[#008069] selection:text-white flex flex-col">

            {/* Sticky Navigation */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src="/logo_v2.png" alt="Kramiz" className="h-8 md:h-10 object-contain" />
                        <span className="text-xs align-top opacity-70 normal-case font-sans font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-1">(Beta)</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-[#008069] transition-colors"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-6 py-2.5 bg-[#008069] text-white text-sm font-bold rounded-full shadow-lg shadow-green-900/20 hover:bg-[#006a57] hover:scale-105 active:scale-95 transition-all"
                        >
                            Start Tracking
                        </button>
                    </div>
                </div>
            </nav>

            {/* HERO SECTION - 3 COLUMNS UPDATED */}
            <section className="pt-32 pb-20 px-4 md:px-6 lg:pt-40 lg:pb-32 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#008069]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

                <div className="max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-3 gap-12 lg:gap-8 items-center relative z-10">

                    {/* LEFT: PAIN (Chaos) - Order 1 on Mobile */}
                    <div className="order-1 lg:order-1 w-full max-w-sm mx-auto relative group">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-30 bg-white px-4 py-1.5 rounded-full shadow-md border border-red-100 text-red-600 font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                            ⚠️ The Chaos
                        </div>
                        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-500 hover:shadow-2xl relative z-10">
                            {/* Header */}
                            <div className="bg-[#075E54] p-4 flex items-center justify-between text-white">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-700 font-bold">Grp</div>
                                    <div>
                                        <div className="font-bold text-sm">Factory Group</div>
                                        <div className="text-[10px] opacity-80">You, Dyer, Knitter...</div>
                                    </div>
                                </div>
                                <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                                    {50 + chaosIndex}
                                </div>
                            </div>
                            {/* Chat */}
                            <div className="h-[320px] bg-[#E5DDD5] p-4 flex flex-col gap-3 relative text-sm overflow-hidden">
                                <div className="absolute inset-0 opacity-10 bg-[url('https://adwwj.com/wp-content/uploads/2018/10/whatsapp-background.png')] bg-repeat"></div>

                                <div className="flex flex-col gap-3 justify-end h-full">
                                    {CHAOS_MESSAGES.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`transition-all duration-500 transform ${i < chaosIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 hidden'} self-start bg-white p-2.5 rounded-lg rounded-tl-none shadow-sm max-w-[85%] border border-gray-100`}
                                        >
                                            <div className={`text-[10px] font-bold mb-0.5 ${msg.color}`}>{msg.sender}</div>
                                            <div className="text-gray-800 leading-snug">{msg.text}</div>
                                            <div className="text-[9px] text-gray-400 text-right mt-1">{msg.time}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-md border border-red-100 text-red-600 font-bold text-sm flex items-center gap-2">
                            ⚠️ The Chaos
                        </div>
                    </div>

                    {/* CENTER: TEXT - Order 2 on Mobile */}
                    <div className="order-2 lg:order-2 text-center relative z-20">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full text-[#008069] text-xs font-bold uppercase tracking-widest animate-in slide-in-from-bottom-2 fade-in duration-700 mb-6">
                            <span className="w-2 h-2 rounded-full bg-[#008069] animate-pulse"></span>
                            Production Tracking Simplified
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight text-gray-900 drop-shadow-sm mb-6">
                            Track Every Order. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008069] to-[#00b894]">Greige to Garment.</span>
                        </h1>

                        <p className="text-lg text-gray-500 font-bold mb-2">Switch from Chaos to Kramiz(Beta).</p>
                        <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed max-w-sm mx-auto mb-8">
                            Connect Every Supplier in one simple flow.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={onDemoLogin}
                                className="px-6 py-3 bg-[#008069] text-white rounded-xl font-bold text-base shadow-lg shadow-green-900/20 hover:shadow-green-900/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="text-xl">🚀</span>
                                Try Live Demo
                            </button>
                            <button
                                onClick={() => navigate('/signup')}
                                className="px-6 py-3 bg-white text-[#008069] rounded-xl font-bold text-base border border-[#008069]/20 hover:bg-green-50 transition-all font-bold"
                            >
                                Start Tracking
                            </button>
                        </div>
                    </div>

                    {/* RIGHT: SOLUTION (Kramiz) - Order 3 on Mobile */}
                    <div className="order-3 lg:order-3 w-full max-w-sm mx-auto relative group">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-30 bg-white px-4 py-1.5 rounded-full shadow-md border border-green-100 text-[#008069] font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                            ✨ The Solution
                        </div>
                        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-500 hover:shadow-2xl relative z-10">
                            {/* App Header */}
                            <div className="bg-[#008069] p-4 text-white">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">ORD</div>
                                        <div>
                                            <div className="font-bold text-sm flex items-center gap-2">
                                                Order #505
                                                <span className="bg-green-400 text-green-900 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm">Active</span>
                                            </div>
                                            <div className="text-[10px] opacity-80">Online</div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold opacity-80">Kramiz</div>
                                </div>
                                {/* Pinned DC */}
                                <div className="bg-white/10 rounded px-2 py-1 flex items-center justify-between text-[10px] backdrop-blur-sm">
                                    <div className="flex items-center gap-1.5">
                                        <span>📎</span>
                                        <span className="font-medium">DC-5050.pdf</span>
                                    </div>
                                    <span className="opacity-70">Pinned</span>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="h-[320px] bg-[#f0f2f5] p-3 flex flex-col gap-3 relative overflow-hidden">
                                {/* Progress Bar */}
                                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mb-2">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dyeing Dept</span>
                                        <span className="text-[10px] font-bold text-[#008069]">Received DC</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#008069] w-[60%] rounded-full relative overflow-hidden">
                                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_1s_infinite]"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 justify-end h-full pb-2">
                                    {DEMO_CHAT_MESSAGES.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`transition-all duration-500 transform ${i < msgIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 hidden'} ${msg.isSystem ? 'self-center my-1' : msg.myself ? 'self-end' : 'self-start'}`}
                                        >
                                            {msg.isSystem ? (
                                                <span className="bg-[#E1F3FB] text-gray-600 text-[10px] px-3 py-1 rounded-full shadow-sm font-bold uppercase tracking-wider">
                                                    {msg.text}
                                                </span>
                                            ) : (
                                                <div className={`p-2.5 rounded-lg text-xs shadow-sm max-w-[85%] border ${msg.myself ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none border-green-100' : 'bg-white text-gray-800 rounded-tl-none border-gray-100'}`}>
                                                    <div className={`text-[10px] font-bold mb-0.5 ${msg.myself ? 'text-[#008069]' : 'text-orange-600'}`}>
                                                        {msg.sender}
                                                    </div>
                                                    {msg.text}
                                                    <div className="text-[9px] text-gray-400 text-right mt-1">{msg.time}</div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>



            {/* PAIN POINTS SECTION */}
            <section className="py-24 bg-white relative">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6">Why switch?</h2>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                            Managing production on WhatsApp is a nightmare. <br />
                            <span className="text-[#008069] font-bold">Kramiz (Beta) is the solution.</span>
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* PAIN */}
                        <div className="p-8 rounded-3xl bg-red-50/50 border border-red-100 hover:border-red-200 transition-all group">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">😫</div>
                                <h3 className="text-2xl font-bold text-red-900">The Struggle</h3>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex gap-3 text-red-800 font-medium items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Calls, WhatsApps, and lost excels
                                </li>
                                <li className="flex gap-3 text-red-800 font-medium items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Delivery Challans (DC) get lost
                                </li>
                                <li className="flex gap-3 text-red-800 font-medium items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    "Status??" messages every hour
                                </li>
                            </ul>
                        </div>

                        {/* SOLUTION */}
                        <div className="p-8 rounded-3xl bg-green-50/50 border border-green-100 hover:border-green-300 transition-all group shadow-sm shadow-green-900/5">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-[#008069] rounded-2xl flex items-center justify-center text-2xl text-white group-hover:scale-110 transition-transform">😍</div>
                                <h3 className="text-2xl font-bold text-[#008069]">The Kramiz Way</h3>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex gap-3 text-gray-800 font-bold items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Connect with Suppliers for each order in a flow
                                </li>
                                <li className="flex gap-3 text-gray-800 font-bold items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Upload DCs and Lab Dips securely
                                </li>
                                <li className="flex gap-3 text-gray-800 font-bold items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Updates faster than a phone call
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* TRUST SECTION (Built for Factory Floor) */}
            <section className="py-16 bg-[#008069] text-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                            <div className="text-3xl mb-3">🏭</div>
                            <h3 className="font-bold text-lg mb-1">Built for the Factory Floor</h3>
                            <p className="text-white/80 text-sm">We know signals are weak. Works perfectly on 2G/3G networks.</p>
                        </div>
                        <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                            <div className="text-3xl mb-3">🔒</div>
                            <h3 className="font-bold text-lg mb-1">100% Secure & Private</h3>
                            <p className="text-white/80 text-sm">Your designs and order data are visible only to your invited team.</p>
                        </div>
                        <div className="p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                            <div className="text-3xl mb-3">⚡</div>
                            <h3 className="font-bold text-lg mb-1">Zero-Lag Updates</h3>
                            <p className="text-white/80 text-sm">Status updates sync faster than a phone call. No manual refreshing.</p>
                        </div>
                    </div>
                </div>
            </section>
            {/* ROLES & PERMISSIONS SECTION */}
            <section className="py-24 bg-gray-50/50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <span className="text-[#008069] font-black uppercase tracking-widest text-xs">Security & Access</span>
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mt-4 mb-6">Built for every team role.</h2>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
                            Granular permissions ensure the right people see the right data. <br />
                            <span className="text-[#008069]">No overlaps. No leaks. No privacy risks.</span>
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* BRAND / ADMIN */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="w-14 h-14 bg-green-100/50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">👑</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Factory Admins</h3>
                            <p className="text-gray-500 font-medium leading-relaxed mb-6">Complete control over the production ecosystem.</p>
                            <ul className="space-y-3">
                                {[
                                    'Create & Manage all Orders',
                                    'Invite & Remove Partners',
                                    'Access to all File Vaults',
                                    'Bird\'s eye view of all statuses'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                        <svg className="w-4 h-4 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* FACTORY PARTNERS */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-[#008069]/20 shadow-lg shadow-green-900/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="bg-[#008069] text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Limited Access</span>
                            </div>
                            <div className="w-14 h-14 bg-[#008069] rounded-2xl flex items-center justify-center text-3xl mb-6 text-white group-hover:scale-110 transition-transform">🏭</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Factory Vendors</h3>
                            <p className="text-gray-500 font-medium leading-relaxed mb-6">Designed for Dyers, Knitters, Printers, Embroiders etc., on the go.</p>
                            <ul className="space-y-3">
                                {[
                                    'See only assigned Orders',
                                    'Cannot see other suppliers',
                                    'Update status in one tap',
                                    'Upload DCs directly from site'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                        <svg className="w-4 h-4 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* MANAGEMENT */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                            <div className="w-14 h-14 bg-blue-100/50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">📊</div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Management</h3>
                            <p className="text-gray-500 font-medium leading-relaxed mb-6">High-level insights for decision makers.</p>
                            <ul className="space-y-3">
                                {[
                                    'Complete oversight of all Order channels',
                                    'Add and manage internal team members',
                                    'Real-time production status monitoring',
                                    'Access to all internal & vendor files'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-700">
                                        <svg className="w-4 h-4 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES GRID */}
            <section className="py-24 bg-[#FAFAFA]" id="features">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-[#008069] font-black uppercase tracking-widest text-xs">Features</span>
                        <h2 className="text-4xl font-black text-gray-900 mt-2">Everything you need.</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'Greige Tracking', desc: 'Track every meter from knitting to finishing. No more manual follow-ups.', icon: '📊' },
                            { title: 'Digital DC Vault', desc: 'Upload Delivery Challans (DC) and Lab Dips. Never lose a paper document again.', icon: '📂' },
                            { title: 'Field-Ready App', desc: 'Built for factory signals. Get instant notifications even on weak 2G/3G networks.', icon: '📱' },
                            { title: 'Privacy Controls', desc: 'Admins control who sees what. Keep sensitive buyer data away from suppliers.', icon: '🔒' },
                            { title: 'One Order, One Flow', desc: 'Connect Knitters, Dyers, and Printers in one flow. Every Order has its own channel.', icon: '💬' },
                            { title: 'Smart Search', desc: 'Find any Order Number, Style Code, or Batch ID in milliseconds.', icon: '⚡' },
                        ].map((feat, i) => (
                            <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 hover:shadow-xl hover:shadow-[#008069]/10 hover:-translate-y-1 transition-all duration-300">
                                <div className="text-4xl mb-4">{feat.icon}</div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS (Timeline) */}
            <section className="py-24 bg-white" id="how-it-works">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black text-gray-900">Start in 3 steps.</h2>
                    </div>

                    <div className="space-y-12 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-8 top-8 bottom-8 w-1 bg-gray-100 md:left-1/2 md:-ml-0.5 rounded-full z-0"></div>

                        {/* Step 1 */}
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
                            <div className="w-16 h-16 rounded-full bg-white border-4 border-[#008069] text-[#008069] font-black text-xl flex items-center justify-center shadow-lg md:order-2 shrink-0">1</div>
                            <div className="bg-gray-50 p-6 rounded-3xl md:w-1/2 md:text-right md:order-1 border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Create Order</h3>
                                <p className="text-gray-500 mt-2">Create an Order in 10 seconds. Just enter Order number and style code.</p>
                            </div>
                            <div className="hidden md:block md:w-1/2 md:order-3"></div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
                            <div className="w-16 h-16 rounded-full bg-white border-4 border-[#008069] text-[#008069] font-black text-xl flex items-center justify-center shadow-lg shrink-0">2</div>
                            <div className="hidden md:block md:w-1/2"></div>
                            <div className="bg-gray-50 p-6 rounded-3xl md:w-1/2 border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Invite Partners</h3>
                                <p className="text-gray-500 mt-2">Invite your Dyer or Knitter via mobile. They only see what you allow.</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
                            <div className="w-16 h-16 rounded-full bg-white border-4 border-[#008069] text-[#008069] font-black text-xl flex items-center justify-center shadow-lg md:order-2 shrink-0">3</div>
                            <div className="bg-gray-50 p-6 rounded-3xl md:w-1/2 md:text-right md:order-1 border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Track Live</h3>
                                <p className="text-gray-500 mt-2">Get live status and DC photos instantly. No more chasing for updates.</p>
                            </div>
                            <div className="hidden md:block md:w-1/2 md:order-3"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FUTURE FEATURES */}
            <section className="py-24 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-bold text-xs uppercase tracking-widest mb-6">
                        Coming Soon to Kramiz (Beta)
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-16">The Future of Production.</h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'AI Delay Prediction', icon: '🤖', desc: 'Our AI will analyze your chat and warn you about potential delays before they happen.' },
                            { title: 'Automated T&A', icon: '📅', desc: 'Timeline & Action plans that auto-update based on your supplier conversations.' },
                            { title: 'Global Sourcing Network', icon: '🌍', desc: 'Instantly connect with verified factories and suppliers customized for your brand.' }
                        ].map((item, i) => (
                            <div key={i} className="group p-8 rounded-3xl bg-white border border-gray-100 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-900/5 transition-all text-left">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-purple-50 transition-all mb-6">{item.icon}</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">{item.title}</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 md:px-12">
                <div className="max-w-5xl mx-auto bg-[#111827] rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#008069] rounded-full blur-[128px] opacity-40"></div>
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600 rounded-full blur-[128px] opacity-20"></div>

                    <div className="relative z-10 space-y-8">
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">
                            Ready to simplify?
                        </h2>
                        <p className="text-gray-400 text-xl max-w-xl mx-auto">
                            Join the production teams that save countless hours on manual follow-ups every week.
                        </p>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-10 py-5 bg-[#008069] text-white rounded-full font-bold text-xl hover:bg-[#006a57] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#008069]/30"
                        >
                            Start Tracking Your Orders Now
                        </button>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 border-t border-gray-200 bg-white text-center">
                <p className="font-blanka text-2xl text-gray-300 uppercase tracking-widest mb-4">Kramiz (Beta)</p>
                <div className="flex justify-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <a href="#" className="hover:text-[#008069] transition-colors">Privacy</a>
                    <a href="#" className="hover:text-[#008069] transition-colors">Terms</a>
                    <a href="#" className="hover:text-[#008069] transition-colors">Support</a>
                </div>
                <p className="text-xs text-gray-300 mt-8">© 2024 Kramiz. Production Tracking.</p>
            </footer>
        </div >
    );
};
