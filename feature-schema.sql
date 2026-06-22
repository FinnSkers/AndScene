-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    media_id text not null,
    media_type text not null,
    rating integer check (rating >= 1 and rating <= 5),
    review_text text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Create watchlist_folders table
CREATE TABLE IF NOT EXISTS public.watchlist_folders (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for watchlist_folders
ALTER TABLE public.watchlist_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own folders" ON public.watchlist_folders
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Modify watchlist table to support folders
-- We add the column IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='watchlist' AND column_name='folder_id') THEN
        ALTER TABLE public.watchlist ADD COLUMN folder_id uuid references public.watchlist_folders(id) on delete set null;
    END IF;
END
$$;

-- Tell PostgREST to reload schema cache so the frontend sees it immediately
NOTIFY pgrst, 'reload schema';
