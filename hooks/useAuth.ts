import { useState } from 'react';
import { api } from '../supabaseAPI';
import { User } from '../types';

export const useAuth = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const login = async (
        phone: string,
        passcode: string,
        rememberMe: boolean,
        onLogin: (user: User, rememberMe: boolean) => void
    ) => {
        setError('');
        if (!/^\d{10}$/.test(phone))    { setError('Phone number must be exactly 10 digits'); return; }
        if (!/^\d{4}$/.test(passcode))  { setError('Passcode must be exactly 4 digits');      return; }

        setLoading(true);
        try {
            const { user } = await api.login(phone, passcode);
            onLogin(user, rememberMe);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * signup — called by the Step 3 → Step 4 transition in the Signup wizard.
     * Returns kramizId on success so Step 4 can display it.
     */
    const signup = async (
        formData: {
            companyName: string;
            gstNumber?:  string;
            address?:    string;
            state?:      string;
            pincode?:    string;
            adminName:   string;
            phone:       string;
            passcode:    string;
            confirmPasscode: string;
        },
        onSuccess: (kramizId: string) => void
    ) => {
        setError('');

        if (!formData.companyName.trim()) { setError('Company name is required');           return; }
        if (!formData.adminName.trim())   { setError('Your name is required');              return; }
        if (!/^\d{10}$/.test(formData.phone))    { setError('Phone must be 10 digits');    return; }
        if (!/^\d{4}$/.test(formData.passcode))  { setError('Passcode must be 4 digits'); return; }
        if (formData.passcode !== formData.confirmPasscode) { setError('Passcodes do not match'); return; }

        setLoading(true);
        try {
            const result = await api.signup({
                companyName: formData.companyName,
                gstNumber:   formData.gstNumber,
                address:     formData.address,
                state:       formData.state,
                pincode:     formData.pincode,
                adminName:   formData.adminName,
                phone:       formData.phone,
                passcode:    formData.passcode,
            });
            onSuccess(result.kramizId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { login, signup, loading, error, setError };
};
