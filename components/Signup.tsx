/**
 * Signup.tsx
 *
 * 4-step signup wizard:
 *
 *  Step 1 — Identity Check
 *    Enter GST number (or skip if none). Checks availability + pre-fills Step 2.
 *
 *  Step 2 — Company Details
 *    Company name, address, state, PIN code. Pre-filled + editable if found in a contact.
 *
 *  Step 3 — Admin Account
 *    Admin's name, phone number, 4-digit passcode.
 *
 *  Step 4 — Welcome
 *    Shows generated Kramiz ID. User logs in from here.
 */

import React, { useState } from 'react';
import { api } from '../supabaseAPI';
import { useAuth } from '../hooks/useAuth';

interface SignupProps {
    onBack: () => void;
    onSignupSuccess: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

interface SignupData {
    // Step 1
    gstNumber:   string;
    hasGST:      boolean;
    // Step 2
    companyName: string;
    address:     string;
    state:       string;
    pincode:     string;
    // Step 3
    adminName:        string;
    phone:            string;
    passcode:         string;
    confirmPasscode:  string;
    // Step 4
    kramizId:    string;
}

const INITIAL: SignupData = {
    gstNumber: '', hasGST: true,
    companyName: '', address: '', state: '', pincode: '',
    adminName: '', phone: '', passcode: '', confirmPasscode: '',
    kramizId: '',
};

// ── Small reusable field components ─────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{children}</p>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }> = ({ error, className = '', ...props }) => (
    <input
        {...props}
        className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
            error ? 'border-red-300 focus:ring-red-400 bg-red-50' : 'border-gray-200 focus:ring-[#008069]'
        } ${props.disabled ? 'text-gray-400 cursor-not-allowed' : ''} ${className}`}
    />
);

// ── Progress bar ─────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ step: WizardStep }> = ({ step }) => {
    const steps = ['Identity', 'Company', 'Account', 'Done'];
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
                {steps.map((label, i) => {
                    const num   = i + 1;
                    const done  = step > num;
                    const active = step === num;
                    return (
                        <React.Fragment key={label}>
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                                    done   ? 'bg-[#008069] text-white' :
                                    active ? 'bg-[#008069] text-white ring-4 ring-[#008069]/20' :
                                             'bg-gray-100 text-gray-400'
                                }`}>
                                    {done ? '✓' : num}
                                </div>
                                <p className={`text-[10px] font-bold mt-1 ${active ? 'text-[#008069]' : 'text-gray-400'}`}>
                                    {label}
                                </p>
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all ${
                                    step > num ? 'bg-[#008069]' : 'bg-gray-100'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

// ── Main component ───────────────────────────────────────────────────────────

export const Signup: React.FC<SignupProps> = ({ onBack, onSignupSuccess }) => {
    const [step, setStep] = useState<WizardStep>(1);
    const [data, setData] = useState<SignupData>(INITIAL);
    const [checking, setChecking] = useState(false);
    const [prefillSource, setPrefillSource] = useState(false); // true = pre-filled from contacts
    const [stepError, setStepError] = useState('');

    const { signup, loading, error: authError } = useAuth();

    const set = (patch: Partial<SignupData>) => setData(d => ({ ...d, ...patch }));

    // ── Step 1: Check GST ──────────────────────────────────────────────────

    const handleGSTInput = (value: string) => {
        const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (cleaned.length <= 15) set({ gstNumber: cleaned });
    };

    const handleCheckGST = async () => {
        setStepError('');
        if (data.hasGST && data.gstNumber.length !== 15) {
            setStepError('GST number must be exactly 15 characters');
            return;
        }
        if (!data.hasGST) {
            setStep(2);
            return;
        }

        setChecking(true);
        try {
            const result = await api.checkGSTAvailability(data.gstNumber);
            if (!result.available) {
                setStepError(
                    'This GST number is already registered on Kramiz. ' +
                    'Ask an existing member of your company to send you an invite link.'
                );
                return;
            }
            // If pre-fill data found, populate Step 2 and flag the source
            if (result.prefill) {
                set({
                    companyName: result.prefill.name    || '',
                    address:     result.prefill.address || '',
                    state:       result.prefill.state   || '',
                    pincode:     result.prefill.pincode || '',
                });
                setPrefillSource(true);
            } else {
                setPrefillSource(false);
            }
            setStep(2);
        } catch (err: any) {
            setStepError(err.message || 'Could not verify GST. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    // ── Step 2: Company details validation ────────────────────────────────

    const handleCompanyNext = () => {
        setStepError('');
        if (!data.companyName.trim()) { setStepError('Company name is required'); return; }
        if (data.pincode && !/^\d{6}$/.test(data.pincode)) { setStepError('PIN code must be exactly 6 digits'); return; }
        setStep(3);
    };

    // ── Step 3: Create account ────────────────────────────────────────────

    const handleCreateAccount = () => {
        signup(
            {
                companyName:     data.companyName,
                gstNumber:       data.hasGST ? data.gstNumber : undefined,
                address:         data.address  || undefined,
                state:           data.state    || undefined,
                pincode:         data.pincode  || undefined,
                adminName:       data.adminName,
                phone:           data.phone,
                passcode:        data.passcode,
                confirmPasscode: data.confirmPasscode,
            },
            (kramizId) => {
                set({ kramizId });
                setStep(4);
            }
        );
    };

    // ── Render ────────────────────────────────────────────────────────────

    const displayError = stepError || authError;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-[#008069] rounded-2xl shadow-lg mb-4">
                        <span className="text-white font-black text-xl">K</span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">Create your account</h1>
                    <p className="text-gray-400 text-sm mt-1">Join the Kramiz network</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8">

                    {step < 4 && <ProgressBar step={step} />}

                    {/* ── STEP 1: Identity ─────────────────────────────── */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 mb-1">
                                    What's your company's GST number?
                                </h2>
                                <p className="text-sm text-gray-400">
                                    GST lets partners find and verify your company instantly.
                                </p>
                            </div>

                            {data.hasGST ? (
                                <div>
                                    <Label>GST Number</Label>
                                    <Input
                                        type="text"
                                        value={data.gstNumber}
                                        onChange={e => handleGSTInput(e.target.value)}
                                        placeholder="e.g. 27AABCU9603R1ZX"
                                        maxLength={15}
                                        className="font-mono tracking-widest uppercase"
                                        error={!!stepError}
                                        autoFocus
                                    />
                                    <div className="flex justify-between mt-1">
                                        <p className="text-xs text-gray-400">15 characters — letters & numbers only</p>
                                        <p className={`text-xs font-mono font-bold ${
                                            data.gstNumber.length === 0   ? 'text-gray-300' :
                                            data.gstNumber.length === 15  ? 'text-green-500' : 'text-amber-500'
                                        }`}>{data.gstNumber.length}/15</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm text-amber-700 font-medium">
                                    You can add your GST number later from Settings. Partners can still find you using your Kramiz ID.
                                </div>
                            )}

                            {/* Toggle */}
                            <button
                                type="button"
                                onClick={() => { set({ gstNumber: '', hasGST: !data.hasGST }); setStepError(''); }}
                                className="w-full text-sm font-bold text-[#008069] hover:text-[#006a57] transition-colors"
                            >
                                {data.hasGST
                                    ? "My company doesn't have a GST number →"
                                    : "← I have a GST number"}
                            </button>

                            {displayError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                                    {displayError}
                                </div>
                            )}

                            <button
                                onClick={handleCheckGST}
                                disabled={checking || (data.hasGST && data.gstNumber.length !== 15)}
                                className="w-full py-4 bg-[#008069] text-white rounded-2xl font-black text-sm shadow-lg hover:bg-[#006a57] disabled:opacity-40 transition-all"
                            >
                                {checking ? 'Checking...' : 'Continue →'}
                            </button>

                            <button onClick={onBack} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest">
                                ← Back to Login
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2: Company Details ───────────────────────── */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 mb-1">
                                    {prefillSource ? 'Verify your company details' : 'Tell us about your company'}
                                </h2>
                                {prefillSource && (
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium">
                                        We found some details associated with your GST. Please confirm these are correct — you can edit any field.
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label>Company Name *</Label>
                                <Input
                                    value={data.companyName}
                                    onChange={e => set({ companyName: e.target.value })}
                                    placeholder="Your registered company name"
                                />
                            </div>

                            {data.hasGST && (
                                <div>
                                    <Label>GST Number</Label>
                                    <Input
                                        value={data.gstNumber}
                                        disabled
                                        className="font-mono tracking-widest"
                                    />
                                </div>
                            )}

                            <div>
                                <Label>Address</Label>
                                <Input
                                    value={data.address}
                                    onChange={e => set({ address: e.target.value })}
                                    placeholder="Street / locality / area (optional)"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>State</Label>
                                    <Input
                                        value={data.state}
                                        onChange={e => set({ state: e.target.value })}
                                        placeholder="State"
                                    />
                                </div>
                                <div>
                                    <Label>PIN Code</Label>
                                    <Input
                                        value={data.pincode}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, '');
                                            if (v.length <= 6) set({ pincode: v });
                                        }}
                                        placeholder="6-digit PIN"
                                        maxLength={6}
                                        className="font-mono"
                                        error={!!(data.pincode && data.pincode.length !== 6)}
                                    />
                                </div>
                            </div>

                            {displayError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                                    {displayError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setStep(1); setStepError(''); }} className="flex-1 py-4 border-2 border-gray-200 text-gray-500 rounded-2xl font-black text-sm hover:border-gray-300 transition-all">
                                    ← Back
                                </button>
                                <button onClick={handleCompanyNext} className="flex-[2] py-4 bg-[#008069] text-white rounded-2xl font-black text-sm shadow-lg hover:bg-[#006a57] transition-all">
                                    Continue →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Admin Account ─────────────────────────── */}
                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 mb-1">Set up your admin account</h2>
                                <p className="text-sm text-gray-400">This will be the primary admin login for <strong>{data.companyName}</strong>.</p>
                            </div>

                            <div>
                                <Label>Your Name *</Label>
                                <Input
                                    value={data.adminName}
                                    onChange={e => set({ adminName: e.target.value })}
                                    placeholder="Full name"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <Label>Phone Number *</Label>
                                <div className="flex">
                                    <span className="px-4 py-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-500 font-bold">+91</span>
                                    <Input
                                        value={data.phone}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, '');
                                            if (v.length <= 10) set({ phone: v });
                                        }}
                                        placeholder="10-digit number"
                                        maxLength={10}
                                        className="rounded-l-none border-l-0 font-mono tracking-widest"
                                        error={!!(data.phone && data.phone.length !== 10)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>4-digit Passcode *</Label>
                                    <Input
                                        type="password"
                                        value={data.passcode}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, '');
                                            if (v.length <= 4) set({ passcode: v });
                                        }}
                                        placeholder="••••"
                                        maxLength={4}
                                        className="tracking-widest text-center"
                                    />
                                </div>
                                <div>
                                    <Label>Confirm Passcode *</Label>
                                    <Input
                                        type="password"
                                        value={data.confirmPasscode}
                                        onChange={e => {
                                            const v = e.target.value.replace(/\D/g, '');
                                            if (v.length <= 4) set({ confirmPasscode: v });
                                        }}
                                        placeholder="••••"
                                        maxLength={4}
                                        className="tracking-widest text-center"
                                        error={!!(data.confirmPasscode && data.passcode !== data.confirmPasscode)}
                                    />
                                </div>
                            </div>
                            {data.confirmPasscode && data.passcode !== data.confirmPasscode && (
                                <p className="text-xs text-red-500 font-medium -mt-2">Passcodes don't match</p>
                            )}

                            {displayError && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                                    {displayError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button onClick={() => { setStep(2); setStepError(''); }} className="flex-1 py-4 border-2 border-gray-200 text-gray-500 rounded-2xl font-black text-sm hover:border-gray-300 transition-all">
                                    ← Back
                                </button>
                                <button
                                    onClick={handleCreateAccount}
                                    disabled={loading}
                                    className="flex-[2] py-4 bg-[#008069] text-white rounded-2xl font-black text-sm shadow-lg hover:bg-[#006a57] disabled:opacity-40 transition-all"
                                >
                                    {loading ? 'Creating...' : 'Create Account →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: Welcome ───────────────────────────────── */}
                    {step === 4 && (
                        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-green-100 rounded-3xl mx-auto flex items-center justify-center text-4xl">
                                🎉
                            </div>

                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Welcome to Kramiz!</h2>
                                <p className="text-gray-400 text-sm mt-1">
                                    <strong className="text-gray-700">{data.companyName}</strong> is now on the network.
                                </p>
                            </div>

                            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Kramiz ID</p>
                                <p className="text-2xl font-black font-mono tracking-widest text-gray-800">{data.kramizId}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                    Share this with partners who don't have a GST number — they can find you with this code.
                                </p>
                            </div>

                            {data.hasGST && (
                                <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-left">
                                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">✓ GST Registered</p>
                                    <p className="text-sm font-mono font-bold text-gray-800">{data.gstNumber}</p>
                                    <p className="text-xs text-gray-400 mt-1">Partners can search and find you using this GST number.</p>
                                </div>
                            )}

                            <button
                                onClick={onSignupSuccess}
                                className="w-full py-4 bg-[#008069] text-white rounded-2xl font-black text-sm shadow-lg hover:bg-[#006a57] transition-all"
                            >
                                Go to Login →
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
