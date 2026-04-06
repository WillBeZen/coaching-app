-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.training_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  name text NOT NULL,
  colour text NOT NULL DEFAULT '#6366F1',
  emoji text NOT NULL DEFAULT '🏃',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT training_groups_pkey PRIMARY KEY (id),
  CONSTRAINT training_groups_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  muted_at timestamp with time zone,
  left_at timestamp with time zone,
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.training_groups(id) ON DELETE CASCADE,
  CONSTRAINT group_members_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.profiles(id),
  CONSTRAINT group_members_unique UNIQUE (group_id, athlete_id)
);
CREATE TABLE public.feed_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  post_type text NOT NULL,
  content text NOT NULL,
  target_type text NOT NULL DEFAULT 'all',
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feed_posts_pkey PRIMARY KEY (id),
  CONSTRAINT feed_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.feed_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feed_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT feed_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  CONSTRAINT feed_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT feed_reactions_unique UNIQUE (post_id, user_id, emoji)
);

CREATE TABLE public.coach_athletes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coach_athletes_pkey PRIMARY KEY (id),
  CONSTRAINT coach_athletes_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT coach_athletes_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.personal_bests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  event text NOT NULL,
  distance_m numeric NOT NULL,
  pb_time text,
  sb_time text,
  pb_date date,
  sb_date date,
  pb_race_id uuid,
  sb_race_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT personal_bests_pkey PRIMARY KEY (id),
  CONSTRAINT personal_bests_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.profiles(id),
  CONSTRAINT personal_bests_pb_race_id_fkey FOREIGN KEY (pb_race_id) REFERENCES public.races(id),
  CONSTRAINT personal_bests_sb_race_id_fkey FOREIGN KEY (sb_race_id) REFERENCES public.races(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['coach'::text, 'athlete'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.races (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  race_name text NOT NULL,
  race_date date NOT NULL,
  distance_km numeric,
  target_time text,
  actual_time text,
  notes text,
  status text NOT NULL DEFAULT 'upcoming'::text CHECK (status = ANY (ARRAY['upcoming'::text, 'completed'::text, 'dns'::text, 'dnf'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  event text,
  CONSTRAINT races_pkey PRIMARY KEY (id),
  CONSTRAINT races_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT races_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.session_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  athlete_id uuid NOT NULL,
  completed_at timestamp with time zone DEFAULT now(),
  actual_distance_km numeric,
  actual_duration_min integer,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  athlete_notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT session_logs_pkey PRIMARY KEY (id),
  CONSTRAINT session_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT session_logs_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.unavailability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unavailability_pkey PRIMARY KEY (id),
  CONSTRAINT unavailability_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  title text NOT NULL,
  session_type text NOT NULL DEFAULT 'easy'::text,
  scheduled_date date NOT NULL,
  description text,
  distance_km numeric,
  duration_min integer,
  pace_target text,
  heart_rate_zone text,
  coach_notes text,
  is_extra boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id),
  CONSTRAINT sessions_athlete_id_fkey FOREIGN KEY (athlete_id) REFERENCES public.profiles(id)
);
