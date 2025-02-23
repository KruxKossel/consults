// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL e Key são obrigatórias.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
