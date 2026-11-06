// CONFIGURATION SUPABASE

const SUPABASE_URL = "https://xcgwxxxrjrituewgsacc.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_fBhyIhbFWfqEwCb354Mr6Q_REWy4PHs";

// INITIALISATION DU CLIENT

const client = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);