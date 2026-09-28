/*
 * Extend achievement criteria so a badge can target completion of one
 * specific preparedness mission.
*/

begin;

alter table public.achievements
    add column target_mission_id bigint
        references public.preparedness_missions(id)
        on delete restrict;

alter table public.achievements
    drop constraint achievements_criterion_type_valid;

alter table public.achievements
    add constraint achievements_criterion_type_valid
        check (
            criterion_type in (
                'tasks_completed',
                'quiz_questions_correct',
                'preparedness_points',
                'mission_completed'
            )
        );

alter table public.achievements
    add constraint achievements_target_mission_consistent
        check (
            (
                criterion_type = 'mission_completed'
                and target_mission_id is not null
                and threshold = 1
            )
            or
            (
                criterion_type <> 'mission_completed'
                and target_mission_id is null
            )
        );

create index achievements_target_mission_id_idx
    on public.achievements (target_mission_id)
    where target_mission_id is not null;

do $$
begin
    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'achievements'
          and column_name = 'target_mission_id'
    ) then
        raise exception 'Achievement target_mission_id column was not created';
    end if;

    if exists (
        select 1
        from public.achievements
        where (
            criterion_type = 'mission_completed'
            and (target_mission_id is null or threshold <> 1)
        )
        or (
            criterion_type <> 'mission_completed'
            and target_mission_id is not null
        )
    ) then
        raise exception 'Existing achievement rows violate mission-target consistency';
    end if;
end;
$$;

commit;
