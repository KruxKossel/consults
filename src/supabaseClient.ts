// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
  throw new Error("Supabase URL é obrigatória.");
}
if (!supabaseKey) {
  throw new Error("Supabase Key é obrigatória.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
