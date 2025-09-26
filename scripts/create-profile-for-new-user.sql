-- Function to create a new profile for a new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, blood_type, user_type, location_city, location_state, is_available)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'blood_type',
    new.raw_user_meta_data->>'user_type',
    new.raw_user_meta_data->>'location_city',
    new.raw_user_meta_data->>'location_state',
    true -- Set availability to true by default
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();