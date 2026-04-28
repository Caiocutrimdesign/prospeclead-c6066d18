// Cliente Supabase dedicado ao projeto do n8n (ProspecLead CRM - produção)
// Separado do cliente principal pois o n8n salva mensagens em outro projeto Supabase.
import { createClient } from '@supabase/supabase-js';

const N8N_SUPABASE_URL = "https://msypqgmpybdtdhvxjnye.supabase.co";
const N8N_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zeXBxZ21weWJkdGRodnhqbnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODg4NzgsImV4cCI6MjA5MjM2NDg3OH0.X2JYO4xvCGBoCD-KryjuHMMdNcTfH3S8J0NnZeR00_E";

export const n8nSupabase = createClient(N8N_SUPABASE_URL, N8N_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // sem sessão de auth — só consultas públicas
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
