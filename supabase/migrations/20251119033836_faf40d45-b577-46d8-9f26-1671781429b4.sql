-- Add new fields to releases table
ALTER TABLE public.releases
ADD COLUMN copyright_line TEXT,
ADD COLUMN phonographic_line TEXT,
ADD COLUMN featured_artists TEXT[],
ADD COLUMN audio_file_url TEXT,
ADD COLUMN courtesy_line TEXT,
ADD COLUMN is_multi_disc BOOLEAN DEFAULT false,
ADD COLUMN disc_number INTEGER DEFAULT 1,
ADD COLUMN volume_number INTEGER DEFAULT 1,
ADD COLUMN total_discs INTEGER DEFAULT 1,
ADD COLUMN total_volumes INTEGER DEFAULT 1;

-- Add profile picture to profiles
ALTER TABLE public.profiles
ADD COLUMN avatar_url TEXT;

-- Create tracks table for multiple tracks per release
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE NOT NULL,
  track_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER,
  isrc TEXT,
  audio_file_url TEXT,
  featured_artists TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own release tracks"
  ON public.tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.releases
      WHERE releases.id = tracks.release_id
      AND releases.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tracks for their releases"
  ON public.tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.releases
      WHERE releases.id = tracks.release_id
      AND releases.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all tracks"
  ON public.tracks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all tracks"
  ON public.tracks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));