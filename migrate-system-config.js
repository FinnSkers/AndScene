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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SYSTEM_KEYS = [
  'SYSTEM_ANNOUNCEMENT',
  'SYSTEM_MAINTENANCE',
  'SYSTEM_HERO_MEDIA',
  'SYSTEM_DEFAULT_SERVER'
];

async function migrate() {
  console.log('Starting migration to system_config table...');

  try {
    // 1. Fetch system configs from watch_parties
    const { data: watchParties, error: fetchErr } = await supabase
      .from('watch_parties')
      .select('*')
      .in('room_code', SYSTEM_KEYS);

    if (fetchErr) {
      throw new Error(`Failed to query watch_parties: ${fetchErr.message}`);
    }

    if (!watchParties || watchParties.length === 0) {
      console.log('No system config rows found in watch_parties table. Nothing to migrate.');
      return;
    }

    console.log(`Found ${watchParties.length} settings to migrate.`);

    // 2. Map and insert into system_config
    for (const row of watchParties) {
      let value = row.room_name;
      
      // If it is maintenance mode, serialize active state + ETA as JSON
      if (row.room_code === 'SYSTEM_MAINTENANCE') {
        value = JSON.stringify({
          active: row.is_public,
          eta: row.room_name || 'Soon'
        });
      }

      console.log(`Migrating ${row.room_code}...`);
      const { error: upsertErr } = await supabase
        .from('system_config')
        .upsert([{ key: row.room_code, value }]);

      if (upsertErr) {
        console.error(`Error inserting key ${row.room_code}:`, upsertErr.message);
        console.error('Did you run create-system-config-table.sql in the Supabase SQL Editor first?');
        return;
      }
    }

    console.log('Successfully copied configs to system_config table.');

    // 3. Delete migrated keys from watch_parties
    console.log('Cleaning up watch_parties table...');
    const { error: deleteErr } = await supabase
      .from('watch_parties')
      .delete()
      .in('room_code', SYSTEM_KEYS);

    if (deleteErr) {
      console.warn(`Warning: Failed to clean up watch_parties config rows: ${deleteErr.message}`);
    } else {
      console.log('Successfully deleted config rows from watch_parties.');
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  }
}

migrate();
