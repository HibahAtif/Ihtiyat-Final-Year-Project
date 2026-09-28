/*
 * Add the trusted Ihtiyat preparedness achievement-award engine.
 *
 * Achievement definitions already exist in public.achievements. This
 * migration adds controlled database behaviour that derives eligibility from
 * canonical task progress, verified quiz progress and the user's active
 * curated location.
 *
 * Ordinary application clients still cannot insert into user_achievements.
 * Awards are created only by SECURITY DEFINER trigger logic after canonical
 * progress changes.
 *
 * Earned achievements are historical milestones. Once earned, they are not
 * revoked if a user later unchecks a task or changes active location.
*/

begin;

create or replace function private.user_has_completed_preparedness_mission(
    p_user_id uuid,
    p_mission_id bigint
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_mission_scope text;
    v_location_id bigint;
    v_is_complete boolean := false;
begin
    if p_user_id is null or p_mission_id is null then
        return false;
    end if;

    select mission.mission_scope
    into v_mission_scope
    from public.preparedness_missions as mission
    where mission.id = p_mission_id
      and mission.is_active;

    if not found then
        return false;
    end if;

    if v_mission_scope = 'national' then
        with relevant_tasks as (
            select task.id
            from public.mission_tasks as task
            left join public.hazards as hazard
                on hazard.id = task.hazard_id
            where task.mission_id = p_mission_id
              and task.is_active
              and (
                  task.hazard_id is null
                  or (
                      hazard.id is not null
                      and hazard.is_active
                  )
              )
        )
        select
            count(*) > 0
            and coalesce(
                bool_and(coalesce(progress.is_completed, false)),
                false
            )
        into v_is_complete
        from relevant_tasks as task
        left join public.user_mission_task_progress as progress
            on progress.user_id = p_user_id
           and progress.task_id = task.id;

        return coalesce(v_is_complete, false);
    end if;

    if v_mission_scope = 'adaptive' then
        select profile.active_location_id
        into v_location_id
        from public.profiles as profile
        where profile.id = p_user_id;

        if v_location_id is null then
            return false;
        end if;

        if not exists (
            select 1
            from public.locations as location
            where location.id = v_location_id
              and location.is_active
        ) then
            return false;
        end if;

        with prioritised_hazards as (
            select resolved.hazard_id
            from public.resolve_location_hazards(v_location_id) as resolved
            where resolved.is_prioritised
        ),
        relevant_tasks as (
            select task.id
            from public.mission_tasks as task
            left join public.hazards as hazard
                on hazard.id = task.hazard_id
            where task.mission_id = p_mission_id
              and task.is_active
              and (
                  task.hazard_id is null
                  or (
                      hazard.id is not null
                      and hazard.is_active
                      and exists (
                          select 1
                          from prioritised_hazards
                          where prioritised_hazards.hazard_id = task.hazard_id
                      )
                  )
              )
        )
        select
            count(*) > 0
            and coalesce(
                bool_and(coalesce(progress.is_completed, false)),
                false
            )
        into v_is_complete
        from relevant_tasks as task
        left join public.user_mission_task_progress as progress
            on progress.user_id = p_user_id
           and progress.task_id = task.id;

        return coalesce(v_is_complete, false);
    end if;

    return false;
end;
$$;

revoke execute
    on function private.user_has_completed_preparedness_mission(uuid, bigint)
    from public, anon, authenticated;


create or replace function private.evaluate_preparedness_achievements(
    p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_completed_task_count bigint := 0;
    v_preparedness_points bigint := 0;
    v_correct_quiz_count bigint := 0;
begin
    if p_user_id is null then
        return;
    end if;

    if not exists (
        select 1
        from auth.users as auth_user
        where auth_user.id = p_user_id
    ) then
        return;
    end if;

    select
        count(*),
        coalesce(sum(task.points), 0)
    into
        v_completed_task_count,
        v_preparedness_points
    from public.user_mission_task_progress as progress
    join public.mission_tasks as task
        on task.id = progress.task_id
    join public.preparedness_missions as mission
        on mission.id = task.mission_id
    left join public.hazards as hazard
        on hazard.id = task.hazard_id
    where progress.user_id = p_user_id
      and progress.is_completed
      and task.is_active
      and mission.is_active
      and (
          task.hazard_id is null
          or (
              hazard.id is not null
              and hazard.is_active
          )
      );

    select count(*)
    into v_correct_quiz_count
    from public.user_quiz_progress as progress
    join public.quiz_questions as question
        on question.id = progress.question_id
    join public.preparedness_missions as mission
        on mission.id = question.mission_id
    left join public.hazards as hazard
        on hazard.id = question.hazard_id
    where progress.user_id = p_user_id
      and progress.has_correct_answer
      and question.is_active
      and mission.is_active
      and (
          question.hazard_id is null
          or (
              hazard.id is not null
              and hazard.is_active
          )
      );

    insert into public.user_achievements (
        user_id,
        achievement_id
    )
    select
        p_user_id,
        achievement.id
    from public.achievements as achievement
    where achievement.is_active
      and (
          (
              achievement.criterion_type = 'tasks_completed'
              and v_completed_task_count >= achievement.threshold
          )
          or
          (
              achievement.criterion_type = 'quiz_questions_correct'
              and v_correct_quiz_count >= achievement.threshold
          )
          or
          (
              achievement.criterion_type = 'preparedness_points'
              and v_preparedness_points >= achievement.threshold
          )
          or
          (
              achievement.criterion_type = 'mission_completed'
              and private.user_has_completed_preparedness_mission(
                  p_user_id,
                  achievement.target_mission_id
              )
          )
      )
    on conflict on constraint user_achievements_pkey
    do nothing;
end;
$$;

revoke execute
    on function private.evaluate_preparedness_achievements(uuid)
    from public, anon, authenticated;


create or replace function private.award_achievements_after_task_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        if new.is_completed then
            perform private.evaluate_preparedness_achievements(new.user_id);
        end if;
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if new.is_completed
           and old.is_completed is distinct from new.is_completed
        then
            perform private.evaluate_preparedness_achievements(new.user_id);
        end if;
        return new;
    end if;

    return new;
end;
$$;


create or replace function private.award_achievements_after_quiz_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        if new.has_correct_answer then
            perform private.evaluate_preparedness_achievements(new.user_id);
        end if;
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if new.has_correct_answer
           and old.has_correct_answer is distinct from new.has_correct_answer
        then
            perform private.evaluate_preparedness_achievements(new.user_id);
        end if;
        return new;
    end if;

    return new;
end;
$$;


create or replace function private.award_achievements_after_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if tg_op = 'INSERT' then
        if new.active_location_id is not null then
            perform private.evaluate_preparedness_achievements(new.id);
        end if;
        return new;
    end if;

    if tg_op = 'UPDATE' then
        if old.active_location_id is distinct from new.active_location_id then
            perform private.evaluate_preparedness_achievements(new.id);
        end if;
        return new;
    end if;

    return new;
end;
$$;

revoke execute
    on function private.award_achievements_after_task_progress()
    from public, anon, authenticated;

revoke execute
    on function private.award_achievements_after_quiz_progress()
    from public, anon, authenticated;

revoke execute
    on function private.award_achievements_after_profile_change()
    from public, anon, authenticated;


create trigger on_task_progress_award_achievements
    after insert or update
    on public.user_mission_task_progress
    for each row
    execute function private.award_achievements_after_task_progress();

create trigger on_quiz_progress_award_achievements
    after insert or update
    on public.user_quiz_progress
    for each row
    execute function private.award_achievements_after_quiz_progress();

create trigger on_profile_change_award_achievements
    after insert or update
    on public.profiles
    for each row
    execute function private.award_achievements_after_profile_change();


do $$
declare
    v_user_id uuid;
begin
    for v_user_id in
        select auth_user.id
        from auth.users as auth_user
        order by auth_user.id
    loop
        perform private.evaluate_preparedness_achievements(v_user_id);
    end loop;
end;
$$;


do $$
begin
    if (
        select count(*)
        from public.achievements
        where code in (
            'first_preparedness_step',
            'preparedness_starter',
            'scenario_learner',
            'preparedness_100',
            'first_aid_mission_complete',
            'local_hazards_mission_complete'
        )
          and is_active
    ) <> 6 then
        raise exception
            'Preparedness achievement award engine requires all 6 active V1 definitions';
    end if;

    if (
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
                  and trigger_row.tgname = 'on_task_progress_award_achievements'
              )
              or
              (
                  table_row.relname = 'user_quiz_progress'
                  and trigger_row.tgname = 'on_quiz_progress_award_achievements'
              )
              or
              (
                  table_row.relname = 'profiles'
                  and trigger_row.tgname = 'on_profile_change_award_achievements'
              )
          )
    ) <> 3 then
        raise exception
            'Preparedness achievement award triggers were not created as expected';
    end if;

    if has_function_privilege(
        'anon',
        'private.evaluate_preparedness_achievements(uuid)',
        'EXECUTE'
    )
    or has_function_privilege(
        'authenticated',
        'private.evaluate_preparedness_achievements(uuid)',
        'EXECUTE'
    ) then
        raise exception
            'Application roles must not execute the trusted achievement evaluator directly';
    end if;
end;
$$;

comment on function
    private.user_has_completed_preparedness_mission(uuid, bigint)
is
    'Returns whether a user currently satisfies a mission-completion milestone. Adaptive missions use the user active location and the canonical location-hazard resolver.';

comment on function
    private.evaluate_preparedness_achievements(uuid)
is
    'Awards active preparedness achievements from canonical task progress, verified quiz progress and mission completion. Awards are idempotent and are not revoked after later progress decreases.';

commit;
