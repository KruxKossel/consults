// src/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// URL e chave do seu projeto Supabase
const supabaseUrl = 'https://xyzcompany.supabase.co';
const supabaseKey = 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
