begin;


select plan(2);


/*
 * The UI already renders an explicit SIMULATION badge. Keeping the same marker
 * inside the canonical title creates unnecessary repetition in alert cards,
 * notifications and future Action Plan headings.
 */
select is(
	(
		select count(*)
		from public.alerts
		where origin_type = 'simulated'
			and title_en like '[SIMULATION]%'
	),
	0::bigint,
	'Simulated English alert titles do not duplicate the UI simulation badge'
);


select is(
	(
		select count(*)
		from public.alerts
		where origin_type = 'simulated'
			and title_ar like '[محاكاة]%'
	),
	0::bigint,
	'Simulated Arabic alert titles do not duplicate the UI simulation badge'
);


select * from finish();


rollback;