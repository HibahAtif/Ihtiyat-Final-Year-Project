


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "private"."award_achievements_after_profile_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."award_achievements_after_profile_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."award_achievements_after_quiz_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."award_achievements_after_quiz_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."award_achievements_after_task_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."award_achievements_after_task_progress"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."evaluate_preparedness_achievements"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."evaluate_preparedness_achievements"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "private"."evaluate_preparedness_achievements"("p_user_id" "uuid") IS 'Awards active preparedness achievements from canonical task progress, verified quiz progress and mission completion. Awards are idempotent and are not revoked after later progress decreases.';



CREATE OR REPLACE FUNCTION "private"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
	insert into public.profiles (id)
	values (new.id);

	return new;
end;
$$;


ALTER FUNCTION "private"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_profile_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
	new.updated_at = now();

	return new;
end;
$$;


ALTER FUNCTION "private"."set_profile_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_task_progress_timestamps"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
	new.updated_at = now();

	if new.is_completed then
		if tg_op = 'INSERT'
			or old.is_completed = false
			or new.completed_at is null
		then
			new.completed_at = now();
		end if;
	else
		new.completed_at = null;
	end if;

	return new;
end;
$$;


ALTER FUNCTION "private"."set_task_progress_timestamps"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
	new.updated_at = now();

	return new;
end;
$$;


ALTER FUNCTION "private"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."user_has_completed_preparedness_mission"("p_user_id" "uuid", "p_mission_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."user_has_completed_preparedness_mission"("p_user_id" "uuid", "p_mission_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "private"."user_has_completed_preparedness_mission"("p_user_id" "uuid", "p_mission_id" bigint) IS 'Returns whether a user currently satisfies a mission-completion milestone. Adaptive missions use the user active location and the canonical location-hazard resolver.';



CREATE OR REPLACE FUNCTION "public"."resolve_location_hazards"("p_location_id" bigint) RETURNS TABLE("hazard_id" bigint, "hazard_code" "text", "hazard_name_en" "text", "hazard_name_ar" "text", "classification" "text", "hazard_sort_order" smallint, "is_prioritised" boolean, "relevance_rank" smallint, "matched_location_id" bigint, "matched_location_code" "text", "matched_location_type" "text", "matched_location_name_en" "text", "matched_location_name_ar" "text", "hierarchy_distance" integer)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."resolve_location_hazards"("p_location_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_location_hazards"("p_location_id" bigint) IS 'Resolves hazards using the nearest available Saudi location first, then falls back to parent locations. Relevance rank is used to prioritise preparedness content and does not represent alert severity, scientific risk or probability.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_quiz_answer"("p_question_id" bigint, "p_option_ids" bigint[]) RETURNS TABLE("question_id" bigint, "is_correct" boolean, "progress_recorded" boolean, "has_correct_answer" boolean, "attempt_count" smallint, "first_attempted_at" timestamp with time zone, "last_attempted_at" timestamp with time zone, "explanation_en" "text", "explanation_ar" "text", "correct_option_ids" bigint[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
	v_user_id uuid;
	v_question_type text;
	v_explanation_en text;
	v_explanation_ar text;
	v_selected_option_count integer;
	v_distinct_selected_option_count integer;
	v_valid_selected_option_count integer;
	v_total_option_count integer;
	v_correct_option_count integer;
	v_selected_correct_option_count integer;
	v_correct_option_ids bigint[];
	v_is_correct boolean;
	v_now timestamptz := now();
	v_has_correct_answer boolean;
	v_attempt_count smallint;
	v_first_attempted_at timestamptz;
	v_last_attempted_at timestamptz;
begin
	v_user_id := (select auth.uid());

	select
		q.question_type,
		q.explanation_en,
		q.explanation_ar
	into
		v_question_type,
		v_explanation_en,
		v_explanation_ar
	from public.quiz_questions as q
	join public.preparedness_missions as m
		on m.id = q.mission_id
	left join public.hazards as h
		on h.id = q.hazard_id
	where q.id = p_question_id
		and q.is_active
		and m.is_active
		and (
			q.hazard_id is null
			or h.is_active
		);

	if not found then
		raise exception using
			errcode = '22023',
			message = 'Quiz question is unavailable.';
	end if;

	if p_option_ids is null
		or cardinality(p_option_ids) = 0
	then
		raise exception using
			errcode = '22023',
			message = 'At least one quiz option must be submitted.';
	end if;

	if exists (
		select 1
		from unnest(p_option_ids) as selected(option_id)
		where selected.option_id is null
	) then
		raise exception using
			errcode = '22023',
			message = 'Quiz option identifiers cannot contain NULL values.';
	end if;

	select
		count(*),
		count(distinct selected.option_id)
	into
		v_selected_option_count,
		v_distinct_selected_option_count
	from unnest(p_option_ids) as selected(option_id);

	if v_selected_option_count <> v_distinct_selected_option_count then
		raise exception using
			errcode = '22023',
			message = 'Duplicate quiz option identifiers are not allowed.';
	end if;

	select count(*)
	into v_valid_selected_option_count
	from public.quiz_options as qo
	where qo.question_id = p_question_id
		and qo.id = any(p_option_ids);

	if v_valid_selected_option_count <> v_selected_option_count then
		raise exception using
			errcode = '22023',
			message = 'Every submitted quiz option must belong to the selected question.';
	end if;

	select
		count(*),
		count(*) filter (where qo.is_correct),
		array_agg(qo.id order by qo.id)
			filter (where qo.is_correct)
	into
		v_total_option_count,
		v_correct_option_count,
		v_correct_option_ids
	from public.quiz_options as qo
	where qo.question_id = p_question_id;

	if v_total_option_count < 2 then
		raise exception using
			errcode = '23514',
			message = 'Quiz question configuration requires at least two options.';
	end if;

	if v_question_type = 'single_select'
		and v_correct_option_count <> 1
	then
		raise exception using
			errcode = '23514',
			message = 'Single-select quiz questions require exactly one correct option.';
	end if;

	if v_question_type = 'multi_select'
		and (
			v_correct_option_count < 1
			or v_correct_option_count >= v_total_option_count
		)
	then
		raise exception using
			errcode = '23514',
			message = 'Multi-select quiz questions require at least one correct and one incorrect option.';
	end if;

	if v_question_type = 'single_select'
		and v_selected_option_count <> 1
	then
		raise exception using
			errcode = '22023',
			message = 'Single-select quiz questions accept exactly one submitted option.';
	end if;

	select count(*)
	into v_selected_correct_option_count
	from public.quiz_options as qo
	where qo.question_id = p_question_id
		and qo.is_correct
		and qo.id = any(p_option_ids);

	v_is_correct :=
		v_selected_option_count = v_correct_option_count
		and v_selected_correct_option_count = v_correct_option_count;

	if v_user_id is not null then
		insert into public.user_quiz_progress as progress (
			user_id,
			question_id,
			has_correct_answer,
			attempt_count,
			first_attempted_at,
			last_attempted_at
		)
		values (
			v_user_id,
			p_question_id,
			v_is_correct,
			1,
			v_now,
			v_now
		)
		on conflict on constraint user_quiz_progress_pkey
		do update
		set
			has_correct_answer =
				progress.has_correct_answer
				or excluded.has_correct_answer,
			attempt_count =
				(progress.attempt_count + 1)::smallint,
			first_attempted_at =
				coalesce(
					progress.first_attempted_at,
					excluded.first_attempted_at
				),
			last_attempted_at = excluded.last_attempted_at
		returning
			progress.has_correct_answer,
			progress.attempt_count,
			progress.first_attempted_at,
			progress.last_attempted_at
		into
			v_has_correct_answer,
			v_attempt_count,
			v_first_attempted_at,
			v_last_attempted_at;
	end if;

	return query
	select
		p_question_id,
		v_is_correct,
		v_user_id is not null,
		v_has_correct_answer,
		v_attempt_count,
		v_first_attempted_at,
		v_last_attempted_at,
		v_explanation_en,
		v_explanation_ar,
		v_correct_option_ids;
end;
$$;


ALTER FUNCTION "public"."submit_quiz_answer"("p_question_id" bigint, "p_option_ids" bigint[]) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."achievements" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text" NOT NULL,
    "description_ar" "text" NOT NULL,
    "criterion_type" "text" NOT NULL,
    "threshold" smallint NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_mission_id" bigint,
    CONSTRAINT "achievements_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "achievements_criterion_type_valid" CHECK (("criterion_type" = ANY (ARRAY['tasks_completed'::"text", 'quiz_questions_correct'::"text", 'preparedness_points'::"text", 'mission_completed'::"text"]))),
    CONSTRAINT "achievements_description_ar_length" CHECK ((("char_length"("btrim"("description_ar")) >= 1) AND ("char_length"("btrim"("description_ar")) <= 1000))),
    CONSTRAINT "achievements_description_en_length" CHECK ((("char_length"("btrim"("description_en")) >= 1) AND ("char_length"("btrim"("description_en")) <= 1000))),
    CONSTRAINT "achievements_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "achievements_target_mission_consistent" CHECK (((("criterion_type" = 'mission_completed'::"text") AND ("target_mission_id" IS NOT NULL) AND ("threshold" = 1)) OR (("criterion_type" <> 'mission_completed'::"text") AND ("target_mission_id" IS NULL)))),
    CONSTRAINT "achievements_threshold_positive" CHECK (("threshold" > 0)),
    CONSTRAINT "achievements_title_ar_length" CHECK ((("char_length"("btrim"("title_ar")) >= 1) AND ("char_length"("btrim"("title_ar")) <= 120))),
    CONSTRAINT "achievements_title_en_length" CHECK ((("char_length"("btrim"("title_en")) >= 1) AND ("char_length"("btrim"("title_en")) <= 120)))
);


ALTER TABLE "public"."achievements" OWNER TO "postgres";


ALTER TABLE "public"."achievements" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."achievements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."action_rules" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "action_id" bigint NOT NULL,
    "hazard_id" bigint NOT NULL,
    "location_id" bigint,
    "linked_task_id" bigint,
    "min_severity" smallint DEFAULT 1 NOT NULL,
    "base_priority" integer DEFAULT 0 NOT NULL,
    "incomplete_task_boost" integer DEFAULT 0 NOT NULL,
    "safety_override" integer DEFAULT 0 NOT NULL,
    "safety_override_min_severity" smallint,
    "min_children_count" smallint,
    "min_older_adults_count" smallint,
    "reason_en" "text" NOT NULL,
    "reason_ar" "text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "action_rules_base_priority_non_negative" CHECK (("base_priority" >= 0)),
    CONSTRAINT "action_rules_children_threshold_valid" CHECK ((("min_children_count" IS NULL) OR (("min_children_count" >= 1) AND ("min_children_count" <= 25)))),
    CONSTRAINT "action_rules_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "action_rules_incomplete_task_boost_non_negative" CHECK (("incomplete_task_boost" >= 0)),
    CONSTRAINT "action_rules_min_severity_valid" CHECK ((("min_severity" >= 1) AND ("min_severity" <= 3))),
    CONSTRAINT "action_rules_older_adults_threshold_valid" CHECK ((("min_older_adults_count" IS NULL) OR (("min_older_adults_count" >= 1) AND ("min_older_adults_count" <= 25)))),
    CONSTRAINT "action_rules_override_min_severity_valid" CHECK ((("safety_override_min_severity" IS NULL) OR (("safety_override_min_severity" >= 1) AND ("safety_override_min_severity" <= 3)))),
    CONSTRAINT "action_rules_override_threshold_consistent" CHECK (((("safety_override" = 0) AND ("safety_override_min_severity" IS NULL)) OR (("safety_override" > 0) AND ("safety_override_min_severity" IS NOT NULL)))),
    CONSTRAINT "action_rules_reason_ar_length" CHECK ((("char_length"("btrim"("reason_ar")) >= 1) AND ("char_length"("btrim"("reason_ar")) <= 1500))),
    CONSTRAINT "action_rules_reason_en_length" CHECK ((("char_length"("btrim"("reason_en")) >= 1) AND ("char_length"("btrim"("reason_en")) <= 1500))),
    CONSTRAINT "action_rules_safety_override_non_negative" CHECK (("safety_override" >= 0)),
    CONSTRAINT "action_rules_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "action_rules_task_boost_requires_task" CHECK ((("linked_task_id" IS NOT NULL) OR ("incomplete_task_boost" = 0)))
);


ALTER TABLE "public"."action_rules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."action_rules"."base_priority" IS 'Author-set deterministic ranking priority. It is not a statistical probability or scientific risk score.';



COMMENT ON COLUMN "public"."action_rules"."incomplete_task_boost" IS 'Additional deterministic score applied while linked_task_id remains incomplete. The current final-project model uses task completion as a preparedness-state input.';



COMMENT ON COLUMN "public"."action_rules"."safety_override" IS 'Explicit author-set safety priority applied when current severity reaches safety_override_min_severity.';



COMMENT ON COLUMN "public"."action_rules"."min_children_count" IS 'Optional household-aware condition. NULL means this rule does not depend on the number of children. Missing user household data is handled as unknown by the application evaluator.';



COMMENT ON COLUMN "public"."action_rules"."min_older_adults_count" IS 'Optional household-aware condition. NULL means this rule does not depend on older-adult count. Missing user household data is handled as unknown by the application evaluator.';



ALTER TABLE "public"."action_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."action_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."actions" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "instruction_en" "text" NOT NULL,
    "instruction_ar" "text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "actions_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "actions_instruction_ar_length" CHECK ((("char_length"("btrim"("instruction_ar")) >= 1) AND ("char_length"("btrim"("instruction_ar")) <= 2500))),
    CONSTRAINT "actions_instruction_en_length" CHECK ((("char_length"("btrim"("instruction_en")) >= 1) AND ("char_length"("btrim"("instruction_en")) <= 2500))),
    CONSTRAINT "actions_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "actions_title_ar_length" CHECK ((("char_length"("btrim"("title_ar")) >= 1) AND ("char_length"("btrim"("title_ar")) <= 180))),
    CONSTRAINT "actions_title_en_length" CHECK ((("char_length"("btrim"("title_en")) >= 1) AND ("char_length"("btrim"("title_en")) <= 180)))
);


ALTER TABLE "public"."actions" OWNER TO "postgres";


ALTER TABLE "public"."actions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."actions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."alert_locations" (
    "alert_id" bigint NOT NULL,
    "location_id" bigint NOT NULL
);


ALTER TABLE "public"."alert_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alerts" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "hazard_id" bigint NOT NULL,
    "origin_type" "text" NOT NULL,
    "external_alert_id" "text",
    "severity" smallint NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "message_en" "text" NOT NULL,
    "message_ar" "text" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "published_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "publication_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "alerts_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "alerts_external_id_length" CHECK ((("external_alert_id" IS NULL) OR (("char_length"("btrim"("external_alert_id")) >= 1) AND ("char_length"("btrim"("external_alert_id")) <= 300)))),
    CONSTRAINT "alerts_message_ar_length" CHECK ((("char_length"("btrim"("message_ar")) >= 1) AND ("char_length"("btrim"("message_ar")) <= 3000))),
    CONSTRAINT "alerts_message_en_length" CHECK ((("char_length"("btrim"("message_en")) >= 1) AND ("char_length"("btrim"("message_en")) <= 3000))),
    CONSTRAINT "alerts_origin_type_valid" CHECK (("origin_type" = ANY (ARRAY['simulated'::"text", 'ihtiyat_managed'::"text", 'official_external'::"text"]))),
    CONSTRAINT "alerts_publication_status_valid" CHECK (("publication_status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'retired'::"text"]))),
    CONSTRAINT "alerts_published_at_state" CHECK (((("publication_status" = 'draft'::"text") AND ("published_at" IS NULL)) OR (("publication_status" = ANY (ARRAY['published'::"text", 'retired'::"text"])) AND ("published_at" IS NOT NULL)))),
    CONSTRAINT "alerts_severity_valid" CHECK ((("severity" >= 1) AND ("severity" <= 3))),
    CONSTRAINT "alerts_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "alerts_time_window_valid" CHECK (("expires_at" > "starts_at")),
    CONSTRAINT "alerts_title_ar_length" CHECK ((("char_length"("btrim"("title_ar")) >= 1) AND ("char_length"("btrim"("title_ar")) <= 180))),
    CONSTRAINT "alerts_title_en_length" CHECK ((("char_length"("btrim"("title_en")) >= 1) AND ("char_length"("btrim"("title_en")) <= 180)))
);


ALTER TABLE "public"."alerts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."alerts"."origin_type" IS 'Alert provenance: simulated, Ihtiyat-managed, or an authorised future external source. Simulated alerts must be labelled clearly in the client.';



COMMENT ON COLUMN "public"."alerts"."severity" IS 'Ihtiyat deterministic scenario severity from 1 to 3. It is not an independently issued official warning classification.';



ALTER TABLE "public"."alerts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."alerts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."hazards" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "classification" "text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hazards_classification_valid" CHECK (("classification" = ANY (ARRAY['core'::"text", 'supported_regional'::"text", 'resource_supported'::"text"]))),
    CONSTRAINT "hazards_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "hazards_name_ar_length" CHECK ((("char_length"("btrim"("name_ar")) >= 1) AND ("char_length"("btrim"("name_ar")) <= 120))),
    CONSTRAINT "hazards_name_en_length" CHECK ((("char_length"("btrim"("name_en")) >= 1) AND ("char_length"("btrim"("name_en")) <= 120))),
    CONSTRAINT "hazards_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."hazards" OWNER TO "postgres";


ALTER TABLE "public"."hazards" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."hazards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."location_hazard_profiles" (
    "location_id" bigint NOT NULL,
    "hazard_id" bigint NOT NULL,
    "relevance_rank" smallint NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "location_hazard_profiles_relevance_rank_valid" CHECK ((("relevance_rank" >= 1) AND ("relevance_rank" <= 3)))
);


ALTER TABLE "public"."location_hazard_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."location_hazard_profiles"."relevance_rank" IS 'Preparedness-content relevance only. This is not alert severity, hazard probability, or a scientific risk score.';



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" bigint NOT NULL,
    "parent_id" bigint,
    "official_code" "text" NOT NULL,
    "location_type" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "locations_name_ar" CHECK (((("char_length"(TRIM(BOTH FROM "name_ar")) >= 1) AND ("char_length"(TRIM(BOTH FROM "name_ar")) <= 120)) AND ("name_ar" = TRIM(BOTH FROM "name_ar")))),
    CONSTRAINT "locations_name_en" CHECK (((("char_length"(TRIM(BOTH FROM "name_en")) >= 1) AND ("char_length"(TRIM(BOTH FROM "name_en")) <= 120)) AND ("name_en" = TRIM(BOTH FROM "name_en")))),
    CONSTRAINT "locations_not_own_parent" CHECK ((("parent_id" IS NULL) OR ("parent_id" <> "id"))),
    CONSTRAINT "locations_official_code_format" CHECK (("official_code" ~ '^[0-9]{4}$'::"text")),
    CONSTRAINT "locations_parent_requirement" CHECK (((("location_type" = 'region'::"text") AND ("parent_id" IS NULL)) OR (("location_type" <> 'region'::"text") AND ("parent_id" IS NOT NULL)))),
    CONSTRAINT "locations_type" CHECK (("location_type" = ANY (ARRAY['region'::"text", 'emirate_headquarters'::"text", 'governorate'::"text", 'administrative_centre'::"text"])))
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


ALTER TABLE "public"."locations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."locations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."mission_task_resources" (
    "task_id" bigint NOT NULL,
    "resource_id" bigint NOT NULL,
    "link_role" "text" DEFAULT 'supporting'::"text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mission_task_resources_link_role_valid" CHECK (("link_role" = ANY (ARRAY['primary'::"text", 'supporting'::"text"]))),
    CONSTRAINT "mission_task_resources_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."mission_task_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mission_tasks" (
    "id" bigint NOT NULL,
    "mission_id" bigint NOT NULL,
    "hazard_id" bigint,
    "code" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "detail_en" "text",
    "detail_ar" "text",
    "points" smallint DEFAULT 10 NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mission_tasks_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "mission_tasks_detail_ar_length" CHECK ((("detail_ar" IS NULL) OR (("char_length"("btrim"("detail_ar")) >= 1) AND ("char_length"("btrim"("detail_ar")) <= 1500)))),
    CONSTRAINT "mission_tasks_detail_en_length" CHECK ((("detail_en" IS NULL) OR (("char_length"("btrim"("detail_en")) >= 1) AND ("char_length"("btrim"("detail_en")) <= 1500)))),
    CONSTRAINT "mission_tasks_points_valid" CHECK ((("points" >= 1) AND ("points" <= 100))),
    CONSTRAINT "mission_tasks_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "mission_tasks_title_ar_length" CHECK ((("char_length"("btrim"("title_ar")) >= 1) AND ("char_length"("btrim"("title_ar")) <= 180))),
    CONSTRAINT "mission_tasks_title_en_length" CHECK ((("char_length"("btrim"("title_en")) >= 1) AND ("char_length"("btrim"("title_en")) <= 180)))
);


ALTER TABLE "public"."mission_tasks" OWNER TO "postgres";


ALTER TABLE "public"."mission_tasks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."mission_tasks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."personal_emergency_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "relationship_label" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "email" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "personal_emergency_contacts_email" CHECK ((("email" IS NULL) OR ((("char_length"("email") >= 3) AND ("char_length"("email") <= 254)) AND ("email" = TRIM(BOTH FROM "email")) AND ("email" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::"text")))),
    CONSTRAINT "personal_emergency_contacts_name" CHECK (((("char_length"(TRIM(BOTH FROM "name")) >= 1) AND ("char_length"(TRIM(BOTH FROM "name")) <= 80)) AND ("name" = TRIM(BOTH FROM "name")))),
    CONSTRAINT "personal_emergency_contacts_relationship" CHECK (((("char_length"(TRIM(BOTH FROM "relationship_label")) >= 1) AND ("char_length"(TRIM(BOTH FROM "relationship_label")) <= 60)) AND ("relationship_label" = TRIM(BOTH FROM "relationship_label")))),
    CONSTRAINT "personal_emergency_contacts_saudi_phone" CHECK (("phone_number" ~ '^\+966(1[123467][0-9]{7}|5[013456789][0-9]{7})$'::"text"))
);


ALTER TABLE "public"."personal_emergency_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."preparedness_missions" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "description_en" "text" NOT NULL,
    "description_ar" "text" NOT NULL,
    "mission_scope" "text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "preparedness_missions_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "preparedness_missions_description_ar_length" CHECK ((("char_length"("btrim"("description_ar")) >= 1) AND ("char_length"("btrim"("description_ar")) <= 1000))),
    CONSTRAINT "preparedness_missions_description_en_length" CHECK ((("char_length"("btrim"("description_en")) >= 1) AND ("char_length"("btrim"("description_en")) <= 1000))),
    CONSTRAINT "preparedness_missions_scope_valid" CHECK (("mission_scope" = ANY (ARRAY['national'::"text", 'adaptive'::"text"]))),
    CONSTRAINT "preparedness_missions_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "preparedness_missions_title_ar_length" CHECK ((("char_length"("btrim"("title_ar")) >= 1) AND ("char_length"("btrim"("title_ar")) <= 120))),
    CONSTRAINT "preparedness_missions_title_en_length" CHECK ((("char_length"("btrim"("title_en")) >= 1) AND ("char_length"("btrim"("title_en")) <= 120)))
);


ALTER TABLE "public"."preparedness_missions" OWNER TO "postgres";


ALTER TABLE "public"."preparedness_missions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."preparedness_missions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active_location_id" bigint,
    "preferred_language_code" "text",
    "text_size_preference" "text" DEFAULT 'system'::"text" NOT NULL,
    "children_count" smallint,
    "adults_count" smallint,
    "older_adults_count" smallint,
    "pets_count" smallint,
    CONSTRAINT "profiles_adults_count_range" CHECK ((("adults_count" IS NULL) OR (("adults_count" >= 0) AND ("adults_count" <= 25)))),
    CONSTRAINT "profiles_children_count_range" CHECK ((("children_count" IS NULL) OR (("children_count" >= 0) AND ("children_count" <= 25)))),
    CONSTRAINT "profiles_display_name_length" CHECK ((("display_name" IS NULL) OR (("char_length"(TRIM(BOTH FROM "display_name")) >= 1) AND ("char_length"(TRIM(BOTH FROM "display_name")) <= 80)))),
    CONSTRAINT "profiles_household_completion_state" CHECK (((("children_count" IS NULL) AND ("adults_count" IS NULL) AND ("older_adults_count" IS NULL) AND ("pets_count" IS NULL)) OR (("children_count" IS NOT NULL) AND ("adults_count" IS NOT NULL) AND ("older_adults_count" IS NOT NULL) AND ("pets_count" IS NOT NULL)))),
    CONSTRAINT "profiles_human_household_size" CHECK ((("children_count" IS NULL) OR (((("children_count" + "adults_count") + "older_adults_count") >= 1) AND ((("children_count" + "adults_count") + "older_adults_count") <= 25)))),
    CONSTRAINT "profiles_older_adults_count_range" CHECK ((("older_adults_count" IS NULL) OR (("older_adults_count" >= 0) AND ("older_adults_count" <= 25)))),
    CONSTRAINT "profiles_pets_count_range" CHECK ((("pets_count" IS NULL) OR (("pets_count" >= 0) AND ("pets_count" <= 10)))),
    CONSTRAINT "profiles_text_size_preference" CHECK (("text_size_preference" = ANY (ARRAY['system'::"text", 'large'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_options" (
    "id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "option_code" "text" NOT NULL,
    "text_en" "text" NOT NULL,
    "text_ar" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quiz_options_option_code_format" CHECK (("option_code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "quiz_options_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "quiz_options_text_ar_length" CHECK ((("char_length"("btrim"("text_ar")) >= 1) AND ("char_length"("btrim"("text_ar")) <= 1000))),
    CONSTRAINT "quiz_options_text_en_length" CHECK ((("char_length"("btrim"("text_en")) >= 1) AND ("char_length"("btrim"("text_en")) <= 1000)))
);


ALTER TABLE "public"."quiz_options" OWNER TO "postgres";


ALTER TABLE "public"."quiz_options" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quiz_options_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quiz_question_resources" (
    "question_id" bigint NOT NULL,
    "resource_id" bigint NOT NULL,
    "link_role" "text" DEFAULT 'supporting'::"text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quiz_question_resources_link_role_valid" CHECK (("link_role" = ANY (ARRAY['primary'::"text", 'supporting'::"text"]))),
    CONSTRAINT "quiz_question_resources_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."quiz_question_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" bigint NOT NULL,
    "mission_id" bigint NOT NULL,
    "hazard_id" bigint,
    "code" "text" NOT NULL,
    "question_type" "text" NOT NULL,
    "prompt_en" "text" NOT NULL,
    "prompt_ar" "text" NOT NULL,
    "explanation_en" "text" NOT NULL,
    "explanation_ar" "text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "quiz_questions_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "quiz_questions_explanation_ar_length" CHECK ((("char_length"("btrim"("explanation_ar")) >= 1) AND ("char_length"("btrim"("explanation_ar")) <= 2000))),
    CONSTRAINT "quiz_questions_explanation_en_length" CHECK ((("char_length"("btrim"("explanation_en")) >= 1) AND ("char_length"("btrim"("explanation_en")) <= 2000))),
    CONSTRAINT "quiz_questions_prompt_ar_length" CHECK ((("char_length"("btrim"("prompt_ar")) >= 1) AND ("char_length"("btrim"("prompt_ar")) <= 1000))),
    CONSTRAINT "quiz_questions_prompt_en_length" CHECK ((("char_length"("btrim"("prompt_en")) >= 1) AND ("char_length"("btrim"("prompt_en")) <= 1000))),
    CONSTRAINT "quiz_questions_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "quiz_questions_type_valid" CHECK (("question_type" = ANY (ARRAY['single_select'::"text", 'multi_select'::"text"])))
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


ALTER TABLE "public"."quiz_questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quiz_questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."resource_hazards" (
    "resource_id" bigint NOT NULL,
    "hazard_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resource_hazards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_locations" (
    "resource_id" bigint NOT NULL,
    "location_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resource_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_sources" (
    "id" bigint NOT NULL,
    "resource_id" bigint NOT NULL,
    "publisher_name_en" "text" NOT NULL,
    "publisher_name_ar" "text" NOT NULL,
    "source_title_en" "text",
    "source_title_ar" "text",
    "source_url" "text" NOT NULL,
    "source_language_code" "text",
    "is_official" boolean DEFAULT false NOT NULL,
    "last_checked_on" "date" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "resource_sources_publisher_name_ar_length" CHECK ((("char_length"("btrim"("publisher_name_ar")) >= 1) AND ("char_length"("btrim"("publisher_name_ar")) <= 180))),
    CONSTRAINT "resource_sources_publisher_name_en_length" CHECK ((("char_length"("btrim"("publisher_name_en")) >= 1) AND ("char_length"("btrim"("publisher_name_en")) <= 180))),
    CONSTRAINT "resource_sources_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "resource_sources_source_title_ar_length" CHECK ((("source_title_ar" IS NULL) OR (("char_length"("btrim"("source_title_ar")) >= 1) AND ("char_length"("btrim"("source_title_ar")) <= 300)))),
    CONSTRAINT "resource_sources_source_title_en_length" CHECK ((("source_title_en" IS NULL) OR (("char_length"("btrim"("source_title_en")) >= 1) AND ("char_length"("btrim"("source_title_en")) <= 300)))),
    CONSTRAINT "resource_sources_source_title_present" CHECK ((("source_title_en" IS NOT NULL) OR ("source_title_ar" IS NOT NULL))),
    CONSTRAINT "resource_sources_source_url_valid" CHECK (((("char_length"("btrim"("source_url")) >= 8) AND ("char_length"("btrim"("source_url")) <= 2000)) AND ("source_url" = "btrim"("source_url")) AND ("source_url" ~ '^https://[^[:space:]]+$'::"text")))
);


ALTER TABLE "public"."resource_sources" OWNER TO "postgres";


ALTER TABLE "public"."resource_sources" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."resource_sources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."resource_topic_links" (
    "resource_id" bigint NOT NULL,
    "topic_id" bigint NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "resource_topic_links_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."resource_topic_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_topics" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_ar" "text" NOT NULL,
    "description_en" "text",
    "description_ar" "text",
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "resource_topics_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "resource_topics_description_ar_length" CHECK ((("description_ar" IS NULL) OR (("char_length"("btrim"("description_ar")) >= 1) AND ("char_length"("btrim"("description_ar")) <= 1000)))),
    CONSTRAINT "resource_topics_description_en_length" CHECK ((("description_en" IS NULL) OR (("char_length"("btrim"("description_en")) >= 1) AND ("char_length"("btrim"("description_en")) <= 1000)))),
    CONSTRAINT "resource_topics_name_ar_length" CHECK ((("char_length"("btrim"("name_ar")) >= 1) AND ("char_length"("btrim"("name_ar")) <= 120))),
    CONSTRAINT "resource_topics_name_en_length" CHECK ((("char_length"("btrim"("name_en")) >= 1) AND ("char_length"("btrim"("name_en")) <= 120))),
    CONSTRAINT "resource_topics_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."resource_topics" OWNER TO "postgres";


ALTER TABLE "public"."resource_topics" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."resource_topics_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."safety_resources" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "title_en" "text" NOT NULL,
    "title_ar" "text" NOT NULL,
    "summary_en" "text" NOT NULL,
    "summary_ar" "text" NOT NULL,
    "content_en" "text" NOT NULL,
    "content_ar" "text" NOT NULL,
    "publication_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sort_order" smallint DEFAULT 0 NOT NULL,
    "last_reviewed_on" "date",
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "safety_resources_code_format" CHECK (("code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'::"text")),
    CONSTRAINT "safety_resources_content_ar_length" CHECK ((("char_length"("btrim"("content_ar")) >= 1) AND ("char_length"("btrim"("content_ar")) <= 30000))),
    CONSTRAINT "safety_resources_content_en_length" CHECK ((("char_length"("btrim"("content_en")) >= 1) AND ("char_length"("btrim"("content_en")) <= 30000))),
    CONSTRAINT "safety_resources_publication_status_valid" CHECK (("publication_status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'retired'::"text"]))),
    CONSTRAINT "safety_resources_published_metadata_present" CHECK ((("publication_status" <> 'published'::"text") OR (("last_reviewed_on" IS NOT NULL) AND ("published_at" IS NOT NULL)))),
    CONSTRAINT "safety_resources_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "safety_resources_summary_ar_length" CHECK ((("char_length"("btrim"("summary_ar")) >= 1) AND ("char_length"("btrim"("summary_ar")) <= 1000))),
    CONSTRAINT "safety_resources_summary_en_length" CHECK ((("char_length"("btrim"("summary_en")) >= 1) AND ("char_length"("btrim"("summary_en")) <= 1000))),
    CONSTRAINT "safety_resources_title_ar_length" CHECK ((("char_length"("btrim"("title_ar")) >= 1) AND ("char_length"("btrim"("title_ar")) <= 180))),
    CONSTRAINT "safety_resources_title_en_length" CHECK ((("char_length"("btrim"("title_en")) >= 1) AND ("char_length"("btrim"("title_en")) <= 180)))
);


ALTER TABLE "public"."safety_resources" OWNER TO "postgres";


COMMENT ON COLUMN "public"."safety_resources"."last_reviewed_on" IS 'Date on which the curated Ihtiyat resource was last reviewed against its cited sources.';



ALTER TABLE "public"."safety_resources" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."safety_resources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."supported_languages" (
    "code" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "native_name" "text" NOT NULL,
    "layout_direction" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "supported_languages_code_format" CHECK (((("char_length"("code") >= 2) AND ("char_length"("code") <= 35)) AND ("code" = "lower"("code")) AND ("code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"))),
    CONSTRAINT "supported_languages_layout_direction" CHECK (("layout_direction" = ANY (ARRAY['ltr'::"text", 'rtl'::"text"]))),
    CONSTRAINT "supported_languages_name_en" CHECK (((("char_length"(TRIM(BOTH FROM "name_en")) >= 1) AND ("char_length"(TRIM(BOTH FROM "name_en")) <= 80)) AND ("name_en" = TRIM(BOTH FROM "name_en")))),
    CONSTRAINT "supported_languages_native_name" CHECK (((("char_length"(TRIM(BOTH FROM "native_name")) >= 1) AND ("char_length"(TRIM(BOTH FROM "native_name")) <= 80)) AND ("native_name" = TRIM(BOTH FROM "native_name"))))
);


ALTER TABLE "public"."supported_languages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "user_id" "uuid" NOT NULL,
    "achievement_id" bigint NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_mission_task_progress" (
    "user_id" "uuid" NOT NULL,
    "task_id" bigint NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_mission_task_progress_completion_consistent" CHECK (((("is_completed" = true) AND ("completed_at" IS NOT NULL)) OR (("is_completed" = false) AND ("completed_at" IS NULL))))
);


ALTER TABLE "public"."user_mission_task_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_quiz_progress" (
    "user_id" "uuid" NOT NULL,
    "question_id" bigint NOT NULL,
    "has_correct_answer" boolean DEFAULT false NOT NULL,
    "attempt_count" smallint DEFAULT 0 NOT NULL,
    "first_attempted_at" timestamp with time zone,
    "last_attempted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_quiz_progress_attempt_count_valid" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "user_quiz_progress_state_consistent" CHECK (((("attempt_count" = 0) AND ("has_correct_answer" = false) AND ("first_attempted_at" IS NULL) AND ("last_attempted_at" IS NULL)) OR (("attempt_count" > 0) AND ("first_attempted_at" IS NOT NULL) AND ("last_attempted_at" IS NOT NULL) AND ("first_attempted_at" <= "last_attempted_at"))))
);


ALTER TABLE "public"."user_quiz_progress" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."action_rules"
    ADD CONSTRAINT "action_rules_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."action_rules"
    ADD CONSTRAINT "action_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."actions"
    ADD CONSTRAINT "actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alert_locations"
    ADD CONSTRAINT "alert_locations_pkey" PRIMARY KEY ("alert_id", "location_id");



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hazards"
    ADD CONSTRAINT "hazards_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."hazards"
    ADD CONSTRAINT "hazards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_hazard_profiles"
    ADD CONSTRAINT "location_hazard_profiles_pkey" PRIMARY KEY ("location_id", "hazard_id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_official_code_key" UNIQUE ("official_code");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mission_task_resources"
    ADD CONSTRAINT "mission_task_resources_pkey" PRIMARY KEY ("task_id", "resource_id");



ALTER TABLE ONLY "public"."mission_tasks"
    ADD CONSTRAINT "mission_tasks_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."mission_tasks"
    ADD CONSTRAINT "mission_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_emergency_contacts"
    ADD CONSTRAINT "personal_emergency_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."preparedness_missions"
    ADD CONSTRAINT "preparedness_missions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."preparedness_missions"
    ADD CONSTRAINT "preparedness_missions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_question_option_unique" UNIQUE ("question_id", "option_code");



ALTER TABLE ONLY "public"."quiz_question_resources"
    ADD CONSTRAINT "quiz_question_resources_pkey" PRIMARY KEY ("question_id", "resource_id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_hazards"
    ADD CONSTRAINT "resource_hazards_pkey" PRIMARY KEY ("resource_id", "hazard_id");



ALTER TABLE ONLY "public"."resource_locations"
    ADD CONSTRAINT "resource_locations_pkey" PRIMARY KEY ("resource_id", "location_id");



ALTER TABLE ONLY "public"."resource_sources"
    ADD CONSTRAINT "resource_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_sources"
    ADD CONSTRAINT "resource_sources_resource_url_unique" UNIQUE ("resource_id", "source_url");



ALTER TABLE ONLY "public"."resource_topic_links"
    ADD CONSTRAINT "resource_topic_links_pkey" PRIMARY KEY ("resource_id", "topic_id");



ALTER TABLE ONLY "public"."resource_topics"
    ADD CONSTRAINT "resource_topics_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."resource_topics"
    ADD CONSTRAINT "resource_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."safety_resources"
    ADD CONSTRAINT "safety_resources_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."safety_resources"
    ADD CONSTRAINT "safety_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supported_languages"
    ADD CONSTRAINT "supported_languages_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id", "achievement_id");



ALTER TABLE ONLY "public"."user_mission_task_progress"
    ADD CONSTRAINT "user_mission_task_progress_pkey" PRIMARY KEY ("user_id", "task_id");



ALTER TABLE ONLY "public"."user_quiz_progress"
    ADD CONSTRAINT "user_quiz_progress_pkey" PRIMARY KEY ("user_id", "question_id");



CREATE INDEX "achievements_target_mission_id_idx" ON "public"."achievements" USING "btree" ("target_mission_id") WHERE ("target_mission_id" IS NOT NULL);



CREATE INDEX "action_rules_active_sort_idx" ON "public"."action_rules" USING "btree" ("is_active", "sort_order", "id");



CREATE INDEX "action_rules_hazard_severity_idx" ON "public"."action_rules" USING "btree" ("hazard_id", "min_severity");



CREATE INDEX "action_rules_linked_task_id_idx" ON "public"."action_rules" USING "btree" ("linked_task_id");



CREATE INDEX "action_rules_location_id_idx" ON "public"."action_rules" USING "btree" ("location_id");



CREATE INDEX "actions_active_sort_idx" ON "public"."actions" USING "btree" ("is_active", "sort_order", "id");



CREATE INDEX "alert_locations_location_id_idx" ON "public"."alert_locations" USING "btree" ("location_id");



CREATE UNIQUE INDEX "alerts_external_alert_id_unique_idx" ON "public"."alerts" USING "btree" ("external_alert_id") WHERE ("external_alert_id" IS NOT NULL);



CREATE INDEX "alerts_hazard_id_idx" ON "public"."alerts" USING "btree" ("hazard_id");



CREATE INDEX "alerts_publication_window_idx" ON "public"."alerts" USING "btree" ("publication_status", "starts_at", "expires_at", "sort_order", "id");



CREATE INDEX "location_hazard_profiles_hazard_id_idx" ON "public"."location_hazard_profiles" USING "btree" ("hazard_id");



CREATE UNIQUE INDEX "mission_task_resources_one_primary_idx" ON "public"."mission_task_resources" USING "btree" ("task_id") WHERE ("link_role" = 'primary'::"text");



CREATE INDEX "mission_task_resources_resource_id_idx" ON "public"."mission_task_resources" USING "btree" ("resource_id");



CREATE INDEX "mission_tasks_hazard_id_idx" ON "public"."mission_tasks" USING "btree" ("hazard_id");



CREATE INDEX "mission_tasks_mission_id_idx" ON "public"."mission_tasks" USING "btree" ("mission_id");



CREATE UNIQUE INDEX "personal_emergency_contacts_one_primary_per_user" ON "public"."personal_emergency_contacts" USING "btree" ("user_id") WHERE ("is_primary" = true);



CREATE INDEX "quiz_options_question_id_idx" ON "public"."quiz_options" USING "btree" ("question_id");



CREATE UNIQUE INDEX "quiz_question_resources_one_primary_idx" ON "public"."quiz_question_resources" USING "btree" ("question_id") WHERE ("link_role" = 'primary'::"text");



CREATE INDEX "quiz_question_resources_resource_id_idx" ON "public"."quiz_question_resources" USING "btree" ("resource_id");



CREATE INDEX "quiz_questions_hazard_id_idx" ON "public"."quiz_questions" USING "btree" ("hazard_id");



CREATE INDEX "quiz_questions_mission_id_idx" ON "public"."quiz_questions" USING "btree" ("mission_id");



CREATE INDEX "resource_hazards_hazard_id_idx" ON "public"."resource_hazards" USING "btree" ("hazard_id");



CREATE INDEX "resource_locations_location_id_idx" ON "public"."resource_locations" USING "btree" ("location_id");



CREATE UNIQUE INDEX "resource_topic_links_one_primary_idx" ON "public"."resource_topic_links" USING "btree" ("resource_id") WHERE "is_primary";



CREATE INDEX "resource_topic_links_topic_id_idx" ON "public"."resource_topic_links" USING "btree" ("topic_id");



CREATE INDEX "safety_resources_publication_sort_idx" ON "public"."safety_resources" USING "btree" ("publication_status", "sort_order", "id");



CREATE INDEX "user_achievements_achievement_id_idx" ON "public"."user_achievements" USING "btree" ("achievement_id");



CREATE INDEX "user_mission_task_progress_task_id_idx" ON "public"."user_mission_task_progress" USING "btree" ("task_id");



CREATE INDEX "user_quiz_progress_question_id_idx" ON "public"."user_quiz_progress" USING "btree" ("question_id");



CREATE OR REPLACE TRIGGER "on_action_rule_updated" BEFORE UPDATE ON "public"."action_rules" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_action_updated" BEFORE UPDATE ON "public"."actions" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_alert_updated" BEFORE UPDATE ON "public"."alerts" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_personal_emergency_contact_updated" BEFORE UPDATE ON "public"."personal_emergency_contacts" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_profile_change_award_achievements" AFTER INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."award_achievements_after_profile_change"();



CREATE OR REPLACE TRIGGER "on_profile_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."set_profile_updated_at"();



CREATE OR REPLACE TRIGGER "on_quiz_progress_award_achievements" AFTER INSERT OR UPDATE ON "public"."user_quiz_progress" FOR EACH ROW EXECUTE FUNCTION "private"."award_achievements_after_quiz_progress"();



CREATE OR REPLACE TRIGGER "on_resource_source_updated" BEFORE UPDATE ON "public"."resource_sources" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_resource_topic_updated" BEFORE UPDATE ON "public"."resource_topics" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_safety_resource_updated" BEFORE UPDATE ON "public"."safety_resources" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_task_progress_award_achievements" AFTER INSERT OR UPDATE ON "public"."user_mission_task_progress" FOR EACH ROW EXECUTE FUNCTION "private"."award_achievements_after_task_progress"();



CREATE OR REPLACE TRIGGER "on_user_mission_task_progress_changed" BEFORE INSERT OR UPDATE ON "public"."user_mission_task_progress" FOR EACH ROW EXECUTE FUNCTION "private"."set_task_progress_timestamps"();



CREATE OR REPLACE TRIGGER "on_user_quiz_progress_updated" BEFORE UPDATE ON "public"."user_quiz_progress" FOR EACH ROW EXECUTE FUNCTION "private"."set_updated_at"();



ALTER TABLE ONLY "public"."achievements"
    ADD CONSTRAINT "achievements_target_mission_id_fkey" FOREIGN KEY ("target_mission_id") REFERENCES "public"."preparedness_missions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."action_rules"
    ADD CONSTRAINT "action_rules_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_rules"
    ADD CONSTRAINT "action_rules_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."action_rules"
    ADD CONSTRAINT "action_rules_linked_task_id_fkey" FOREIGN KEY ("linked_task_id") REFERENCES "public"."mission_tasks"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."action_rules"
    ADD CONSTRAINT "action_rules_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."alert_locations"
    ADD CONSTRAINT "alert_locations_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."alert_locations"
    ADD CONSTRAINT "alert_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."location_hazard_profiles"
    ADD CONSTRAINT "location_hazard_profiles_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."location_hazard_profiles"
    ADD CONSTRAINT "location_hazard_profiles_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."mission_task_resources"
    ADD CONSTRAINT "mission_task_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."safety_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mission_task_resources"
    ADD CONSTRAINT "mission_task_resources_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."mission_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mission_tasks"
    ADD CONSTRAINT "mission_tasks_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."mission_tasks"
    ADD CONSTRAINT "mission_tasks_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."preparedness_missions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."personal_emergency_contacts"
    ADD CONSTRAINT "personal_emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_active_location_id_fkey" FOREIGN KEY ("active_location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_preferred_language_code_fkey" FOREIGN KEY ("preferred_language_code") REFERENCES "public"."supported_languages"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_question_resources"
    ADD CONSTRAINT "quiz_question_resources_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_question_resources"
    ADD CONSTRAINT "quiz_question_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."safety_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "public"."preparedness_missions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."resource_hazards"
    ADD CONSTRAINT "resource_hazards_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."resource_hazards"
    ADD CONSTRAINT "resource_hazards_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."safety_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_locations"
    ADD CONSTRAINT "resource_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."resource_locations"
    ADD CONSTRAINT "resource_locations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."safety_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_sources"
    ADD CONSTRAINT "resource_sources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."safety_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_sources"
    ADD CONSTRAINT "resource_sources_source_language_code_fkey" FOREIGN KEY ("source_language_code") REFERENCES "public"."supported_languages"("code") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."resource_topic_links"
    ADD CONSTRAINT "resource_topic_links_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."safety_resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_topic_links"
    ADD CONSTRAINT "resource_topic_links_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."resource_topics"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_mission_task_progress"
    ADD CONSTRAINT "user_mission_task_progress_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."mission_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_mission_task_progress"
    ADD CONSTRAINT "user_mission_task_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_quiz_progress"
    ADD CONSTRAINT "user_quiz_progress_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_quiz_progress"
    ADD CONSTRAINT "user_quiz_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Application clients can read achievements" ON "public"."achievements" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Application clients can read active action rules" ON "public"."action_rules" FOR SELECT TO "authenticated", "anon" USING (("is_active" AND (EXISTS ( SELECT 1
   FROM "public"."actions" "action"
  WHERE (("action"."id" = "action_rules"."action_id") AND "action"."is_active"))) AND (EXISTS ( SELECT 1
   FROM "public"."hazards" "hazard"
  WHERE (("hazard"."id" = "action_rules"."hazard_id") AND "hazard"."is_active"))) AND (("location_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."locations" "location"
  WHERE (("location"."id" = "action_rules"."location_id") AND "location"."is_active")))) AND (("linked_task_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM (("public"."mission_tasks" "task"
     JOIN "public"."preparedness_missions" "mission" ON (("mission"."id" = "task"."mission_id")))
     LEFT JOIN "public"."hazards" "task_hazard" ON (("task_hazard"."id" = "task"."hazard_id")))
  WHERE (("task"."id" = "action_rules"."linked_task_id") AND "task"."is_active" AND "mission"."is_active" AND (("task"."hazard_id" IS NULL) OR "task_hazard"."is_active")))))));



CREATE POLICY "Application clients can read active mission resource links" ON "public"."mission_task_resources" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM "public"."safety_resources" "resource"
  WHERE (("resource"."id" = "mission_task_resources"."resource_id") AND ("resource"."publication_status" = 'published'::"text")))) AND (EXISTS ( SELECT 1
   FROM (("public"."mission_tasks" "task"
     JOIN "public"."preparedness_missions" "mission" ON (("mission"."id" = "task"."mission_id")))
     LEFT JOIN "public"."hazards" "hazard" ON (("hazard"."id" = "task"."hazard_id")))
  WHERE (("task"."id" = "mission_task_resources"."task_id") AND "task"."is_active" AND "mission"."is_active" AND (("task"."hazard_id" IS NULL) OR "hazard"."is_active"))))));



CREATE POLICY "Application clients can read active quiz resource links" ON "public"."quiz_question_resources" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM "public"."safety_resources" "resource"
  WHERE (("resource"."id" = "quiz_question_resources"."resource_id") AND ("resource"."publication_status" = 'published'::"text")))) AND (EXISTS ( SELECT 1
   FROM (("public"."quiz_questions" "question"
     JOIN "public"."preparedness_missions" "mission" ON (("mission"."id" = "question"."mission_id")))
     LEFT JOIN "public"."hazards" "hazard" ON (("hazard"."id" = "question"."hazard_id")))
  WHERE (("question"."id" = "quiz_question_resources"."question_id") AND "question"."is_active" AND "mission"."is_active" AND (("question"."hazard_id" IS NULL) OR "hazard"."is_active"))))));



CREATE POLICY "Application clients can read active resource topics" ON "public"."resource_topics" FOR SELECT TO "authenticated", "anon" USING ("is_active");



CREATE POLICY "Application clients can read active safety actions" ON "public"."actions" FOR SELECT TO "authenticated", "anon" USING ("is_active");



CREATE POLICY "Application clients can read hazards" ON "public"."hazards" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Application clients can read location hazard profiles" ON "public"."location_hazard_profiles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Application clients can read mission tasks" ON "public"."mission_tasks" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Application clients can read preparedness missions" ON "public"."preparedness_missions" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Application clients can read public alert locations" ON "public"."alert_locations" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM ("public"."alerts" "alert"
     JOIN "public"."hazards" "hazard" ON (("hazard"."id" = "alert"."hazard_id")))
  WHERE (("alert"."id" = "alert_locations"."alert_id") AND ("alert"."publication_status" = 'published'::"text") AND "hazard"."is_active"))) AND (EXISTS ( SELECT 1
   FROM "public"."locations" "location"
  WHERE (("location"."id" = "alert_locations"."location_id") AND "location"."is_active")))));



CREATE POLICY "Application clients can read published alerts" ON "public"."alerts" FOR SELECT TO "authenticated", "anon" USING ((("publication_status" = 'published'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."hazards" "hazard"
  WHERE (("hazard"."id" = "alerts"."hazard_id") AND "hazard"."is_active")))));



CREATE POLICY "Application clients can read published resource hazard links" ON "public"."resource_hazards" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM "public"."safety_resources" "resource"
  WHERE (("resource"."id" = "resource_hazards"."resource_id") AND ("resource"."publication_status" = 'published'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."hazards" "hazard"
  WHERE (("hazard"."id" = "resource_hazards"."hazard_id") AND "hazard"."is_active")))));



CREATE POLICY "Application clients can read published resource location links" ON "public"."resource_locations" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM "public"."safety_resources" "resource"
  WHERE (("resource"."id" = "resource_locations"."resource_id") AND ("resource"."publication_status" = 'published'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."locations" "location"
  WHERE (("location"."id" = "resource_locations"."location_id") AND "location"."is_active")))));



CREATE POLICY "Application clients can read published resource topic links" ON "public"."resource_topic_links" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM "public"."safety_resources" "resource"
  WHERE (("resource"."id" = "resource_topic_links"."resource_id") AND ("resource"."publication_status" = 'published'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."resource_topics" "topic"
  WHERE (("topic"."id" = "resource_topic_links"."topic_id") AND "topic"."is_active")))));



CREATE POLICY "Application clients can read published safety resources" ON "public"."safety_resources" FOR SELECT TO "authenticated", "anon" USING (("publication_status" = 'published'::"text"));



CREATE POLICY "Application clients can read quiz options" ON "public"."quiz_options" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Application clients can read quiz questions" ON "public"."quiz_questions" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Application clients can read sources for published resources" ON "public"."resource_sources" FOR SELECT TO "authenticated", "anon" USING (("is_active" AND (EXISTS ( SELECT 1
   FROM "public"."safety_resources" "resource"
  WHERE (("resource"."id" = "resource_sources"."resource_id") AND ("resource"."publication_status" = 'published'::"text"))))));



CREATE POLICY "Authenticated users can create their own mission task progress" ON "public"."user_mission_task_progress" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND (EXISTS ( SELECT 1
   FROM (("public"."mission_tasks" "task"
     JOIN "public"."preparedness_missions" "mission" ON (("mission"."id" = "task"."mission_id")))
     LEFT JOIN "public"."hazards" "hazard" ON (("hazard"."id" = "task"."hazard_id")))
  WHERE (("task"."id" = "user_mission_task_progress"."task_id") AND "task"."is_active" AND "mission"."is_active" AND (("task"."hazard_id" IS NULL) OR "hazard"."is_active"))))));



CREATE POLICY "Authenticated users can create their own personal contacts" ON "public"."personal_emergency_contacts" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Authenticated users can delete their own personal contacts" ON "public"."personal_emergency_contacts" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Authenticated users can only read their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Authenticated users can only update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Authenticated users can read their own achievements" ON "public"."user_achievements" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Authenticated users can read their own mission task progress" ON "public"."user_mission_task_progress" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Authenticated users can read their own personal contacts" ON "public"."personal_emergency_contacts" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Authenticated users can read their own quiz progress" ON "public"."user_quiz_progress" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Authenticated users can update their own mission task progress" ON "public"."user_mission_task_progress" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND (EXISTS ( SELECT 1
   FROM (("public"."mission_tasks" "task"
     JOIN "public"."preparedness_missions" "mission" ON (("mission"."id" = "task"."mission_id")))
     LEFT JOIN "public"."hazards" "hazard" ON (("hazard"."id" = "task"."hazard_id")))
  WHERE (("task"."id" = "user_mission_task_progress"."task_id") AND "task"."is_active" AND "mission"."is_active" AND (("task"."hazard_id" IS NULL) OR "hazard"."is_active")))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND (EXISTS ( SELECT 1
   FROM (("public"."mission_tasks" "task"
     JOIN "public"."preparedness_missions" "mission" ON (("mission"."id" = "task"."mission_id")))
     LEFT JOIN "public"."hazards" "hazard" ON (("hazard"."id" = "task"."hazard_id")))
  WHERE (("task"."id" = "user_mission_task_progress"."task_id") AND "task"."is_active" AND "mission"."is_active" AND (("task"."hazard_id" IS NULL) OR "hazard"."is_active"))))));



CREATE POLICY "Authenticated users can update their own personal contacts" ON "public"."personal_emergency_contacts" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Guests and authenticated users can read Saudi location configur" ON "public"."locations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Guests and authenticated users can read supported language conf" ON "public"."supported_languages" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."action_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alert_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hazards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_hazard_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mission_task_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mission_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_emergency_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."preparedness_missions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_question_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_hazards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_topic_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_topics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."safety_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supported_languages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_mission_task_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_quiz_progress" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "private"."award_achievements_after_profile_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."award_achievements_after_quiz_progress"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."award_achievements_after_task_progress"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."evaluate_preparedness_achievements"("p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."user_has_completed_preparedness_mission"("p_user_id" "uuid", "p_mission_id" bigint) FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."resolve_location_hazards"("p_location_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_location_hazards"("p_location_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_location_hazards"("p_location_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_location_hazards"("p_location_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_quiz_answer"("p_question_id" bigint, "p_option_ids" bigint[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_quiz_answer"("p_question_id" bigint, "p_option_ids" bigint[]) TO "anon";
GRANT ALL ON FUNCTION "public"."submit_quiz_answer"("p_question_id" bigint, "p_option_ids" bigint[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_quiz_answer"("p_question_id" bigint, "p_option_ids" bigint[]) TO "service_role";


















GRANT ALL ON TABLE "public"."achievements" TO "service_role";
GRANT SELECT ON TABLE "public"."achievements" TO "anon";
GRANT SELECT ON TABLE "public"."achievements" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."achievements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."action_rules" TO "service_role";
GRANT SELECT ON TABLE "public"."action_rules" TO "anon";
GRANT SELECT ON TABLE "public"."action_rules" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."action_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."actions" TO "service_role";
GRANT SELECT ON TABLE "public"."actions" TO "anon";
GRANT SELECT ON TABLE "public"."actions" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."actions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."alert_locations" TO "service_role";
GRANT SELECT ON TABLE "public"."alert_locations" TO "anon";
GRANT SELECT ON TABLE "public"."alert_locations" TO "authenticated";



GRANT ALL ON TABLE "public"."alerts" TO "service_role";
GRANT SELECT ON TABLE "public"."alerts" TO "anon";
GRANT SELECT ON TABLE "public"."alerts" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."alerts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."hazards" TO "service_role";
GRANT SELECT ON TABLE "public"."hazards" TO "anon";
GRANT SELECT ON TABLE "public"."hazards" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."hazards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."location_hazard_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."location_hazard_profiles" TO "anon";
GRANT SELECT ON TABLE "public"."location_hazard_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."locations" TO "service_role";
GRANT SELECT ON TABLE "public"."locations" TO "anon";
GRANT SELECT ON TABLE "public"."locations" TO "authenticated";



GRANT ALL ON TABLE "public"."mission_task_resources" TO "service_role";
GRANT SELECT ON TABLE "public"."mission_task_resources" TO "anon";
GRANT SELECT ON TABLE "public"."mission_task_resources" TO "authenticated";



GRANT ALL ON TABLE "public"."mission_tasks" TO "service_role";
GRANT SELECT ON TABLE "public"."mission_tasks" TO "anon";
GRANT SELECT ON TABLE "public"."mission_tasks" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."mission_tasks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."personal_emergency_contacts" TO "service_role";
GRANT SELECT,DELETE ON TABLE "public"."personal_emergency_contacts" TO "authenticated";



GRANT INSERT("user_id") ON TABLE "public"."personal_emergency_contacts" TO "authenticated";



GRANT INSERT("name"),UPDATE("name") ON TABLE "public"."personal_emergency_contacts" TO "authenticated";



GRANT INSERT("relationship_label"),UPDATE("relationship_label") ON TABLE "public"."personal_emergency_contacts" TO "authenticated";



GRANT INSERT("phone_number"),UPDATE("phone_number") ON TABLE "public"."personal_emergency_contacts" TO "authenticated";



GRANT INSERT("email"),UPDATE("email") ON TABLE "public"."personal_emergency_contacts" TO "authenticated";



GRANT INSERT("is_primary"),UPDATE("is_primary") ON TABLE "public"."personal_emergency_contacts" TO "authenticated";



GRANT ALL ON TABLE "public"."preparedness_missions" TO "service_role";
GRANT SELECT ON TABLE "public"."preparedness_missions" TO "anon";
GRANT SELECT ON TABLE "public"."preparedness_missions" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."preparedness_missions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("active_location_id") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("preferred_language_code") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("text_size_preference") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("children_count") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("adults_count") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("older_adults_count") ON TABLE "public"."profiles" TO "authenticated";



GRANT UPDATE("pets_count") ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."quiz_options" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."quiz_options" TO "anon";
GRANT SELECT("id") ON TABLE "public"."quiz_options" TO "authenticated";



GRANT SELECT("question_id") ON TABLE "public"."quiz_options" TO "anon";
GRANT SELECT("question_id") ON TABLE "public"."quiz_options" TO "authenticated";



GRANT SELECT("option_code") ON TABLE "public"."quiz_options" TO "anon";
GRANT SELECT("option_code") ON TABLE "public"."quiz_options" TO "authenticated";



GRANT SELECT("text_en") ON TABLE "public"."quiz_options" TO "anon";
GRANT SELECT("text_en") ON TABLE "public"."quiz_options" TO "authenticated";



GRANT SELECT("text_ar") ON TABLE "public"."quiz_options" TO "anon";
GRANT SELECT("text_ar") ON TABLE "public"."quiz_options" TO "authenticated";



GRANT SELECT("sort_order") ON TABLE "public"."quiz_options" TO "anon";
GRANT SELECT("sort_order") ON TABLE "public"."quiz_options" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."quiz_options" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."quiz_options" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."quiz_options_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_question_resources" TO "service_role";
GRANT SELECT ON TABLE "public"."quiz_question_resources" TO "anon";
GRANT SELECT ON TABLE "public"."quiz_question_resources" TO "authenticated";



GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("id") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("mission_id") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("mission_id") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("hazard_id") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("hazard_id") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("code") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("code") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("question_type") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("question_type") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("prompt_en") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("prompt_en") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("prompt_ar") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("prompt_ar") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("sort_order") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("sort_order") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("is_active") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("is_active") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."quiz_questions" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."quiz_questions" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."quiz_questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."resource_hazards" TO "service_role";
GRANT SELECT ON TABLE "public"."resource_hazards" TO "anon";
GRANT SELECT ON TABLE "public"."resource_hazards" TO "authenticated";



GRANT ALL ON TABLE "public"."resource_locations" TO "service_role";
GRANT SELECT ON TABLE "public"."resource_locations" TO "anon";
GRANT SELECT ON TABLE "public"."resource_locations" TO "authenticated";



GRANT ALL ON TABLE "public"."resource_sources" TO "service_role";
GRANT SELECT ON TABLE "public"."resource_sources" TO "anon";
GRANT SELECT ON TABLE "public"."resource_sources" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."resource_sources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."resource_topic_links" TO "service_role";
GRANT SELECT ON TABLE "public"."resource_topic_links" TO "anon";
GRANT SELECT ON TABLE "public"."resource_topic_links" TO "authenticated";



GRANT ALL ON TABLE "public"."resource_topics" TO "service_role";
GRANT SELECT ON TABLE "public"."resource_topics" TO "anon";
GRANT SELECT ON TABLE "public"."resource_topics" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."resource_topics_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."safety_resources" TO "service_role";
GRANT SELECT ON TABLE "public"."safety_resources" TO "anon";
GRANT SELECT ON TABLE "public"."safety_resources" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."safety_resources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."supported_languages" TO "service_role";
GRANT SELECT ON TABLE "public"."supported_languages" TO "anon";
GRANT SELECT ON TABLE "public"."supported_languages" TO "authenticated";



GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";
GRANT SELECT ON TABLE "public"."user_achievements" TO "authenticated";



GRANT ALL ON TABLE "public"."user_mission_task_progress" TO "service_role";
GRANT SELECT ON TABLE "public"."user_mission_task_progress" TO "authenticated";



GRANT INSERT("user_id") ON TABLE "public"."user_mission_task_progress" TO "authenticated";



GRANT INSERT("task_id") ON TABLE "public"."user_mission_task_progress" TO "authenticated";



GRANT INSERT("is_completed"),UPDATE("is_completed") ON TABLE "public"."user_mission_task_progress" TO "authenticated";



GRANT ALL ON TABLE "public"."user_quiz_progress" TO "service_role";
GRANT SELECT ON TABLE "public"."user_quiz_progress" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";



































