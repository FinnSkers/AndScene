/* eslint-disable */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Checking profiles...');
  const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(1);
  if (pError) {
    console.error('Error fetching profiles:', pError.message);
  } else {
    console.log('Profiles table exists. First profile:', profiles);
  }

  console.log('Checking watchlist...');
  const { data: watchlist, error: wError } = await supabase.from('watchlist').select('*').limit(1);
  if (wError) {
    console.error('Error fetching watchlist:', wError.message);
  } else {
    console.log('Watchlist table exists.');
  }

  console.log('Checking continue_watching...');
  const { data: cw, error: cwError } = await supabase.from('continue_watching').select('*').limit(1);
  if (cwError) {
    console.error('Error fetching continue_watching:', cwError.message);
  } else {
    console.log('Continue watching table exists.');
  }

  console.log('Checking watch_parties...');
  const { data: wp, error: wpError } = await supabase.from('watch_parties').select('*').limit(1);
  if (wpError) {
    console.error('Error fetching watch_parties:', wpError.message);
  } else {
    console.log('Watch parties table exists!');
  }
}

check();
