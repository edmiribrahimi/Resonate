-- Sync profiles.email when a user changes their email via Supabase Auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

-- Fire after any update on auth.users
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_email_change();
