-- Phase 2/3 shared campus state: student profiles, the Hall Cup, SUG elections and sponsor slots.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  hall text not null,
  dept text not null,
  faculty text not null,
  level int not null default 1,
  cgpa numeric(3, 2) not null default 0,
  status text not null default 'applicant',
  look jsonb,
  is_visitor boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);
drop policy if exists "Students write their own profile" on public.profiles;
create policy "Students write their own profile" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "Students update their own profile" on public.profiles;
create policy "Students update their own profile" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- Hall Cup
create table if not exists public.hall_points (
  hall text primary key,
  points bigint not null default 0
);
insert into public.hall_points (hall) values
  ('jaja'), ('mariere'), ('eniNjoku'), ('elKanemi'), ('moremi'), ('kofoAdemola'), ('madamTinubu'), ('queenAmina')
on conflict (hall) do nothing;
alter table public.hall_points enable row level security;
drop policy if exists "Anyone can see the Hall Cup" on public.hall_points;
create policy "Anyone can see the Hall Cup" on public.hall_points for select using (true);

create table if not exists public.hall_point_log (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_at timestamptz not null
);
alter table public.hall_point_log enable row level security;

-- Points go to the caller's own hall (from their profile), at most 5 at a time and once every 20 seconds.
create or replace function public.award_hall_points(p_points int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hall text;
  v_last timestamptz;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_points < 1 or p_points > 5 then raise exception 'Invalid points'; end if;
  select hall into v_hall from public.profiles where user_id = auth.uid();
  if v_hall is null then return; end if;
  select last_at into v_last from public.hall_point_log where user_id = auth.uid();
  if v_last is not null and v_last > now() - interval '20 seconds' then return; end if;
  insert into public.hall_point_log (user_id, last_at) values (auth.uid(), now())
    on conflict (user_id) do update set last_at = excluded.last_at;
  update public.hall_points set points = points + p_points where hall = v_hall;
end;
$$;
revoke all on function public.award_hall_points(int) from public;
grant execute on function public.award_hall_points(int) to authenticated;

-- ---------------------------------------------------------------- SUG elections
-- One term per real week. The winner of the previous term is President, and their policy is in force.
create or replace function public.current_term()
returns int
language sql
stable
as $$ select floor(extract(epoch from now()) / 604800)::int $$;

create table if not exists public.sug_candidates (
  id uuid primary key default gen_random_uuid(),
  term int not null,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  hall text not null,
  dept text not null,
  manifesto text not null check (char_length(manifesto) between 10 and 280),
  policy text not null check (policy in ('steadyLight', 'cheapBuka', 'moreShuttles', 'readingRooms', 'fridayJams')),
  look jsonb,
  npc_votes int not null default 0,
  created_at timestamptz not null default now(),
  unique (term, user_id)
);
alter table public.sug_candidates enable row level security;
drop policy if exists "Candidates are public" on public.sug_candidates;
create policy "Candidates are public" on public.sug_candidates for select using (true);
drop policy if exists "Students declare for the current term" on public.sug_candidates;
create policy "Students declare for the current term" on public.sug_candidates for insert
  with check (auth.uid() = user_id and term = public.current_term() and npc_votes = 0);
drop policy if exists "Candidates can withdraw" on public.sug_candidates;
create policy "Candidates can withdraw" on public.sug_candidates for delete using (auth.uid() = user_id);

create table if not exists public.sug_votes (
  term int not null,
  voter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  candidate_id uuid not null references public.sug_candidates (id) on delete cascade,
  faculty text not null,
  created_at timestamptz not null default now(),
  primary key (term, voter_id)
);
alter table public.sug_votes enable row level security;
drop policy if exists "Students see their own vote" on public.sug_votes;
create policy "Students see their own vote" on public.sug_votes for select using (auth.uid() = voter_id);
drop policy if exists "Students vote once per term" on public.sug_votes;
create policy "Students vote once per term" on public.sug_votes for insert
  with check (
    auth.uid() = voter_id
    and term = public.current_term()
    and exists (select 1 from public.sug_candidates c where c.id = sug_votes.candidate_id and c.term = sug_votes.term)
  );
drop policy if exists "Students can change their vote" on public.sug_votes;
create policy "Students can change their vote" on public.sug_votes for update
  using (auth.uid() = voter_id)
  with check (
    auth.uid() = voter_id
    and term = public.current_term()
    and exists (select 1 from public.sug_candidates c where c.id = sug_votes.candidate_id and c.term = sug_votes.term)
  );

-- Totals per candidate with a faculty-by-faculty breakdown; individual ballots stay private.
create or replace function public.sug_results(p_term int)
returns table (candidate_id uuid, votes bigint, by_faculty jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    (c.npc_votes + coalesce(sum(f.n), 0))::bigint,
    coalesce(jsonb_object_agg(f.faculty, f.n) filter (where f.faculty is not null), '{}'::jsonb)
  from public.sug_candidates c
  left join (
    select v.candidate_id, v.faculty, count(*) as n
    from public.sug_votes v
    where v.term = p_term
    group by v.candidate_id, v.faculty
  ) f on f.candidate_id = c.id
  where c.term = p_term
  group by c.id, c.npc_votes;
$$;
grant execute on function public.sug_results(int) to anon, authenticated;

-- Seed three aspirants for a term so the ballot is never empty.
create or replace function public.sug_ensure_npcs(p_term int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_term not in (public.current_term(), public.current_term() - 1) then return; end if;
  if exists (select 1 from public.sug_candidates where term = p_term and user_id is null) then return; end if;
  insert into public.sug_candidates (term, user_id, name, hall, dept, manifesto, policy, npc_votes) values
    (p_term, null, 'Comrade Tobi', 'mariere', 'polsci', 'Steady light in every hall, from Jaja to Queen Amina. No more reading with torchlight during exams.', 'steadyLight', 8 + floor(random() * 20)::int),
    (p_term, null, 'Ada "Jollof" Okafor', 'moremi', 'economics', 'Subsidised buka meals for every Akokite. Nobody should choose between rice and a handout.', 'cheapBuka', 8 + floor(random() * 20)::int),
    (p_term, null, 'Femi Shuttle', 'eniNjoku', 'engineering', 'Double the campus shuttles so you are never late to an 8 AM lecture again.', 'moreShuttles', 8 + floor(random() * 20)::int);
end;
$$;
grant execute on function public.sug_ensure_npcs(int) to anon, authenticated;

-- ---------------------------------------------------------------- sponsors
-- Billboards and the buka menu. Manage rows from the Supabase dashboard; the game shows active ones.
create table if not exists public.sponsor_slots (
  id text primary key,
  placement text not null check (placement in ('billboard', 'buka')),
  title text not null,
  image_url text,
  link text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null
);
alter table public.sponsor_slots enable row level security;
drop policy if exists "Active sponsors are public" on public.sponsor_slots;
create policy "Active sponsors are public" on public.sponsor_slots for select using (now() between starts_at and ends_at);
