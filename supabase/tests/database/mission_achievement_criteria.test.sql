begin;

create extension if not exists pgtap
    with schema extensions;

select plan(10);


/* -------------------------------------------------------------------------
 * Mission-specific achievement criterion structure
 * ------------------------------------------------------------------------- */

select is(
    (
        select count(*)
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'achievements'
          and column_name = 'target_mission_id'
          and data_type = 'bigint'
          and is_nullable = 'YES'
    ),
    1::bigint,
    'achievements has a nullable bigint target_mission_id column'
);


select ok(
    exists (
        select 1
        from pg_constraint as constraint_row
        join pg_class as source_table
            on source_table.oid = constraint_row.conrelid
        join pg_namespace as source_namespace
            on source_namespace.oid = source_table.relnamespace
        join pg_class as target_table
            on target_table.oid = constraint_row.confrelid
        join pg_namespace as target_namespace
            on target_namespace.oid = target_table.relnamespace
        where constraint_row.contype = 'f'
          and source_namespace.nspname = 'public'
          and source_table.relname = 'achievements'
          and target_namespace.nspname = 'public'
          and target_table.relname = 'preparedness_missions'
          and pg_get_constraintdef(constraint_row.oid)
                like '%FOREIGN KEY (target_mission_id)%'
    ),
    'target_mission_id has a foreign key to preparedness_missions'
);


select ok(
    exists (
        select 1
        from pg_indexes
        where schemaname = 'public'
          and tablename = 'achievements'
          and indexname = 'achievements_target_mission_id_idx'
    ),
    'the target-mission lookup index exists'
);


/* -------------------------------------------------------------------------
 * Valid mission-completion definitions
 * ------------------------------------------------------------------------- */

select results_eq(
    $$
        insert into public.achievements (
            code,
            title_en,
            title_ar,
            description_en,
            description_ar,
            criterion_type,
            threshold,
            target_mission_id,
            sort_order
        )
        values (
            'test_first_aid_mission_complete',
            'Test First Aid Mission Complete',
            'اختبار إكمال مهمة الإسعافات الأولية',
            'Temporary mission-completion achievement used by pgTAP.',
            'إنجاز مؤقت لإكمال مهمة يستخدمه اختبار pgTAP.',
            'mission_completed',
            1,
            (
                select id
                from public.preparedness_missions
                where code = 'prepare_first_aid_kit'
            ),
            1
        )
        returning
            code,
            criterion_type,
            threshold,
            target_mission_id is not null
    $$,
    $$
        values (
            'test_first_aid_mission_complete'::text,
            'mission_completed'::text,
            1::smallint,
            true
        )
    $$,
    'a mission_completed achievement can target the First Aid mission'
);


select results_eq(
    $$
        insert into public.achievements (
            code,
            title_en,
            title_ar,
            description_en,
            description_ar,
            criterion_type,
            threshold,
            target_mission_id,
            sort_order
        )
        values (
            'test_local_hazards_mission_complete',
            'Test Local Hazards Mission Complete',
            'اختبار إكمال مهمة المخاطر المحلية',
            'Temporary local-hazard mission-completion achievement used by pgTAP.',
            'إنجاز مؤقت لإكمال مهمة المخاطر المحلية يستخدمه اختبار pgTAP.',
            'mission_completed',
            1,
            (
                select id
                from public.preparedness_missions
                where code = 'know_your_local_hazards'
            ),
            2
        )
        returning
            code,
            criterion_type,
            threshold,
            target_mission_id is not null
    $$,
    $$
        values (
            'test_local_hazards_mission_complete'::text,
            'mission_completed'::text,
            1::smallint,
            true
        )
    $$,
    'a mission_completed achievement can target the Know Your Local Hazards mission'
);


/* -------------------------------------------------------------------------
 * Invalid criterion combinations are rejected
 * ------------------------------------------------------------------------- */

select throws_ok(
    $$
        insert into public.achievements (
            code,
            title_en,
            title_ar,
            description_en,
            description_ar,
            criterion_type,
            threshold
        )
        values (
            'test_missing_target',
            'Missing Mission Target',
            'هدف المهمة مفقود',
            'Invalid temporary mission-completion definition.',
            'تعريف مؤقت غير صالح لإنجاز إكمال مهمة.',
            'mission_completed',
            1
        )
    $$,
    '23514',
    null,
    'mission_completed criteria require a target mission'
);


select throws_ok(
    $$
        insert into public.achievements (
            code,
            title_en,
            title_ar,
            description_en,
            description_ar,
            criterion_type,
            threshold,
            target_mission_id
        )
        values (
            'test_invalid_mission_threshold',
            'Invalid Mission Threshold',
            'حد مهمة غير صالح',
            'Invalid temporary mission threshold definition.',
            'تعريف مؤقت غير صالح لحد إنجاز المهمة.',
            'mission_completed',
            2,
            (
                select id
                from public.preparedness_missions
                where code = 'prepare_first_aid_kit'
            )
        )
    $$,
    '23514',
    null,
    'mission_completed criteria require threshold 1'
);


select throws_ok(
    $$
        insert into public.achievements (
            code,
            title_en,
            title_ar,
            description_en,
            description_ar,
            criterion_type,
            threshold,
            target_mission_id
        )
        values (
            'test_aggregate_with_target',
            'Aggregate With Mission Target',
            'معيار تجميعي مع هدف مهمة',
            'Invalid temporary aggregate definition with a mission target.',
            'تعريف تجميعي مؤقت غير صالح مع هدف مهمة.',
            'tasks_completed',
            5,
            (
                select id
                from public.preparedness_missions
                where code = 'prepare_first_aid_kit'
            )
        )
    $$,
    '23514',
    null,
    'aggregate achievement criteria cannot carry a target mission'
);


select throws_ok(
    $$
        insert into public.achievements (
            code,
            title_en,
            title_ar,
            description_en,
            description_ar,
            criterion_type,
            threshold,
            target_mission_id
        )
        values (
            'test_unknown_target_mission',
            'Unknown Mission Target',
            'هدف مهمة غير معروف',
            'Invalid temporary definition with an unknown mission.',
            'تعريف مؤقت غير صالح مع مهمة غير معروفة.',
            'mission_completed',
            1,
            -999
        )
    $$,
    '23503',
    null,
    'mission-specific achievements cannot reference an unknown mission'
);


/* -------------------------------------------------------------------------
 * Existing aggregate achievement behaviour remains compatible
 * ------------------------------------------------------------------------- */

select results_eq(
    $$
        insert into public.achievements (
            code,
            title_en,
            title_ar,
            description_en,
            description_ar,
            criterion_type,
            threshold,
            sort_order
        )
        values (
            'test_existing_aggregate_compatibility',
            'Aggregate Compatibility',
            'توافق المعيار التجميعي',
            'Temporary aggregate definition proving backward compatibility.',
            'تعريف تجميعي مؤقت لإثبات التوافق مع السلوك السابق.',
            'preparedness_points',
            100,
            3
        )
        returning
            criterion_type,
            threshold,
            target_mission_id is null
    $$,
    $$
        values (
            'preparedness_points'::text,
            100::smallint,
            true
        )
    $$,
    'existing aggregate criteria remain valid with no target mission'
);


select * from finish();

rollback;
