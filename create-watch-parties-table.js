import pg from 'pg';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const config = {
  host: 'aws-0-ap-northeast-1.pooler.supabase.com',
  port: 6543, // Pooler port
  user: 'postgres.iqgyymwzxujoqnmpayxy',
  password: '1AndScene@db',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

const client = new pg.Client(config);

async function run() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database!');

    const sql = `
      CREATE TABLE IF NOT EXISTS public.watch_parties (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          room_code TEXT UNIQUE NOT NULL,
          room_name TEXT NOT NULL,
          is_public BOOLEAN DEFAULT true NOT NULL,
          host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          host_name TEXT NOT NULL,
          media_id INTEGER NOT NULL,
          media_type TEXT CHECK (media_type IN ('movie', 'series')) NOT NULL,
          title TEXT NOT NULL,
          poster_path TEXT,
          season INTEGER,
          episode INTEGER,
          host_control BOOLEAN DEFAULT true NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- Enable RLS
      ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;

      -- Drop policies if exist to prevent duplicate errors
      DROP POLICY IF EXISTS "Anyone can view watch parties" ON public.watch_parties;
      DROP POLICY IF EXISTS "Anyone can insert watch parties" ON public.watch_parties;
      DROP POLICY IF EXISTS "Hosts can update their watch parties" ON public.watch_parties;
      DROP POLICY IF EXISTS "Hosts can delete their watch parties" ON public.watch_parties;

      -- Policies
      CREATE POLICY "Anyone can view watch parties" 
      ON public.watch_parties FOR SELECT 
      TO anon, authenticated
      USING (true);

      CREATE POLICY "Anyone can insert watch parties" 
      ON public.watch_parties FOR INSERT 
      TO anon, authenticated
      WITH CHECK (true);

      CREATE POLICY "Hosts can update their watch parties" 
      ON public.watch_parties FOR UPDATE 
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);

      CREATE POLICY "Hosts can delete their watch parties" 
      ON public.watch_parties FOR DELETE 
      TO anon, authenticated
      USING (true);
    `;

    await client.query(sql);
    console.log('Successfully created watch_parties table and setup RLS policies!');
  } catch (err) {
    console.error('Error running migrations:', err);
  } finally {
    await client.end();
  }
}

run();
