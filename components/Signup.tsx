
import React, { useState } from 'react';
import { api } from '../supabaseAPI';

interface SignupProps {
  onBack: () => void;
  onSignupSuccess: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onBack, onSignupSuccess }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: 'MANUFACTURER' as 'MANUFACTURER' | 'VENDOR',
    name: '',
    phone: '',
    passcode: '',
    confirmPasscode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, ''); // Only allow digits
    if (digits.length <= 10) {
      setFormData({ ...formData, phone: digits });
    }
  };

  const handlePasscodeChange = (field: 'passcode' | 'confirmPasscode', value: string) => {
    const digits = value.replace(/\D/g, ''); // Only allow digits
    if (digits.length <= 4) {
      setFormData({ ...formData, [field]: digits });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }

    if (!formData.name.trim()) {
      setError('Your name is required');
      return;
    }

    if (!/^\d{10}$/.test(formData.phone)) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    if (!/^\d{4}$/.test(formData.passcode)) {
      setError('Passcode must be exactly 4 digits');
      return;
    }

    if (formData.passcode !== formData.confirmPasscode) {
      setError('Passcodes do not match');
      return;
    }

    setLoading(true);
    try {
      await api.signup(
        formData.companyName,
        formData.companyType,
        formData.name,
        formData.phone,
        formData.passcode
      );
      alert(`Welcome, ${formData.name}! Your company "${formData.companyName}" has been registered. Please login with your credentials.`);
      onSignupSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md relative">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center mb-8">
          <div className="h-16 w-40 mx-auto mb-2 flex items-center justify-center">
            <img src="/logo_v2.png" alt="Kramiz" className="w-full h-full object-contain" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Follow-ups Simplified</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Company Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, companyType: 'MANUFACTURER' })}
                className={`flex-1 py-2 px-4 rounded border-2 font-semibold text-sm transition ${formData.companyType === 'MANUFACTURER'
                  ? 'border-[#008069] bg-[#008069] text-white'
                  : 'border-gray-300 text-gray-600 hover:border-[#008069]'
                  }`}
              >
                🏭 Manufacturer
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, companyType: 'VENDOR' })}
                className={`flex-1 py-2 px-4 rounded border-2 font-semibold text-sm transition ${formData.companyType === 'VENDOR'
                  ? 'border-[#008069] bg-[#008069] text-white'
                  : 'border-gray-300 text-gray-600 hover:border-[#008069]'
                  }`}
              >
                🏢 Vendor
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Company Name</label>
            <input
              type="text"
              required
              className="w-full border-b-2 border-gray-300 focus:border-[#008069] focus:outline-none py-2 text-sm bg-gray-50 px-2"
              placeholder="e.g. Ace Apparels"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Your Name</label>
            <input
              type="text"
              required
              className="w-full border-b-2 border-gray-300 focus:border-[#008069] focus:outline-none py-2 text-sm bg-gray-50 px-2"
              placeholder="e.g. Alice"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number</label>
            <input
              type="tel"
              required
              className="w-full border-b-2 border-gray-300 focus:border-[#008069] focus:outline-none py-2 text-sm bg-gray-50 px-2"
              placeholder="10-digit phone number"
              value={formData.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              maxLength={10}
            />
            <p className="text-xs text-gray-400 mt-1">{formData.phone.length}/10 digits</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Create Passcode</label>
            <input
              type="password"
              required
              className="w-full border-b-2 border-gray-300 focus:border-[#008069] focus:outline-none py-2 text-center text-xl tracking-widest bg-gray-50 px-2"
              placeholder="4-digit passcode"
              value={formData.passcode}
              onChange={e => handlePasscodeChange('passcode', e.target.value)}
              maxLength={4}
            />
            <p className="text-xs text-gray-400 mt-1">{formData.passcode.length}/4 digits</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Confirm Passcode</label>
            <input
              type="password"
              required
              className="w-full border-b-2 border-gray-300 focus:border-[#008069] focus:outline-none py-2 text-center text-xl tracking-widest bg-gray-50 px-2"
              placeholder="Re-enter passcode"
              value={formData.confirmPasscode}
              onChange={e => handlePasscodeChange('confirmPasscode', e.target.value)}
              maxLength={4}
            />
            <p className="text-xs text-gray-400 mt-1">{formData.confirmPasscode.length}/4 digits</p>
          </div>

          {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#008069] text-white py-3 rounded font-semibold hover:bg-[#006a57] mt-4 shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'CREATING ACCOUNT...' : 'Create Account'}
          </button>

          <div className="mt-4 text-xs text-gray-400 bg-gray-50 p-3 rounded">
            <p>📌 You will be registered as the <strong>Admin</strong> of your company</p>
            <p className="mt-1">🔐 Your phone number and passcode will be used for login</p>
          </div>
        </form>
      </div>
    </div>
  );
};
