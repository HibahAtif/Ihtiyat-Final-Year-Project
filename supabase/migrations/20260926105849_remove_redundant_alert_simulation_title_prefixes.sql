/*
 * Removes redundant simulation markers from the canonical alert titles.
 *
 * WHAT:
 * The Alerts UI already renders an explicit bilingual SIMULATION badge for
 * simulated rows.
 *
 * WHY:
 * Keeping "[SIMULATION]" / "[محاكاة]" inside the canonical title repeated the
 * same status immediately underneath the badge and would also carry that
 * repetition into future notification and Action Plan surfaces.
 *
 * HOW:
 * Only simulated rows with the known V1 prefixes are changed. The alert origin,
 * simulation badge and explicit non-official wording remain unchanged.
 */

begin;


update public.alerts
set
	title_en = regexp_replace(
		title_en,
		'^\[SIMULATION\]\s*',
		''
	),

	title_ar = regexp_replace(
		title_ar,
		'^\[محاكاة\]\s*',
		''
	)
where origin_type = 'simulated'
	and (
		title_en like '[SIMULATION]%'
		or title_ar like '[محاكاة]%'
	);


commit;