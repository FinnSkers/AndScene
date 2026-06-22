-- ==========================================
-- AndScene! Core Tables Setup Script
-- Run this script in the Supabase SQL Editor
-- ==========================================

-- --------------------------------------------------------
-- 1. Create Roles Table (for Admin tracking)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" 
ON public.roles FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all roles (optional extension)
CREATE POLICY "Admins can view all roles" 
ON public.roles FOR SELECT 
TO authenticated
USING (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND is_admin = true));


-- --------------------------------------------------------
-- 2. Create Profiles Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profiles" 
ON public.profiles FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profiles" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles" 
ON public.profiles FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);


-- --------------------------------------------------------
-- 3. Create Watchlist Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL,
    media_type TEXT CHECK (media_type IN ('movie', 'tv')) NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    backdrop_path TEXT,
    vote_average NUMERIC,
    release_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_profile_media_watchlist UNIQUE (profile_id, media_id)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist" 
ON public.watchlist FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their watchlist" 
ON public.watchlist FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their watchlist" 
ON public.watchlist FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their watchlist" 
ON public.watchlist FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);


-- --------------------------------------------------------
-- 4. Create Continue Watching Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.continue_watching (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL,
    media_type TEXT CHECK (media_type IN ('movie', 'tv', 'series')) NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    progress INTEGER NOT NULL DEFAULT 0,
    season INTEGER DEFAULT NULL,
    episode INTEGER DEFAULT NULL,
    last_watched TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_profile_media_continue UNIQUE (profile_id, media_id)
);

ALTER TABLE public.continue_watching ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own continue watching" 
ON public.continue_watching FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their continue watching" 
ON public.continue_watching FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their continue watching" 
ON public.continue_watching FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their continue watching" 
ON public.continue_watching FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);
