create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  bucket_name text not null,
  storage_path text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists uploaded_files_user_id_created_at_idx
  on public.uploaded_files (user_id, created_at desc);

alter table public.uploaded_files enable row level security;

create policy "Users can view their own uploaded files"
on public.uploaded_files
for select
using (auth.uid() = user_id);

create policy "Users can insert their own uploaded files"
on public.uploaded_files
for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own uploaded files"
on public.uploaded_files
for delete
using (auth.uid() = user_id);
