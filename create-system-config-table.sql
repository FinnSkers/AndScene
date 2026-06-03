-- Run this script in the Supabase SQL Editor to create the system_config table:

CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Setup Access Policies
CREATE POLICY "Anyone can view system configs" 
ON public.system_config FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can modify system configs" 
ON public.system_config FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);
