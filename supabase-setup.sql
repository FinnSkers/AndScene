-- ==========================================
-- Supabase Database Setup Script for AndScene!
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- 1. Create system_config table
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Setup Access Policies on system_config
DROP POLICY IF EXISTS "Anyone can view system configs" ON public.system_config;
DROP POLICY IF EXISTS "Anyone can modify system configs" ON public.system_config;

CREATE POLICY "Anyone can view system configs" 
ON public.system_config FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can modify system configs" 
ON public.system_config FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- 2. Create watch_parties table
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

-- Enable RLS on watch_parties
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;

-- Setup Access Policies on watch_parties
DROP POLICY IF EXISTS "Anyone can view watch parties" ON public.watch_parties;
DROP POLICY IF EXISTS "Anyone can insert watch parties" ON public.watch_parties;
DROP POLICY IF EXISTS "Hosts can update their watch parties" ON public.watch_parties;
DROP POLICY IF EXISTS "Hosts can delete their watch parties" ON public.watch_parties;

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
