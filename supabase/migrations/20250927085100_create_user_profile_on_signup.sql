-- Function to create a user profile when a new user signs up in Supabase Auth
create or replace function public.create_public_user_on_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insert a new row into the public.User table
  insert into public."User" (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Trigger to execute the function after a new user is inserted into auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_public_user_on_signup();