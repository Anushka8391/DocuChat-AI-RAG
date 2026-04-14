alter table public.profiles
  add column if not exists system_prompt text;
