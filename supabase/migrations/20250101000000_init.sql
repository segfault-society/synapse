-- Micro-SaaS Template - Initial Schema
-- This migration creates a simple example table and storage bucket

-- Create items table (example entity)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  image_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- PERFORMANCE: Add index on user_id foreign key
create index if not exists idx_items_user_id on public.items(user_id);

-- Enable Row Level Security
alter table public.items enable row level security;

-- RLS Policies for items
-- PERFORMANCE: Using (select auth.uid()) instead of auth.uid() to prevent per-row re-evaluation
create policy "Users can view their own items"
  on public.items for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own items"
  on public.items for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own items"
  on public.items for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own items"
  on public.items for delete
  using ((select auth.uid()) = user_id);

-- Create updated_at trigger
-- SECURITY: SET search_path to prevent search_path injection attacks
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger set_updated_at
  before update on public.items
  for each row
  execute function public.handle_updated_at();

-- Storage bucket for uploads (only if storage extension is enabled)
-- SECURITY: Bucket is private - use signed URLs for access
do $$
begin
  if exists (select from pg_tables where schemaname = 'storage' and tablename = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('uploads', 'uploads', false)
    on conflict (id) do nothing;
  end if;
end $$;

-- Storage policies (only if storage extension is enabled)
-- SECURITY: Users can only access their own files
do $$
begin
  if exists (select from pg_tables where schemaname = 'storage' and tablename = 'objects') then
    create policy "Users can upload files"
      on storage.objects for insert
      with check (
        bucket_id = 'uploads' and
        (select auth.uid())::text = (storage.foldername(name))[1]
      );

    -- SECURITY FIX: Removed overly permissive auth.role() = 'authenticated' check
    -- Users can only view their own files
    create policy "Users can view their files"
      on storage.objects for select
      using (
        bucket_id = 'uploads' and
        (select auth.uid())::text = (storage.foldername(name))[1]
      );

    create policy "Users can update their files"
      on storage.objects for update
      using (
        bucket_id = 'uploads' and
        (select auth.uid())::text = (storage.foldername(name))[1]
      );

    create policy "Users can delete their files"
      on storage.objects for delete
      using (
        bucket_id = 'uploads' and
        (select auth.uid())::text = (storage.foldername(name))[1]
      );
  end if;
end $$;

-- Create profiles table (optional but recommended)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- SECURITY FIX: Users can only view their OWN profile
-- The old policy (auth.role() = 'authenticated') allowed ANY authenticated user to view ALL profiles!
-- PERFORMANCE: Using (select auth.uid()) instead of auth.uid() to prevent per-row re-evaluation
create policy "Users can view their own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

-- Function to handle new user creation
-- SECURITY: SET search_path to prevent search_path injection attacks
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
