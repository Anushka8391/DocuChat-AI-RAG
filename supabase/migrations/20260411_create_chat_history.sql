create extension if not exists pgcrypto;

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  agent_response jsonb,
  tool_invocations jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_conversations_user_id_created_at_idx
  on public.chat_conversations (user_id, created_at desc);

create index if not exists chat_messages_conversation_id_created_at_idx
  on public.chat_messages (conversation_id, created_at asc);

create or replace function public.set_chat_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists chat_conversations_set_updated_at on public.chat_conversations;
create trigger chat_conversations_set_updated_at
before update on public.chat_conversations
for each row
execute function public.set_chat_conversations_updated_at();

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users can view their own conversations"
on public.chat_conversations
for select
using (auth.uid() = user_id);

create policy "Users can insert their own conversations"
on public.chat_conversations
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
on public.chat_conversations
for update
using (auth.uid() = user_id);

create policy "Users can view their own chat messages"
on public.chat_messages
for select
using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
on public.chat_messages
for insert
with check (auth.uid() = user_id);

create policy "Users can delete their own chat messages"
on public.chat_messages
for delete
using (auth.uid() = user_id);
