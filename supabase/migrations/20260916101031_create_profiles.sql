-- Private schema for database-only helper functions.
create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;


-- Application profile linked one-to-one with Supabase Auth.
create table public.profiles (
	id uuid primary key references auth.users(id) on delete cascade,
	display_name text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	constraint profiles_display_name_length
		check (
			display_name is null
			or char_length(trim(display_name)) between 1 and 80
		)
);


-- Explicitly enable RLS even though the project also has automatic RLS enabled.
alter table public.profiles enable row level security;


-- Start from no client privileges, then grant only what the app needs.
revoke all on table public.profiles from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

grant select, insert, update, delete
	on table public.profiles
	to service_role;


-- Signed-in users may only read their own profile.
create policy "Authenticated users can only read their own profile"
	on public.profiles
	for select
	to authenticated
	using (
		(select auth.uid()) = id
	);


-- Signed-in users may only update their own profile.
create policy "Authenticated users can only update their own profile"
	on public.profiles
	for update
	to authenticated
	using (
		(select auth.uid()) = id
	)
	with check (
		(select auth.uid()) = id
	);


-- Create a profile automatically whenever Supabase Auth creates a user.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.profiles (id)
	values (new.id);

	return new;
end;
$$;


create trigger on_auth_user_created
	after insert on auth.users
	for each row
	execute function private.handle_new_user();


-- Keep updated_at controlled by the database.
create or replace function private.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at = now();

	return new;
end;
$$;


create trigger on_profile_updated
	before update on public.profiles
	for each row
	execute function private.set_profile_updated_at();