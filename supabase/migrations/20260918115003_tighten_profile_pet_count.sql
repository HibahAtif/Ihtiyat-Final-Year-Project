begin;


/* --------------------------------------------------------------------------
 * Pet Count Correction
 * --------------------------------------------------------------------------
 *
 * I made hte mistake of constraining the household's pet count to 25
 * (an extremely unreasonable number)
 * In this file a correction has been made by altering the table to drop the old
 * constraint and adopt the new constraint of 0 to 10.

 */
alter table public.profiles
	drop constraint profiles_pets_count_range;

alter table public.profiles
	add constraint profiles_pets_count_range
	check (
		pets_count is null
		or pets_count between 0 and 10
	);

commit;