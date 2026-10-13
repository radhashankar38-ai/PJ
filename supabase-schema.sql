-- Supabase Schema for PJ

-- Users table
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text not null,
  display_name text not null,
  username text not null unique,
  is_public boolean default true,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Journals table
create table if not exists public.journals (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  content text not null,
  author_id uuid references public.users(id) not null,
  author_name text not null,
  author_username text,
  is_public boolean default true,
  image_urls text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  likes uuid[] default array[]::uuid[],
  comment_count integer default 0
);

-- Comments table
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  journal_id uuid references public.journals(id) on delete cascade not null,
  content text not null,
  author_id uuid references public.users(id) not null,
  author_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  text text not null,
  sender_id uuid references public.users(id) not null,
  sender_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.journals enable row level security;
alter table public.comments enable row level security;
alter table public.messages enable row level security;

-- Users policies
drop policy if exists "Public profiles are viewable by everyone." on public.users;
create policy "Public profiles are viewable by everyone." on public.users for select using (true);
drop policy if exists "Users can insert their own profile." on public.users;
create policy "Users can insert their own profile." on public.users for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile." on public.users;
create policy "Users can update own profile." on public.users for update using (auth.uid() = id);

-- Journals policies
drop policy if exists "Journals are viewable by everyone if public." on public.journals;
create policy "Journals are viewable by everyone if public." on public.journals for select using (true);
drop policy if exists "Users can insert their own journals." on public.journals;
create policy "Users can insert their own journals." on public.journals for insert with check (auth.uid() = author_id);
drop policy if exists "Users can update own journals." on public.journals;
create policy "Users can update own journals." on public.journals for update using (auth.uid() = author_id);
drop policy if exists "Anyone can update likes and comment count" on public.journals;
create policy "Anyone can update likes and comment count" on public.journals for update using (true);
drop policy if exists "Users can delete own journals." on public.journals;
create policy "Users can delete own journals." on public.journals for delete using (auth.uid() = author_id);

-- Comments policies
drop policy if exists "Comments are viewable by everyone." on public.comments;
create policy "Comments are viewable by everyone." on public.comments for select using (true);
drop policy if exists "Users can insert their own comments." on public.comments;
create policy "Users can insert their own comments." on public.comments for insert with check (auth.uid() = author_id);
drop policy if exists "Users can delete own comments." on public.comments;
create policy "Users can delete own comments." on public.comments for delete using (auth.uid() = author_id);

-- Messages policies
drop policy if exists "Messages are viewable by authenticated users." on public.messages;
create policy "Messages are viewable by authenticated users." on public.messages for select using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their own messages." on public.messages;
create policy "Users can insert their own messages." on public.messages for insert with check (auth.uid() = sender_id);

drop policy if exists "Users can update their own messages." on public.messages;
create policy "Users can update their own messages." on public.messages for update using (auth.uid() = sender_id);

drop policy if exists "Users can delete their own messages." on public.messages;
create policy "Users can delete their own messages." on public.messages for delete using (auth.uid() = sender_id);

-- Set up realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.journals;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.messages;

-- RPC for incrementing comment count
create or replace function public.increment_comment_count(journal_id uuid)
returns void
language sql
security definer
as $$
  update public.journals
  set comment_count = comment_count + 1
  where id = journal_id;
$$;

-- Storage
insert into storage.buckets (id, name, public) 
values ('journals', 'journals', true)
on conflict (id) do nothing;

drop policy if exists "Journals images are publicly accessible." on storage.objects;
create policy "Journals images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'journals' );

drop policy if exists "Anyone can upload an image." on storage.objects;
create policy "Anyone can upload an image."
  on storage.objects for insert
  with check ( bucket_id = 'journals' );

-- Follows table
create table if not exists public.follows (
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

alter table public.follows enable row level security;

-- Follows policies
drop policy if exists "Follows are viewable by everyone." on public.follows;
create policy "Follows are viewable by everyone." on public.follows for select using (true);

drop policy if exists "Users can follow others." on public.follows;
create policy "Users can follow others." on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow others." on public.follows;
create policy "Users can unfollow others." on public.follows for delete using (auth.uid() = follower_id);

-- Update Journals policies to respect followers for private journals
drop policy if exists "Journals are viewable by everyone if public." on public.journals;
create policy "Journals are viewable by authorized users." on public.journals for select using (
  is_public = true 
  or auth.uid() = author_id 
  or exists (
    select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id
  )
);

-- Add new reaction arrays to journals table
alter table public.journals add column if not exists understands uuid[] default array[]::uuid[];
alter table public.journals add column if not exists inspired uuid[] default array[]::uuid[];

-- Collections table
create table if not exists public.collections (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  author_id uuid references public.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.collections enable row level security;
drop policy if exists "Collections viewable by everyone." on public.collections;
create policy "Collections viewable by everyone." on public.collections for select using (true);
drop policy if exists "Users insert collections." on public.collections;
create policy "Users insert collections." on public.collections for insert with check (auth.uid() = author_id);
drop policy if exists "Users update collections." on public.collections;
create policy "Users update collections." on public.collections for update using (auth.uid() = author_id);
drop policy if exists "Users delete collections." on public.collections;
create policy "Users delete collections." on public.collections for delete using (auth.uid() = author_id);

-- Alter journals table for Time Capsule, Experience Map, and Collections
alter table public.journals add column if not exists unlock_date timestamp with time zone;
alter table public.journals add column if not exists latitude double precision;
alter table public.journals add column if not exists longitude double precision;
alter table public.journals add column if not exists location_name text;
alter table public.journals add column if not exists collection_id uuid references public.collections(id);

alter table public.users add column if not exists bio text;
alter table public.users add column if not exists website text;
alter table public.users add column if not exists twitter text;

-- Moments table
create table if not exists public.moments (
  id uuid default uuid_generate_v4() primary key,
  author_id uuid references public.users(id) on delete cascade not null,
  author_name text not null,
  author_username text not null,
  author_photo_url text,
  media_url text not null,
  media_type text not null,
  filter text default 'none',
  overlay_text text,
  overlay_position jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '24 hours') not null
);

alter table public.moments enable row level security;

-- Moments policies
drop policy if exists "Moments are viewable by authorized users." on public.moments;
create policy "Moments are viewable by authorized users." on public.moments for select using (
  expires_at > timezone('utc'::text, now())
  and (
    auth.uid() = author_id 
    or exists (
      select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = author_id
    )
  )
);

drop policy if exists "Users can insert their own moments." on public.moments;
create policy "Users can insert their own moments." on public.moments for insert with check (auth.uid() = author_id);

drop policy if exists "Users can delete own moments." on public.moments;
create policy "Users can delete own moments." on public.moments for delete using (auth.uid() = author_id);

-- Storage for Moments
insert into storage.buckets (id, name, public) 
values ('moments', 'moments', true)
on conflict (id) do nothing;

drop policy if exists "Moments images are publicly accessible." on storage.objects;
create policy "Moments images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'moments' );

drop policy if exists "Anyone can upload a moment." on storage.objects;
create policy "Anyone can upload a moment."
  on storage.objects for insert
  with check ( bucket_id = 'moments' );
