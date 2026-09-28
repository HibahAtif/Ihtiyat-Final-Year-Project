begin;

create extension if not exists pgtap
    with schema extensions;

select plan(22);


/* ==========================================================================
 * Award-engine structure and security boundary
 * ========================================================================== */

select is(
    (
        select count(*)
        from pg_proc as function_row
        join pg_namespace as namespace_row
            on namespace_row.oid = function_row.pronamespace
        where namespace_row.nspname = 'private'
          and function_row.proname in (
              'user_has_completed_preparedness_mission',
              'evaluate_preparedness_achievements',
              'award_achievements_after_task_progress',
              'award_achievements_after_quiz_progress',
              'award_achievements_after_profile_change'
          )
    ),
    5::bigint,
    'the achievement engine exposes exactly the 5 intended private helper and trigger functions'
);


select is(
    (
        select count(*)
        from pg_trigger as trigger_row
        join pg_class as table_row
            on table_row.oid = trigger_row.tgrelid
        join pg_namespace as namespace_row
            on namespace_row.oid = table_row.relnamespace
        where not trigger_row.tgisinternal
          and namespace_row.nspname = 'public'
          and (
              (
                  table_row.relname = 'user_mission_task_progress'
                  and trigger_row.tgname =
                      'on_task_progress_award_achievements'
              )
              or
              (
                  table_row.relname = 'user_quiz_progress'
                  and trigger_row.tgname =
                      'on_quiz_progress_award_achievements'
              )
              or
              (
                  table_row.relname = 'profiles'
                  and trigger_row.tgname =
                      'on_profile_change_award_achievements'
              )
          )
    ),
    3::bigint,
    'task progress, quiz progress and active-location changes each have an achievement trigger'
);


select ok(
    not has_function_privilege(
        'anon',
        'private.evaluate_preparedness_achievements(uuid)',
        'EXECUTE'
    )
    and not has_function_privilege(
        'authenticated',
        'private.evaluate_preparedness_achievements(uuid)',
        'EXECUTE'
    )
    and not has_function_privilege(
        'anon',
        'private.user_has_completed_preparedness_mission(uuid,bigint)',
        'EXECUTE'
    )
    and not has_function_privilege(
        'authenticated',
        'private.user_has_completed_preparedness_mission(uuid,bigint)',
        'EXECUTE'
    ),
    'application roles cannot directly execute the trusted achievement evaluators'
);


select ok(
    not has_function_privilege(
        'anon',
        'private.award_achievements_after_task_progress()',
        'EXECUTE'
    )
    and not has_function_privilege(
        'authenticated',
        'private.award_achievements_after_task_progress()',
        'EXECUTE'
    )
    and not has_function_privilege(
        'anon',
        'private.award_achievements_after_quiz_progress()',
        'EXECUTE'
    )
    and not has_function_privilege(
        'authenticated',
        'private.award_achievements_after_quiz_progress()',
        'EXECUTE'
    )
    and not has_function_privilege(
        'anon',
        'private.award_achievements_after_profile_change()',
        'EXECUTE'
    )
    and not has_function_privilege(
        'authenticated',
        'private.award_achievements_after_profile_change()',
        'EXECUTE'
    ),
    'application roles cannot directly execute achievement trigger functions'
);


select ok(
    has_table_privilege(
        'authenticated',
        'public.user_achievements',
        'SELECT'
    )
    and not has_table_privilege(
        'authenticated',
        'public.user_achievements',
        'INSERT'
    )
    and not has_table_privilege(
        'authenticated',
        'public.user_achievements',
        'UPDATE'
    )
    and not has_table_privilege(
        'authenticated',
        'public.user_achievements',
        'DELETE'
    ),
    'authenticated clients can read their earned achievements but cannot award or alter them directly'
);


/* ==========================================================================
 * Temporary authenticated users
 * ========================================================================== */

insert into auth.users (
    id,
    email,
    aud,
    role
)
values
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'achievement-engine-user-a@example.test',
        'authenticated',
        'authenticated'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
        'achievement-engine-user-b@example.test',
        'authenticated',
        'authenticated'
    ),
    (
        'cccccccc-cccc-cccc-cccc-ccccccccccc3',
        'achievement-engine-user-c@example.test',
        'authenticated',
        'authenticated'
    );


/* ==========================================================================
 * User A: aggregate milestones, mission completion and verified quiz award
 * ========================================================================== */

set local role authenticated;
set local request.jwt.claim.sub =
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

select throws_ok(
    $$
        insert into public.user_achievements (
            user_id,
            achievement_id
        )
        values (
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
            (
                select id
                from public.achievements
                where code = 'first_preparedness_step'
            )
        )
    $$,
    '42501',
    null,
    'an authenticated user cannot directly award themselves an achievement'
);

insert into public.user_mission_task_progress (
    user_id,
    task_id,
    is_completed
)
select
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
    task.id,
    true
from public.mission_tasks as task
where task.code = 'first_aid_kit_ready';

reset role;


select results_eq(
    $$
        select achievement.code
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
        order by achievement.code
    $$,
    $$
        values ('first_preparedness_step'::text)
    $$,
    'completing the first task automatically awards only First Preparedness Step'
);


set local role authenticated;
set local request.jwt.claim.sub =
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

insert into public.user_mission_task_progress (
    user_id,
    task_id,
    is_completed
)
select
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
    task.id,
    true
from public.mission_tasks as task
join public.preparedness_missions as mission
    on mission.id = task.mission_id
where mission.code = 'prepare_first_aid_kit'
  and task.is_active
  and task.code <> 'first_aid_kit_ready';

reset role;


select results_eq(
    $$
        select achievement.code
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
        order by achievement.code
    $$,
    $$
        values
            ('first_aid_mission_complete'::text),
            ('first_preparedness_step'::text),
            ('preparedness_100'::text),
            ('preparedness_starter'::text)
    $$,
    'completing all five First Aid tasks awards the task-count, points and First Aid mission milestones'
);


set local role authenticated;
set local request.jwt.claim.sub =
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

select lives_ok(
    $$
        select *
        from public.submit_quiz_answer(
            (
                select id
                from public.quiz_questions
                where code = 'quiz_ambulance_number'
            ),
            array[
                (
                    select option.id
                    from public.quiz_options as option
                    join public.quiz_questions as question
                        on question.id = option.question_id
                    where question.code = 'quiz_ambulance_number'
                      and option.option_code = 'number_997'
                )
            ]::bigint[]
        )
    $$,
    'a verified correct production quiz answer can flow through submit_quiz_answer'
);

reset role;


select results_eq(
    $$
        select achievement.code
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
        order by achievement.code
    $$,
    $$
        values
            ('first_aid_mission_complete'::text),
            ('first_preparedness_step'::text),
            ('preparedness_100'::text),
            ('preparedness_starter'::text),
            ('scenario_learner'::text)
    $$,
    'the first server-verified correct quiz answer automatically awards Preparedness Learner'
);


set local role authenticated;
set local request.jwt.claim.sub =
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

select lives_ok(
    $$
        select *
        from public.submit_quiz_answer(
            (
                select id
                from public.quiz_questions
                where code = 'quiz_ambulance_number'
            ),
            array[
                (
                    select option.id
                    from public.quiz_options as option
                    join public.quiz_questions as question
                        on question.id = option.question_id
                    where question.code = 'quiz_ambulance_number'
                      and option.option_code = 'number_997'
                )
            ]::bigint[]
        )
    $$,
    'repeating a correct verified quiz answer remains safe'
);

reset role;


select is(
    (
        select count(*)
        from public.user_achievements
        where user_id =
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
    ),
    5::bigint,
    'repeated achievement evaluation is idempotent and creates no duplicate awards'
);


set local role authenticated;
set local request.jwt.claim.sub =
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

update public.user_mission_task_progress
set is_completed = false
where user_id =
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
  and task_id = (
      select id
      from public.mission_tasks
      where code = 'first_aid_kit_ready'
  );

reset role;


select is(
    (
        select count(*)
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
          and achievement.code in (
              'first_aid_mission_complete',
              'preparedness_100',
              'preparedness_starter'
          )
    ),
    3::bigint,
    'historical achievements are retained after later task uncompletion'
);


/* ==========================================================================
 * User B: wrong-answer protection and adaptive Jeddah mission completion
 * ========================================================================== */

set local role authenticated;
set local request.jwt.claim.sub =
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';

select lives_ok(
    $$
        select *
        from public.submit_quiz_answer(
            (
                select id
                from public.quiz_questions
                where code = 'quiz_ambulance_number'
            ),
            array[
                (
                    select option.id
                    from public.quiz_options as option
                    join public.quiz_questions as question
                        on question.id = option.question_id
                    where question.code = 'quiz_ambulance_number'
                      and option.option_code = 'number_998'
                )
            ]::bigint[]
        )
    $$,
    'an incorrect production quiz answer is accepted for feedback without being treated as verified correct'
);

reset role;


select is(
    (
        select count(*)
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
          and achievement.code = 'scenario_learner'
    ),
    0::bigint,
    'an incorrect quiz answer does not award Preparedness Learner'
);


select results_eq(
    $$
        with jeddah as (
            select id
            from public.locations
            where official_code = '0124'
              and is_active
        ),
        local_mission as (
            select id
            from public.preparedness_missions
            where code = 'know_your_local_hazards'
              and is_active
        ),
        relevant_tasks as (
            select task.id
            from public.mission_tasks as task
            join public.resolve_location_hazards(
                (select id from jeddah)
            ) as resolved
                on resolved.hazard_id = task.hazard_id
               and resolved.is_prioritised
            where task.mission_id =
                (select id from local_mission)
              and task.is_active
        )
        select
            (select count(*)::bigint from relevant_tasks),
            (
                select count(*)::bigint
                from public.mission_tasks
                where mission_id =
                    (select id from local_mission)
                  and is_active
            )
    $$,
    $$
        values (4::bigint, 5::bigint)
    $$,
    'Jeddah currently resolves 4 relevant tasks from the 5-task Local Hazards catalogue'
);


set local role authenticated;
set local request.jwt.claim.sub =
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';

update public.profiles
set active_location_id = (
    select id
    from public.locations
    where official_code = '0124'
)
where id =
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';

insert into public.user_mission_task_progress (
    user_id,
    task_id,
    is_completed
)
select
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid,
    task.id,
    true
from public.mission_tasks as task
join public.preparedness_missions as mission
    on mission.id = task.mission_id
join public.resolve_location_hazards(
    (
        select id
        from public.locations
        where official_code = '0124'
    )
) as resolved
    on resolved.hazard_id = task.hazard_id
   and resolved.is_prioritised
where mission.code = 'know_your_local_hazards'
  and task.is_active;

reset role;


select results_eq(
    $$
        select achievement.code
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
        order by achievement.code
    $$,
    $$
        values
            ('first_preparedness_step'::text),
            ('local_hazards_mission_complete'::text)
    $$,
    'completing only the 4 Jeddah-relevant hazard tasks awards the adaptive Local Hazards milestone without requiring all 5 catalogue tasks'
);


select results_eq(
    $$
        select
            count(*)::bigint,
            count(*) filter (
                where task.code = 'local_hazard_dust'
            )::bigint
        from public.user_mission_task_progress as progress
        join public.mission_tasks as task
            on task.id = progress.task_id
        join public.preparedness_missions as mission
            on mission.id = task.mission_id
        where progress.user_id =
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
          and progress.is_completed
          and mission.code = 'know_your_local_hazards'
    $$,
    $$
        values (4::bigint, 0::bigint)
    $$,
    'the non-prioritised Jeddah dust task is not required to earn the adaptive mission badge'
);


set local role authenticated;
set local request.jwt.claim.sub =
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';

update public.profiles
set active_location_id = (
    select id
    from public.locations
    where official_code = '0002'
)
where id =
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';

reset role;


select results_eq(
    $$
        select
            count(*) filter (
                where achievement.code =
                    'local_hazards_mission_complete'
            )::bigint,
            count(*)::bigint
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
    $$,
    $$
        values (1::bigint, 2::bigint)
    $$,
    'location-triggered reevaluation remains idempotent and cannot duplicate an existing Local Hazards award'
);


/* ==========================================================================
 * User C: active location is required, and selecting it can award later
 * ========================================================================== */

set local role authenticated;
set local request.jwt.claim.sub =
    'cccccccc-cccc-cccc-cccc-ccccccccccc3';

insert into public.user_mission_task_progress (
    user_id,
    task_id,
    is_completed
)
select
    'cccccccc-cccc-cccc-cccc-ccccccccccc3'::uuid,
    task.id,
    true
from public.mission_tasks as task
join public.preparedness_missions as mission
    on mission.id = task.mission_id
where mission.code = 'know_your_local_hazards'
  and task.is_active;

reset role;


select is(
    (
        select count(*)
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'cccccccc-cccc-cccc-cccc-ccccccccccc3'
          and achievement.code =
              'local_hazards_mission_complete'
    ),
    0::bigint,
    'completing adaptive hazard tasks without an active location does not award the Local Hazards mission badge'
);


set local role authenticated;
set local request.jwt.claim.sub =
    'cccccccc-cccc-cccc-cccc-ccccccccccc3';

update public.profiles
set active_location_id = (
    select id
    from public.locations
    where official_code = '0124'
)
where id =
    'cccccccc-cccc-cccc-cccc-ccccccccccc3';

reset role;


select is(
    (
        select count(*)
        from public.user_achievements as earned
        join public.achievements as achievement
            on achievement.id = earned.achievement_id
        where earned.user_id =
            'cccccccc-cccc-cccc-cccc-ccccccccccc3'
          and achievement.code =
              'local_hazards_mission_complete'
    ),
    1::bigint,
    'setting an active location later reevaluates existing progress and awards the adaptive mission badge when eligible'
);


/* ==========================================================================
 * Owner isolation remains intact for automatically awarded rows
 * ========================================================================== */

set local role authenticated;
set local request.jwt.claim.sub =
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

select is(
    (
        select count(*)
        from public.user_achievements
        where user_id =
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
    ),
    0::bigint,
    'User A cannot read automatically awarded achievement rows belonging to User B'
);

reset role;


select * from finish();

rollback;
