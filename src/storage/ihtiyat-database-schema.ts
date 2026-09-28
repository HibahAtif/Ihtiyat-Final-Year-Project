/**
 * Current version of Ihtiyat's structured SQLite database.
 *
 * This is separate from my app's Supabase's schema version. It tracks the
 * device-side SQLite structure used for offline resilience.
*/
export const IHTIYAT_DATABASE_VERSION = 5;


/**
 * Initial structured SQLite schema for Ihtiyat.
 *
 * Supabase remains the canonical source for published preparedness content.
 * These tables store a durable device-side copy so previously fetched content
 * can remain available when the network or backend cannot be reached.
 *
 * Boolean values are stored as SQLite INTEGER values:
 * 0 = false
 * 1 = true
*/
export const IHTIYAT_DATABASE_SCHEMA_V1_SQL = `
    CREATE TABLE IF NOT EXISTS preparedness_mission_cache (
        id INTEGER PRIMARY KEY NOT NULL,
        code TEXT NOT NULL UNIQUE,
        title_en TEXT NOT NULL,
        title_ar TEXT NOT NULL,
        description_en TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        mission_scope TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        is_active INTEGER NOT NULL
            CHECK (is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS preparedness_task_cache (
        id INTEGER PRIMARY KEY NOT NULL,
        mission_id INTEGER NOT NULL,
        hazard_id INTEGER,
        code TEXT NOT NULL UNIQUE,
        title_en TEXT NOT NULL,
        title_ar TEXT NOT NULL,
        detail_en TEXT,
        detail_ar TEXT,
        points INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        is_active INTEGER NOT NULL
            CHECK (is_active IN (0, 1)),

        FOREIGN KEY (mission_id)
            REFERENCES preparedness_mission_cache(id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS
        idx_preparedness_task_cache_mission_order
    ON preparedness_task_cache (
        mission_id,
        sort_order,
        id
    );

    CREATE TABLE IF NOT EXISTS preparedness_location_hazard_cache (
        requested_location_id INTEGER NOT NULL,
        hazard_id INTEGER NOT NULL,
        hazard_code TEXT NOT NULL,
        hazard_name_en TEXT NOT NULL,
        hazard_name_ar TEXT NOT NULL,
        classification TEXT NOT NULL,
        hazard_sort_order INTEGER NOT NULL,
        is_prioritised INTEGER NOT NULL
            CHECK (is_prioritised IN (0, 1)),
        relevance_rank INTEGER,
        matched_location_id INTEGER,
        matched_location_code TEXT,
        matched_location_type TEXT,
        matched_location_name_en TEXT,
        matched_location_name_ar TEXT,
        hierarchy_distance INTEGER,

        PRIMARY KEY (
            requested_location_id,
            hazard_id
        )
    );

    CREATE INDEX IF NOT EXISTS
        idx_preparedness_location_hazard_cache_order
    ON preparedness_location_hazard_cache (
        requested_location_id,
        is_prioritised DESC,
        relevance_rank,
        hierarchy_distance,
        hazard_sort_order,
        hazard_id
    );

    CREATE TABLE IF NOT EXISTS preparedness_cache_metadata (
        cache_key TEXT PRIMARY KEY NOT NULL,
        cached_at TEXT NOT NULL
    );
`;

/**
 * Structured SQLite schema introduced in database version 2.
 *
 * V2 adds private authenticated mission-progress state separately from the
 * public preparedness catalogue cache introduced in V1.
 *
 * Both tables are explicitly scoped by user_id so cached or pending progress
 * belonging to one authenticated account cannot be read as another account's
 * progress.
 *
 * The outbox stores only the latest desired completion state for each
 * user/task pair. Its composite primary key therefore prevents repeated
 * offline toggles from creating an unnecessary history of duplicate writes.
 *
 * These tables deliberately do not reference preparedness_task_cache with a
 * foreign key. The public catalogue cache may be replaced independently
 * without deleting or blocking private user progress.
*/
export const IHTIYAT_DATABASE_SCHEMA_V2_SQL = `
    CREATE TABLE IF NOT EXISTS user_mission_task_progress_cache (
        user_id TEXT NOT NULL,
        task_id INTEGER NOT NULL,
        is_completed INTEGER NOT NULL
            CHECK (is_completed IN (0, 1)),
        completed_at TEXT,
        updated_at TEXT NOT NULL,

        PRIMARY KEY (
            user_id,
            task_id
        )
    );


    CREATE TABLE IF NOT EXISTS user_mission_task_progress_outbox (
        user_id TEXT NOT NULL,
        task_id INTEGER NOT NULL,
        is_completed INTEGER NOT NULL
            CHECK (is_completed IN (0, 1)),
        queued_at TEXT NOT NULL,

        PRIMARY KEY (
            user_id,
            task_id
        )
    );


    CREATE INDEX IF NOT EXISTS
        idx_user_mission_task_progress_outbox_user_queue
    ON user_mission_task_progress_outbox (
        user_id,
        queued_at,
        task_id
    );
`;

/**
 * Structured SQLite schema introduced in database version 3.
 *
 * V3 adds a durable device-side copy of the public preparedness quiz
 * catalogue so previously fetched scenario questions and answer choices can
 * still be displayed when Supabase is temporarily unavailable.
 *
 * Quiz correctness remains server-authoritative. The protected answer key
 * and post-submission explanations are deliberately excluded from SQLite so
 * offline caching cannot expose information that ordinary catalogue reads are
 * not permitted to access.
 *
 * Questions and their public answer options are stored in two related cache
 * tables. The option cache references the question cache because both belong
 * to the same coherent public catalogue snapshot and are replaced together.
 *
 * No foreign keys are created from quiz questions to the preparedness mission
 * or hazard caches. Those public caches may be refreshed independently, so
 * the quiz catalogue must remain structurally independent from them.
*/
export const IHTIYAT_DATABASE_SCHEMA_V3_SQL = `
    CREATE TABLE IF NOT EXISTS quiz_question_cache (
        id INTEGER PRIMARY KEY NOT NULL,
        mission_id INTEGER NOT NULL,
        hazard_id INTEGER,
        code TEXT NOT NULL UNIQUE,
        question_type TEXT NOT NULL
            CHECK (
                question_type IN (
                    'single_select',
                    'multi_select'
                )
            ),
        prompt_en TEXT NOT NULL,
        prompt_ar TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        is_active INTEGER NOT NULL
            CHECK (is_active IN (0, 1))
    );


    CREATE INDEX IF NOT EXISTS
        idx_quiz_question_cache_mission_order
    ON quiz_question_cache (
        mission_id,
        sort_order,
        id
    );


    CREATE TABLE IF NOT EXISTS quiz_option_cache (
        id INTEGER PRIMARY KEY NOT NULL,
        question_id INTEGER NOT NULL,
        option_code TEXT NOT NULL,
        text_en TEXT NOT NULL,
        text_ar TEXT NOT NULL,
        sort_order INTEGER NOT NULL,

        UNIQUE (
            question_id,
            option_code
        ),

        FOREIGN KEY (question_id)
            REFERENCES quiz_question_cache(id)
            ON DELETE CASCADE
    );


    CREATE INDEX IF NOT EXISTS
        idx_quiz_option_cache_question_order
    ON quiz_option_cache (
        question_id,
        sort_order,
        id
    );
`;

/**
 * Structured SQLite schema introduced in database version 4.
 *
 * Adds the public alert and deterministic action-rule catalogue required for
 * offline-resilient alert viewing and Action Plan evaluation.
 *
 * Supabase remains canonical, but the Action Plan must still be derivable when
 * the network is unavailable. V4 therefore stores the canonical public inputs
 * needed by the same pure evaluator used online.
 *
 * Alerts, alert-location links, reusable actions and action rules are cached as
 * relational data. Dynamic Action Plan results are deliberately recalculated
 * from these inputs together with current severity, preparedness progress and
 * household context rather than being persisted as potentially stale output.
 *
 * Remote identifiers are preserved so cached records can be passed directly
 * into the application-layer evaluator without inventing device-only IDs.
*/
export const IHTIYAT_DATABASE_SCHEMA_V4_SQL = `
	CREATE TABLE IF NOT EXISTS alert_cache (
		id INTEGER PRIMARY KEY NOT NULL,
		code TEXT NOT NULL UNIQUE,
		hazard_id INTEGER NOT NULL,
		origin_type TEXT NOT NULL
			CHECK (
				origin_type IN (
					'simulated',
					'ihtiyat_managed',
					'official_external'
				)
			),
		external_alert_id TEXT,
		severity INTEGER NOT NULL
			CHECK (
				severity BETWEEN 1 AND 3
			),
		title_en TEXT NOT NULL,
		title_ar TEXT NOT NULL,
		message_en TEXT NOT NULL,
		message_ar TEXT NOT NULL,
		starts_at TEXT NOT NULL,
		published_at TEXT,
		expires_at TEXT NOT NULL,
		publication_status TEXT NOT NULL
			CHECK (
				publication_status IN (
					'draft',
					'published',
					'retired'
				)
			),
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			)
	);


	CREATE INDEX IF NOT EXISTS
		idx_alert_cache_hazard_status_order
	ON alert_cache (
		hazard_id,
		publication_status,
		sort_order,
		id
	);


	CREATE INDEX IF NOT EXISTS
		idx_alert_cache_validity
	ON alert_cache (
		starts_at,
		expires_at,
		id
	);


	/*
	 * No rows for an alert means that the alert is nationally applicable.
	 *
	 * The composite primary key also prevents duplicate location links from
	 * appearing in a locally cached snapshot.
	 */
	CREATE TABLE IF NOT EXISTS alert_location_cache (
		alert_id INTEGER NOT NULL,
		location_id INTEGER NOT NULL,

		PRIMARY KEY (
			alert_id,
			location_id
		),

		FOREIGN KEY (alert_id)
			REFERENCES alert_cache(id)
			ON DELETE CASCADE
	);


	CREATE INDEX IF NOT EXISTS
		idx_alert_location_cache_location
	ON alert_location_cache (
		location_id,
		alert_id
	);


	CREATE TABLE IF NOT EXISTS action_cache (
		id INTEGER PRIMARY KEY NOT NULL,
		code TEXT NOT NULL UNIQUE,
		title_en TEXT NOT NULL,
		title_ar TEXT NOT NULL,
		instruction_en TEXT NOT NULL,
		instruction_ar TEXT NOT NULL,
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			),
		is_active INTEGER NOT NULL
			CHECK (
				is_active IN (0, 1)
			)
	);


	CREATE INDEX IF NOT EXISTS
		idx_action_cache_active_order
	ON action_cache (
		is_active DESC,
		sort_order,
		id
	);


	/*
	 * action_rule_cache deliberately mirrors the canonical fields consumed by
	 * evaluateActionPlan().
	 *
	 * hazard_id, location_id and linked_task_id retain canonical remote IDs.
	 * Only action_id is enforced as a local foreign key because the action and
	 * its rules form one coherent cached catalogue snapshot.
	 */
	CREATE TABLE IF NOT EXISTS action_rule_cache (
		id INTEGER PRIMARY KEY NOT NULL,
		code TEXT NOT NULL UNIQUE,
		action_id INTEGER NOT NULL,
		hazard_id INTEGER NOT NULL,
		location_id INTEGER,
		linked_task_id INTEGER,
		min_severity INTEGER NOT NULL
			CHECK (
				min_severity BETWEEN 1 AND 3
			),
		base_priority INTEGER NOT NULL,
		incomplete_task_boost INTEGER NOT NULL
			CHECK (
				incomplete_task_boost >= 0
			),
		safety_override INTEGER NOT NULL
			CHECK (
				safety_override >= 0
			),
		safety_override_min_severity INTEGER
			CHECK (
				safety_override_min_severity IS NULL
				OR safety_override_min_severity BETWEEN 1 AND 3
			),
		min_children_count INTEGER
			CHECK (
				min_children_count IS NULL
				OR min_children_count >= 0
			),
		min_older_adults_count INTEGER
			CHECK (
				min_older_adults_count IS NULL
				OR min_older_adults_count >= 0
			),
		reason_en TEXT NOT NULL,
		reason_ar TEXT NOT NULL,
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			),
		is_active INTEGER NOT NULL
			CHECK (
				is_active IN (0, 1)
			),

		FOREIGN KEY (action_id)
			REFERENCES action_cache(id)
			ON DELETE CASCADE
	);


	CREATE INDEX IF NOT EXISTS
		idx_action_rule_cache_hazard_severity_order
	ON action_rule_cache (
		hazard_id,
		min_severity,
		sort_order,
		id
	);


	CREATE INDEX IF NOT EXISTS
		idx_action_rule_cache_location
	ON action_rule_cache (
		location_id,
		hazard_id,
		id
	);


	CREATE INDEX IF NOT EXISTS
		idx_action_rule_cache_linked_task
	ON action_rule_cache (
		linked_task_id,
		id
	);


	/*
	 * Metadata distinguishes "never cached" from a valid cached snapshot that
	 * happens to contain no matching rows for a particular query.
	 */
	CREATE TABLE IF NOT EXISTS alert_action_cache_metadata (
		cache_key TEXT PRIMARY KEY NOT NULL,
		cached_at TEXT NOT NULL
	);
`;

/**
 * Structured SQLite schema introduced in database version 5.
 *
 * Adds a durable device-side copy of Ihtiyat's public Resource Hub catalogue,
 * including bilingual guidance, source provenance and relationships used by
 * Resource Hub discovery, Missions and Quiz.
 *
 * Supabase remains canonical, but essential reviewed safety guidance should
 * remain readable when connectivity is lost. V5 also preserves the canonical
 * mission-task/resource and quiz-question/resource relationships so offline
 * cross-feature navigation does not require duplicated client-side mappings.
 *
 * Resource Hub content is cached as one coherent relational snapshot.
 * Foreign keys are enforced between tables that belong to that same snapshot.
 * Hazard IDs, location IDs, mission task IDs and quiz question IDs retain
 * canonical remote identifiers but deliberately do not reference other local
 * feature caches because those caches may be refreshed independently.
 *
 * Boolean values are stored as SQLite INTEGER values:
 * 0 = false
 * 1 = true
*/
export const IHTIYAT_DATABASE_SCHEMA_V5_SQL = `
	CREATE TABLE IF NOT EXISTS resource_topic_cache (
		id INTEGER PRIMARY KEY NOT NULL,
		code TEXT NOT NULL UNIQUE,
		name_en TEXT NOT NULL,
		name_ar TEXT NOT NULL,
		description_en TEXT,
		description_ar TEXT,
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			),
		is_active INTEGER NOT NULL
			CHECK (
				is_active IN (0, 1)
			)
	);


	CREATE INDEX IF NOT EXISTS
		idx_resource_topic_cache_active_order
	ON resource_topic_cache (
		is_active DESC,
		sort_order,
		id
	);


	CREATE TABLE IF NOT EXISTS safety_resource_cache (
		id INTEGER PRIMARY KEY NOT NULL,
		code TEXT NOT NULL UNIQUE,
		title_en TEXT NOT NULL,
		title_ar TEXT NOT NULL,
		summary_en TEXT NOT NULL,
		summary_ar TEXT NOT NULL,
		content_en TEXT NOT NULL,
		content_ar TEXT NOT NULL,
		publication_status TEXT NOT NULL
			CHECK (
				publication_status IN (
					'draft',
					'published',
					'retired'
				)
			),
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			),
		last_reviewed_on TEXT,
		published_at TEXT
	);


	CREATE INDEX IF NOT EXISTS
		idx_safety_resource_cache_status_order
	ON safety_resource_cache (
		publication_status,
		sort_order,
		id
	);


	CREATE TABLE IF NOT EXISTS resource_source_cache (
		id INTEGER PRIMARY KEY NOT NULL,
		resource_id INTEGER NOT NULL,
		publisher_name_en TEXT NOT NULL,
		publisher_name_ar TEXT NOT NULL,
		source_title_en TEXT,
		source_title_ar TEXT,
		source_url TEXT NOT NULL,
		source_language_code TEXT,
		is_official INTEGER NOT NULL
			CHECK (
				is_official IN (0, 1)
			),
		last_checked_on TEXT NOT NULL,
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			),
		is_active INTEGER NOT NULL
			CHECK (
				is_active IN (0, 1)
			),

		UNIQUE (
			resource_id,
			source_url
		),

		FOREIGN KEY (resource_id)
			REFERENCES safety_resource_cache(id)
			ON DELETE CASCADE
	);


	CREATE INDEX IF NOT EXISTS
		idx_resource_source_cache_resource_order
	ON resource_source_cache (
		resource_id,
		sort_order,
		id
	);


	CREATE TABLE IF NOT EXISTS resource_topic_link_cache (
		resource_id INTEGER NOT NULL,
		topic_id INTEGER NOT NULL,
		is_primary INTEGER NOT NULL
			CHECK (
				is_primary IN (0, 1)
			),
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			),

		PRIMARY KEY (
			resource_id,
			topic_id
		),

		FOREIGN KEY (resource_id)
			REFERENCES safety_resource_cache(id)
			ON DELETE CASCADE,

		FOREIGN KEY (topic_id)
			REFERENCES resource_topic_cache(id)
			ON DELETE CASCADE
	);


	CREATE UNIQUE INDEX IF NOT EXISTS
		resource_topic_link_cache_one_primary_idx
	ON resource_topic_link_cache (
		resource_id
	)
	WHERE is_primary = 1;


	CREATE INDEX IF NOT EXISTS
		idx_resource_topic_link_cache_topic_order
	ON resource_topic_link_cache (
		topic_id,
		sort_order,
		resource_id
	);


	CREATE TABLE IF NOT EXISTS resource_hazard_cache (
		resource_id INTEGER NOT NULL,
		hazard_id INTEGER NOT NULL,

		PRIMARY KEY (
			resource_id,
			hazard_id
		),

		FOREIGN KEY (resource_id)
			REFERENCES safety_resource_cache(id)
			ON DELETE CASCADE
	);


	CREATE INDEX IF NOT EXISTS
		idx_resource_hazard_cache_hazard
	ON resource_hazard_cache (
		hazard_id,
		resource_id
	);


	CREATE TABLE IF NOT EXISTS resource_location_cache (
		resource_id INTEGER NOT NULL,
		location_id INTEGER NOT NULL,

		PRIMARY KEY (
			resource_id,
			location_id
		),

		FOREIGN KEY (resource_id)
			REFERENCES safety_resource_cache(id)
			ON DELETE CASCADE
	);


	CREATE INDEX IF NOT EXISTS
		idx_resource_location_cache_location
	ON resource_location_cache (
		location_id,
		resource_id
	);


	CREATE TABLE IF NOT EXISTS mission_task_resource_cache (
		task_id INTEGER NOT NULL,
		resource_id INTEGER NOT NULL,
		link_role TEXT NOT NULL
			CHECK (
				link_role IN (
					'primary',
					'supporting'
				)
			),
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			),

		PRIMARY KEY (
			task_id,
			resource_id
		),

		FOREIGN KEY (resource_id)
			REFERENCES safety_resource_cache(id)
			ON DELETE CASCADE
	);


	CREATE UNIQUE INDEX IF NOT EXISTS
		mission_task_resource_cache_one_primary_idx
	ON mission_task_resource_cache (
		task_id
	)
	WHERE link_role = 'primary';


	CREATE INDEX IF NOT EXISTS
		idx_mission_task_resource_cache_task_order
	ON mission_task_resource_cache (
		task_id,
		sort_order,
		resource_id
	);


	CREATE TABLE IF NOT EXISTS quiz_question_resource_cache (
		question_id INTEGER NOT NULL,
		resource_id INTEGER NOT NULL,
		link_role TEXT NOT NULL
			CHECK (
				link_role IN (
					'primary',
					'supporting'
				)
			),
		sort_order INTEGER NOT NULL
			CHECK (
				sort_order >= 0
			),

		PRIMARY KEY (
			question_id,
			resource_id
		),

		FOREIGN KEY (resource_id)
			REFERENCES safety_resource_cache(id)
			ON DELETE CASCADE
	);


	CREATE UNIQUE INDEX IF NOT EXISTS
		quiz_question_resource_cache_one_primary_idx
	ON quiz_question_resource_cache (
		question_id
	)
	WHERE link_role = 'primary';


	CREATE INDEX IF NOT EXISTS
		idx_quiz_question_resource_cache_question_order
	ON quiz_question_resource_cache (
		question_id,
		sort_order,
		resource_id
	);


	/*
	 * Metadata distinguishes "never cached" from a valid Resource Hub snapshot
	 * that happens to contain no rows in an optional relationship table.
	 */
	CREATE TABLE IF NOT EXISTS resource_hub_cache_metadata (
		cache_key TEXT PRIMARY KEY NOT NULL,
		cached_at TEXT NOT NULL
	);
`;