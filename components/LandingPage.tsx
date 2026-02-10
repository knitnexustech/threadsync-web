
import React, { useState, useEffect } from 'react';

interface LandingPageProps {
    onNavigate: (page: 'LOGIN' | 'SIGNUP') => void;
}

const DEMO_CHAT_MESSAGES = [
    { sender: 'Vendor', text: 'Fabric arrived at factory.', time: '10:00 AM', myself: false },
    { sender: 'You', text: 'Great! When does cutting start?', time: '10:02 AM', myself: true },
    { sender: 'Vendor', text: 'Cutting starts tomorrow morning.', time: '10:05 AM', myself: false },
    { sender: 'System', text: 'Status changed to: IN PRODUCTION', time: '10:05 AM', isSystem: true },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
    const [msgIndex, setMsgIndex] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    // Auto-play demo chat
    useEffect(() => {
        const interval = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % (DEMO_CHAT_MESSAGES.length + 1));
        }, 1500);
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
                        <span className="font-blanka text-xl md:text-2xl tracking-widest text-[#008069] hidden md:block uppercase">Kramiz</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => onNavigate('LOGIN')}
                            className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-[#008069] transition-colors"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => onNavigate('SIGNUP')}
                            className="px-6 py-2.5 bg-[#008069] text-white text-sm font-bold rounded-full shadow-lg shadow-green-900/20 hover:bg-[#006a57] hover:scale-105 active:scale-95 transition-all"
                        >
                            Start Free
                        </button>
                    </div>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="pt-32 pb-20 px-6 lg:pt-48 lg:pb-32 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#008069]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full text-[#008069] text-xs font-bold uppercase tracking-widest animate-in slide-in-from-bottom-2 fade-in duration-700">
                            <span className="w-2 h-2 rounded-full bg-[#008069] animate-pulse"></span>
                            Production Tracking Simplified
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight text-gray-900 drop-shadow-sm">
                            Order <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#008069] to-[#00b894]">Follow-up</span> <br />
                            Simplified.
                        </h1>

                        <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                            Stop chasing updates in WhatsApp headers.
                            <br className="hidden md:block" />
                            Track every order, file, and message in one simple place.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                            <button
                                onClick={() => onNavigate('SIGNUP')}
                                className="px-8 py-4 bg-[#008069] text-white rounded-2xl font-bold text-lg shadow-2xl shadow-green-900/30 hover:shadow-green-900/40 hover:-translate-y-1 transition-all"
                            >
                                Get Started Free
                            </button>
                            <button
                                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-8 py-4 bg-white text-gray-700 rounded-2xl font-bold text-lg border border-gray-200 hover:border-[#008069] hover:text-[#008069] transition-all"
                            >
                                How it works
                            </button>
                        </div>
                    </div>

                    {/* HERO VISUAL (Dynamic Chat) */}
                    <div className="relative mx-auto lg:mx-0 w-full max-w-md">
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#008069] to-[#2ecc71] rounded-[2.5rem] rotate-3 opacity-20 blur-xl"></div>
                        <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden relative z-10">
                            {/* App Header */}
                            <div className="bg-[#008069] p-4 flex items-center gap-3 text-white">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">PO</div>
                                <div>
                                    <div className="font-bold text-sm">#PO-2491</div>
                                    <div className="text-[10px] opacity-80">Online</div>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="h-[300px] bg-[#e5ddd5] p-4 flex flex-col gap-3 relative">
                                <div className="absolute inset-0 opacity-10 bg-[url('https://adwwj.com/wp-content/uploads/2018/10/whatsapp-background.png')] bg-repeat"></div>

                                {DEMO_CHAT_MESSAGES.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`transition-all duration-500 transform ${i < msgIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                                            } ${msg.isSystem ? 'self-center my-2' : msg.myself ? 'self-end' : 'self-start'}`}
                                    >
                                        {msg.isSystem ? (
                                            <span className="bg-[#E1F3FB] text-gray-600 text-[10px] px-3 py-1 rounded-full shadow-sm font-bold uppercase tracking-wider">
                                                {msg.text}
                                            </span>
                                        ) : (
                                            <div className={`p-3 rounded-lg max-w-[80%] text-sm shadow-sm relative ${msg.myself ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'
                                                }`}>
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
            </section>

            {/* PAIN POINTS SECTION */}
            <section className="py-24 bg-white relative">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6">Why switch?</h2>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                            Managing production on WhatsApp is a nightmare. <br />
                            <span className="text-[#008069] font-bold">Kramiz is the dream.</span>
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
                                    Mixed personal & business chats
                                </li>
                                <li className="flex gap-3 text-red-800 font-medium items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Files expire or get lost
                                </li>
                                <li className="flex gap-3 text-red-800 font-medium items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    Zero tracking of order status
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
                                    Separate workspace for work
                                </li>
                                <li className="flex gap-3 text-gray-800 font-bold items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Files saved forever & organized
                                </li>
                                <li className="flex gap-3 text-gray-800 font-bold items-start">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-[#008069]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    Live status (Pending → Completed)
                                </li>
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
                            { title: 'Visual Tracking', desc: 'See instantly which orders are pending, in-progress, or done.', icon: '📊' },
                            { title: 'File Vault', desc: 'Upload tech packs and PDFs. They never expire.', icon: '📂' },
                            { title: 'Installs on Phone', desc: 'Works like an app. fast notifications, home screen access.', icon: '📱' },
                            { title: 'Role Access', desc: 'Admins control who sees what. Keep sensitive data safe.', icon: '🔒' },
                            { title: 'One Order, One Chat', desc: 'Every PO gets its own chat room. No more mixing conversations.', icon: '💬' },
                            { title: 'Fast Search', desc: 'Find any order number or style code in milliseconds.', icon: '⚡' },
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
                                <h3 className="text-xl font-bold text-gray-900">Create an Order</h3>
                                <p className="text-gray-500 mt-2">Just enter the PO Number and Style. Channel created instantly.</p>
                            </div>
                            <div className="hidden md:block md:w-1/2 md:order-3"></div>
                        </div>

                        {/* Step 2 */}
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
                            <div className="w-16 h-16 rounded-full bg-white border-4 border-[#008069] text-[#008069] font-black text-xl flex items-center justify-center shadow-lg shrink-0">2</div>
                            <div className="hidden md:block md:w-1/2"></div>
                            <div className="bg-gray-50 p-6 rounded-3xl md:w-1/2 border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Invite Vendor</h3>
                                <p className="text-gray-500 mt-2">Add their phone number. They get access to only that order.</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
                            <div className="w-16 h-16 rounded-full bg-white border-4 border-[#008069] text-[#008069] font-black text-xl flex items-center justify-center shadow-lg md:order-2 shrink-0">3</div>
                            <div className="bg-gray-50 p-6 rounded-3xl md:w-1/2 md:text-right md:order-1 border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">Track & Relax</h3>
                                <p className="text-gray-500 mt-2">Get automatic updates. Focus on growing your business.</p>
                            </div>
                            <div className="hidden md:block md:w-1/2 md:order-3"></div>
                        </div>
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
                            Join the production teams that save countless hours on follow-ups every week.
                        </p>
                        <button
                            onClick={() => onNavigate('SIGNUP')}
                            className="px-10 py-5 bg-[#008069] text-white rounded-full font-bold text-xl hover:bg-[#006a57] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#008069]/30"
                        >
                            Create Free Account
                        </button>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 border-t border-gray-200 bg-white text-center">
                <p className="font-blanka text-2xl text-gray-300 uppercase tracking-widest mb-4">Kramiz</p>
                <div className="flex justify-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <a href="#" className="hover:text-[#008069] transition-colors">Privacy</a>
                    <a href="#" className="hover:text-[#008069] transition-colors">Terms</a>
                    <a href="#" className="hover:text-[#008069] transition-colors">Support</a>
                </div>
                <p className="text-xs text-gray-300 mt-8">© 2024 Kramiz. Production Tracking.</p>
            </footer>
        </div>
    );
};
