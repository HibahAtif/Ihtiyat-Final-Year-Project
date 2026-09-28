begin;

/* -------------------------------------------------------------------------
 * LOCATION-BASED HAZARD RESOLVER
 * -------------------------------------------------------------------------
 *
 * Resolves preparedness-hazard relevance for a selected curated location.
 *
 * Resolution rules:
 *
 * 1. Start with the selected location.
 * 2. Walk upward through its parent-location hierarchy.
 * 3. For each hazard, prefer the closest active location-specific mapping.
 * 4. Fall back to an active ancestor mapping where no closer mapping exists.
 * 5. Hazards with no mapping remain available, but are not prioritised.
 *
 * Relevance rank is preparedness-content prioritisation only. It must never
 * be interpreted as alert severity, event probability or scientific risk.
 */

create or replace function public.resolve_location_hazards(
	p_location_id bigint
)
returns table (
	hazard_id bigint,
	hazard_code text,
	hazard_name_en text,
	hazard_name_ar text,
	classification text,
	hazard_sort_order smallint,
	is_prioritised boolean,
	relevance_rank smallint,
	matched_location_id bigint,
	matched_location_code text,
	matched_location_type text,
	matched_location_name_en text,
	matched_location_name_ar text,
	hierarchy_distance integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
	if p_location_id is null then
		raise exception using
			errcode = '22023',
			message = 'A location must be selected.';
	end if;

	if not exists (
		select 1
		from public.locations as selected_location
		where selected_location.id = p_location_id
			and selected_location.is_active
	) then
		raise exception using
			errcode = '22023',
			message = 'Selected location is unavailable.';
	end if;

	return query
	with recursive location_chain (
		location_id,
		parent_id,
		official_code,
		location_type,
		name_en,
		name_ar,
		hierarchy_distance,
		visited_ids
	) as (
		select
			selected_location.id,
			selected_location.parent_id,
			selected_location.official_code,
			selected_location.location_type,
			selected_location.name_en,
			selected_location.name_ar,
			0,
			array[selected_location.id]::bigint[]
		from public.locations as selected_location
		where selected_location.id = p_location_id
			and selected_location.is_active

		union all

		select
			parent_location.id,
			parent_location.parent_id,
			parent_location.official_code,
			parent_location.location_type,
			parent_location.name_en,
			parent_location.name_ar,
			location_chain.hierarchy_distance + 1,
			location_chain.visited_ids
				|| parent_location.id
		from location_chain
		join public.locations as parent_location
			on parent_location.id = location_chain.parent_id
		where parent_location.is_active
			and not (
				parent_location.id
				= any(location_chain.visited_ids)
			)
	),
	resolved_hazards as (
		select
			hazard.id as hazard_id,
			hazard.code as hazard_code,
			hazard.name_en as hazard_name_en,
			hazard.name_ar as hazard_name_ar,
			hazard.classification,
			hazard.sort_order as hazard_sort_order,

			resolved_mapping.relevance_rank,

			resolved_mapping.location_id
				as matched_location_id,

			resolved_mapping.official_code
				as matched_location_code,

			resolved_mapping.location_type
				as matched_location_type,

			resolved_mapping.name_en
				as matched_location_name_en,

			resolved_mapping.name_ar
				as matched_location_name_ar,

			resolved_mapping.hierarchy_distance
		from public.hazards as hazard

		left join lateral (
			select
				profile.relevance_rank,
				location_chain.location_id,
				location_chain.official_code,
				location_chain.location_type,
				location_chain.name_en,
				location_chain.name_ar,
				location_chain.hierarchy_distance
			from location_chain
			join public.location_hazard_profiles as profile
				on profile.location_id =
					location_chain.location_id
			where profile.hazard_id = hazard.id
				and profile.is_active
			order by
				location_chain.hierarchy_distance
			limit 1
		) as resolved_mapping
			on true

		where hazard.is_active
	)
	select
		resolved_hazards.hazard_id,
		resolved_hazards.hazard_code,
		resolved_hazards.hazard_name_en,
		resolved_hazards.hazard_name_ar,
		resolved_hazards.classification,
		resolved_hazards.hazard_sort_order,

		(
			resolved_hazards.relevance_rank
				is not null
		) as is_prioritised,

		resolved_hazards.relevance_rank,
		resolved_hazards.matched_location_id,
		resolved_hazards.matched_location_code,
		resolved_hazards.matched_location_type,
		resolved_hazards.matched_location_name_en,
		resolved_hazards.matched_location_name_ar,
		resolved_hazards.hierarchy_distance

	from resolved_hazards

	order by
		(
			resolved_hazards.relevance_rank
				is null
		),
		resolved_hazards.relevance_rank,
		resolved_hazards.hierarchy_distance
			nulls last,
		resolved_hazards.hazard_sort_order,
		resolved_hazards.hazard_id;
end;
$$;


/*
 * PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
 * Remove that implicit access, then expose the resolver deliberately to
 * application roles.
 */

revoke execute
	on function public.resolve_location_hazards(bigint)
	from public, anon, authenticated;


grant execute
	on function public.resolve_location_hazards(bigint)
	to anon, authenticated, service_role;


comment on function public.resolve_location_hazards(bigint)
is
	'Resolves hazards using the nearest available Saudi location first, then falls back to parent locations. Relevance rank is used to prioritise preparedness content and does not represent alert severity, scientific risk or probability.';


commit;