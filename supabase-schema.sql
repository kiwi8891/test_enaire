-- Ejecutar en Supabase → SQL Editor

create table if not exists progress (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users not null,
  question_id   integer not null,
  wrong_count   integer default 0,
  correct_count integer default 0,
  last_seen     timestamptz,
  unique(user_id, question_id)
);

alter table progress enable row level security;

create policy "own_progress" on progress
  for all using (auth.uid() = user_id);
