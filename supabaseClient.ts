
import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Create Supabase client for normal operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Admin operations (signup, vendor creation) should be moved to Supabase Edge Functions
// for security. The client should never possess the Service Role Key.
export const supabaseAdmin = supabase;


// Helper function to get current user's company_id
export const getCurrentUserCompanyId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    return data?.company_id || null;
};
