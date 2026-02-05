
import React from 'react';

interface LandingPageProps {
    onNavigate: (page: 'LOGIN' | 'SIGNUP') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-12 w-28 flex items-center justify-center">
                            <img src="/logo_v2.png" alt="Kramiz" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="hidden md:flex gap-8 text-sm font-medium text-gray-500">
                        <a href="#features" className="hover:text-[#008069] transition-colors">Features</a>
                        <a href="#security" className="hover:text-[#008069] transition-colors">Security</a>
                        <a href="#solutions" className="hover:text-[#008069] transition-colors">Solutions</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate('LOGIN')}
                            className="text-sm font-bold text-gray-700 hover:text-[#008069] px-4"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => onNavigate('SIGNUP')}
                            className="px-6 py-2.5 bg-[#008069] text-white text-sm font-bold rounded-full hover:bg-[#006a57] shadow-lg shadow-green-900/10 transition-all active:scale-95"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 px-6">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                            <span className="flex h-2 w-2 rounded-full bg-[#008069] animate-pulse"></span>
                            <span className="text-[10px] font-black text-[#008069] uppercase tracking-widest">Version 2.0 Live</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] uppercase">
                            The Operating System for <br />
                            <span className="text-[#008069] font-bold tracking-widest">Follow-ups</span>
                        </h1>

                        <p className="text-xl text-gray-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            <></>Kramiz automates the chaos of production communications. Track orders, manage specs, and streamline follow-ups in one high-speed platform.
                        </p>

                        <div className="flex items-center gap-3 pt-2">
                            <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                                AI Features Coming Soon
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <button
                                onClick={() => onNavigate('SIGNUP')}
                                className="px-8 py-4 bg-[#008069] text-white rounded-xl font-bold text-lg shadow-xl shadow-green-900/20 hover:bg-[#006a57] transition-all hover:-translate-y-1"
                            >
                                Start for free
                            </button>
                            <button
                                className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-lg hover:border-gray-400 transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-6 h-6 text-[#008069]" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                Watch Product Tour
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative animate-in fade-in zoom-in duration-1000">
                        <div className="absolute inset-0 bg-green-500/10 blur-[120px] rounded-full"></div>
                        <img
                            src="/hero-dashboard.png"
                            alt="Kramiz Dashboard"
                            className="relative w-full rounded-2xl shadow-2xl border border-gray-100"
                        />
                    </div>
                </div>
            </section>

            {/* Feature Showcase Section - Real UI */}
            <section className="py-24 bg-white border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-24 items-center">
                    <div className="space-y-6">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Your team, <br /><span className="text-[#008069]">aligned in real-time.</span></h2>
                        <p className="text-lg text-gray-500 leading-relaxed">
                            No more messy group chats or missing emails. Kramiz provides a structured workspace where every role—from Admin to Vendor—has exactly the visibility they need.
                        </p>
                        <ul className="space-y-4">
                            {['Granular role-based access', 'Secure one-click member invites', 'Instant supplier onboarding'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 font-bold text-gray-700">
                                    <div className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-[#008069]/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                        <img
                            src="/team-management.png"
                            className="relative w-full rounded-2xl shadow-xl border border-gray-100 transition-transform group-hover:-translate-y-2"
                            alt="Kramiz Team Interface"
                        />
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-24 items-center mt-32">
                    <div className="order-2 lg:order-1 relative group">
                        <div className="absolute inset-0 bg-[#008069]/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                        <img
                            src="/mobile-sync.png"
                            className="relative w-full max-w-sm mx-auto rounded-[3rem] shadow-2xl transition-transform group-hover:scale-105"
                            alt="Kramiz Mobile App"
                        />
                    </div>
                    <div className="order-1 lg:order-2 space-y-6">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Production tracking in your pocket.</h2>
                        <p className="text-lg text-gray-500 leading-relaxed">
                            Stay updated on the factory floor or during client meetings. Our mobile-first interface ensures you never miss a critical production milestone or follow-up.
                        </p>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="text-2xl font-bold text-[#008069]">99.9%</div>
                                <div className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1 text-nowrap">Uptime Guaranteed</div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="text-2xl font-bold text-[#008069]">2s</div>
                                <div className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1 text-nowrap">Real-time Sync</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-gray-50/10 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center space-y-4 mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold">Built for the simplicity of order tracking</h2>
                        <p className="text-gray-500 max-w-xl mx-auto font-medium">Everything you need to move from order to shipment with ease.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Real-time Channels */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="h-12 w-12 bg-green-50 rounded-xl flex items-center justify-center text-[#008069] mb-6 group-hover:bg-[#008069] group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Dedicated Groups</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Real-time collaboration. Dedicated groups for your supplier (like Knitting, Dyeing, Printing, etc) ensuring zero communication leakage.
                        </p>
                    </div>

                    {/* Smart Tracking */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Order Orchestration</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Track complex Orders with granular style updates. Instant visibility into vendor progress and bottleneck detection.
                        </p>
                    </div>

                    {/* Asset Management */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-3">Central Asset Hub</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            One source of truth for all specs, lab dips, and follow-ups. Direct drag-and-drop uploads within any active channel.
                        </p>
                    </div>

                    {/* Vendor Onboarding */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="h-12 w-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-3">1-Click Onboarding</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Add partners instantly. Generate WhatsApp invite links with pre-set passcodes for immediate vendor participation and sync.
                        </p>
                    </div>

                    {/* Enterprise Security */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04Customizable security layers 0A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-3">RBAC Security</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Granular permissions for Admins, Merchandisers, and Vendors. Secure your proprietary designs with zero-trust protocols.
                        </p>
                    </div>

                    {/* AI Engine */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-tighter rounded-bl-xl shadow-sm">
                            Coming Soon
                        </div>
                        <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-3">AI-Driven Insights</h3>
                        <p className="text-gray-500 leading-relaxed text-sm">
                            Predictive delay alerts, automated follow-up summaries, and smart scheduling. Let AI manage the reminders while you focus on production.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center space-y-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-green-500/10 blur-[100px]"></div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white relative z-10">
                        Ready to synchronize your <br /> production line?
                    </h2>
                    <p className="text-gray-400 max-w-lg mx-auto relative z-10">
                        Join the elite manufacturers using Kramiz to eliminate communication gaps and ship 30% faster.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 relative z-10">
                        <button
                            onClick={() => onNavigate('SIGNUP')}
                            className="px-10 py-4 bg-[#008069] text-white rounded-xl font-black shadow-lg shadow-green-900/50 hover:bg-[#006a57] transition-all active:scale-95"
                        >
                            Start Free Trial
                        </button>
                        <button className="px-10 py-4 bg-transparent text-white border border-gray-700 rounded-xl font-bold hover:bg-gray-800 transition-all">
                            Contact Sales
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="h-12 w-28 flex items-center justify-center">
                            <img src="/logo_v2.png" alt="Kramiz" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="flex gap-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-gray-900 transition-colors">Security Protocols</a>
                    </div>

                    <p className="text-sm text-gray-400">© 2024 Kramiz OS. Follow-ups Simplified.</p>
                </div>
            </footer>
        </div>
    );
};
