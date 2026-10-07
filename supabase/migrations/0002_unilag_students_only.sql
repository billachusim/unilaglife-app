-- Only UNILAG student mailboxes can create an account. Enforced in the database,
-- so it holds no matter which client or API call creates the user.
create or replace function public.enforce_unilag_student_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Visitor passes (anonymous sign-in) are for testing; switch anonymous sign-ins off in production.
  if new.is_anonymous then
    return new;
  end if;
  if new.email is null or lower(new.email) not like '%@live.unilag.edu.ng' then
    raise exception 'Only UNILAG student emails can join UnilagLife';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_unilag_student_email on auth.users;
create trigger enforce_unilag_student_email
  before insert on auth.users
  for each row execute function public.enforce_unilag_student_email();
