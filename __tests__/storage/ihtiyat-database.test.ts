/// <reference types="jest" />


const mockOpenDatabaseAsync =
    jest.fn();


type TransactionLike = {
    execAsync: (
        sql: string,
    ) => Promise<void>;
};


function createDatabaseMock(
    userVersion: number,
) {
    const transactionExecAsync =
        jest.fn(
            async (
                _sql: string,
            ): Promise<void> => {
                return;
            },
        );


    const execAsync =
        jest.fn(
            async (
                _sql: string,
            ): Promise<void> => {
                return;
            },
        );


    const getFirstAsync =
        jest.fn(
            async (
                _sql: string,
            ): Promise<{
                user_version: number;
            }> => ({
                user_version:
                    userVersion,
            }),
        );


    const withExclusiveTransactionAsync =
        jest.fn(
            async (
                callback: (
                    transaction:
                        TransactionLike,
                ) => Promise<void>,
            ): Promise<void> => {
                await callback({
                    execAsync:
                        transactionExecAsync,
                });
            },
        );


    return {
        database: {
            execAsync,
            getFirstAsync,
            withExclusiveTransactionAsync,
        },

        execAsync,
        getFirstAsync,
        withExclusiveTransactionAsync,
        transactionExecAsync,
    };
}


function loadDatabaseModule():
    typeof import(
        '@/storage/ihtiyat-database'
    ) {
    return require(
        '@/storage/ihtiyat-database'
    ) as typeof import(
        '@/storage/ihtiyat-database'
    );
}


describe(
    'Ihtiyat structured SQLite database',
    () => {
        beforeEach(() => {
            jest.resetModules();


            mockOpenDatabaseAsync
                .mockReset();


            jest.doMock(
                'expo-sqlite',
                () => ({
                    openDatabaseAsync:
                        mockOpenDatabaseAsync,
                }),
            );
        });


        test(
            'opens and initialises a new database through V5',
            async () => {
                const mockDatabase =
                    createDatabaseMock(
                        0,
                    );


                mockOpenDatabaseAsync
                    .mockResolvedValue(
                        mockDatabase.database,
                    );


                const {
                    getIhtiyatDatabase,
                } =
                    loadDatabaseModule();


                await expect(
                    getIhtiyatDatabase(),
                ).resolves.toBe(
                    mockDatabase.database,
                );


                expect(
                    mockOpenDatabaseAsync,
                ).toHaveBeenCalledWith(
                    'ihtiyat.db',
                );


                expect(
                    mockDatabase
                        .execAsync
                        .mock.calls,
                ).toEqual([
                    [
                        'PRAGMA journal_mode = WAL;',
                    ],
                    [
                        'PRAGMA foreign_keys = ON;',
                    ],
                ]);


                expect(
                    mockDatabase
                        .getFirstAsync,
                ).toHaveBeenCalledWith(
                    'PRAGMA user_version;',
                );


                expect(
                    mockDatabase
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                const migrationCalls =
                    mockDatabase
                        .transactionExecAsync
                        .mock.calls
                        .map(
                            ([sql]) =>
                                sql as string,
                        );


                const migrationSql =
                    migrationCalls.join(
                        '\n',
                    );


                /*
                 * A brand-new installation must receive every migration in
                 * order: the public preparedness cache from V1, private mission
                 * progress from V2, and the public quiz catalogue cache from
                 * V3.
                 */
                expect(
                    migrationSql,
                ).toContain(
                    'preparedness_mission_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'preparedness_task_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'preparedness_location_hazard_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'preparedness_cache_metadata',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'user_mission_task_progress_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'user_mission_task_progress_outbox',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'quiz_question_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'quiz_option_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_location_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'action_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'action_rule_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_action_cache_metadata',
                );


                /*
                 * The local Quiz cache must never contain the protected answer
                 * key or post-submission explanations.
                */
                const quizMigrationSql =
                    migrationCalls.find(
                        (
                            sql,
                        ) =>
                            sql.includes(
                                'quiz_question_cache',
                            ),
                    );


                expect(
                    quizMigrationSql,
                ).toBeDefined();

                expect(
                    quizMigrationSql,
                ).not.toContain(
                    'is_correct',
                );

                expect(
                    quizMigrationSql,
                ).not.toContain(
                    'explanation_en',
                );

                expect(
                    quizMigrationSql,
                ).not.toContain(
                    'explanation_ar',
                );

                /*
                 * V4 stores the canonical public inputs needed to rebuild an Action Plan.
                 *
                 * A generated personalised plan must not be cached because task completion,
                 * household information or a selected simulation severity can change after
                 * the catalogue snapshot was stored.
                */
                const alertActionMigrationSql =
                    migrationCalls.find(
                        (
                            sql,
                        ) =>
                            sql.includes(
                                'alert_cache',
                            ),
                    );


                expect(
                    alertActionMigrationSql,
                ).toBeDefined();

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'alert_location_cache',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'action_cache',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'action_rule_cache',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'alert_action_cache_metadata',
                );


                /*
                 * The offline evaluator needs the same condition and score inputs as the
                 * canonical Supabase action-rule catalogue.
                */
                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'linked_task_id',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'min_severity',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'incomplete_task_boost',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'safety_override',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'safety_override_min_severity',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'min_children_count',
                );

                expect(
                    alertActionMigrationSql,
                ).toContain(
                    'min_older_adults_count',
                );


                /*
                * Dynamic or account-specific Action Plan output must be recalculated rather
                * than persisted as part of the public catalogue cache.
                */
                expect(
                    alertActionMigrationSql,
                ).not.toContain(
                    'generated_action_plan_cache',
                );

                expect(
                    alertActionMigrationSql,
                ).not.toContain(
                    'user_id',
                );

                /** V5 Schema Implementation */
                const resourceHubMigrationSql =
                    migrationCalls.find(
                        (sql) =>
                            sql.includes(
                                'resource_topic_cache',
                            ),
                    );


                expect(
                    resourceHubMigrationSql,
                ).toBeDefined();


                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'safety_resource_cache',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'resource_source_cache',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'resource_topic_link_cache',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'resource_hazard_cache',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'resource_location_cache',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'mission_task_resource_cache',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'quiz_question_resource_cache',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'resource_hub_cache_metadata',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'content_en',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'content_ar',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'last_reviewed_on',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'source_url',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'is_official',
                );

                expect(
                    resourceHubMigrationSql,
                ).toContain(
                    'link_role',
                );

                expect(
                    resourceHubMigrationSql,
                ).not.toContain(
                    'user_id',
                );

                expect(
                    mockDatabase
                        .transactionExecAsync,
                ).toHaveBeenLastCalledWith(
                    'PRAGMA user_version = 5;',
                );
            },
        );


        test(
            'migrates an existing V1 database through V2, V3, V4 and V5 without reinstalling V1',
            async () => {
                const mockDatabase =
                    createDatabaseMock(
                        1,
                    );


                mockOpenDatabaseAsync
                    .mockResolvedValue(
                        mockDatabase.database,
                    );


                const {
                    getIhtiyatDatabase,
                } =
                    loadDatabaseModule();


                await expect(
                    getIhtiyatDatabase(),
                ).resolves.toBe(
                    mockDatabase.database,
                );


                expect(
                    mockDatabase
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                const migrationCalls =
                    mockDatabase
                        .transactionExecAsync
                        .mock.calls
                        .map(
                            ([sql]) =>
                                sql as string,
                        );


                /*
                 * V1 already exists, so none of its schema should be executed
                 * again.
                 */
                expect(
                    migrationCalls.some(
                        (
                            sql,
                        ) =>
                            sql.includes(
                                'preparedness_mission_cache',
                            ),
                    ),
                ).toBe(
                    false,
                );


                const migrationSql =
                    migrationCalls.join(
                        '\n',
                    );


                expect(
                    migrationSql,
                ).toContain(
                    'user_mission_task_progress_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'user_mission_task_progress_outbox',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'quiz_question_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'quiz_option_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_location_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'action_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'action_rule_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_action_cache_metadata',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_topic_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'safety_resource_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_hub_cache_metadata',
                );


                expect(
                    mockDatabase
                        .transactionExecAsync,
                ).toHaveBeenLastCalledWith(
                    'PRAGMA user_version = 5;',
                );
            },
        );


        test(
            'migrates an existing V2 database to V3, V4 and V5 without reinstalling earlier schemas',
            async () => {
                const mockDatabase =
                    createDatabaseMock(
                        2,
                    );


                mockOpenDatabaseAsync
                    .mockResolvedValue(
                        mockDatabase.database,
                    );


                const {
                    getIhtiyatDatabase,
                } =
                    loadDatabaseModule();


                await expect(
                    getIhtiyatDatabase(),
                ).resolves.toBe(
                    mockDatabase.database,
                );


                expect(
                    mockDatabase
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                const migrationCalls =
                    mockDatabase
                        .transactionExecAsync
                        .mock.calls
                        .map(
                            ([sql]) =>
                                sql as string,
                        );


                const migrationSql =
                    migrationCalls.join(
                        '\n',
                    );


                /*
                 * This represents the upgrade path your current physical
                 * device will actually take. Neither V1 nor V2 should be
                 * replayed.
                 */
                expect(
                    migrationSql,
                ).not.toContain(
                    'preparedness_mission_cache',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'user_mission_task_progress_cache',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'user_mission_task_progress_outbox',
                );


                expect(
                    migrationSql,
                ).toContain(
                    'quiz_question_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'quiz_option_cache',
                );


                /*
                 * V3 stores only pre-submission public quiz content.
                 */
                expect(
                    migrationSql,
                ).not.toContain(
                    'is_correct',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'explanation_en',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'explanation_ar',
                );

                /**
                 * V4 alert action-plan

                */
                expect(
                    migrationSql,
                ).toContain(
                    'alert_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_location_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'action_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'action_rule_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_action_cache_metadata',
                );
                expect(
                    migrationSql,
                ).toContain(
                    'resource_topic_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'safety_resource_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_hub_cache_metadata',
                );


                expect(
                    mockDatabase
                        .transactionExecAsync,
                ).toHaveBeenLastCalledWith(
                    'PRAGMA user_version = 5;',
                );
            },
        );

        test(
            'migrates an existing V3 database to V4 and V5 without reinstalling earlier schemas',
            async () => {
                const mockDatabase =
                    createDatabaseMock(
                        3,
                    );


                mockOpenDatabaseAsync
                    .mockResolvedValue(
                        mockDatabase.database,
                    );


                const {
                    getIhtiyatDatabase,
                } =
                    loadDatabaseModule();


                await expect(
                    getIhtiyatDatabase(),
                ).resolves.toBe(
                    mockDatabase.database,
                );


                expect(
                    mockDatabase
                        .withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                const migrationCalls =
                    mockDatabase
                        .transactionExecAsync
                        .mock.calls
                        .map(
                            ([sql]) =>
                                sql as string,
                        );


                const migrationSql =
                    migrationCalls.join(
                        '\n',
                    );


                /*
                * V3 already contains the preparedness, private mission-progress and
                * public Quiz caches. The physical device upgrade must install only
                * the new alert/action catalogue cache.
                */
                expect(
                    migrationSql,
                ).not.toContain(
                    'preparedness_mission_cache',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'user_mission_task_progress_cache',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'quiz_question_cache',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'quiz_option_cache',
                );


                expect(
                    migrationSql,
                ).toContain(
                    'alert_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_location_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'action_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'action_rule_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'alert_action_cache_metadata',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_topic_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'safety_resource_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_hub_cache_metadata',
                );

                expect(
                    mockDatabase
                        .transactionExecAsync,
                ).toHaveBeenLastCalledWith(
                    'PRAGMA user_version = 5;',
                );
            },
        );

        test(
            'migrates an existing V4 database to V5 without reinstalling earlier schemas',
            async () => {
                const mockDatabase =
                    createDatabaseMock(
                        4,
                    );


                mockOpenDatabaseAsync.mockResolvedValue(
                    mockDatabase.database,
                );


                const {
                    getIhtiyatDatabase,
                } = loadDatabaseModule();


                await expect(
                    getIhtiyatDatabase(),
                ).resolves.toBe(
                    mockDatabase.database,
                );


                expect(
                    mockDatabase.withExclusiveTransactionAsync,
                ).toHaveBeenCalledTimes(1);


                const migrationCalls =
                    mockDatabase.transactionExecAsync.mock.calls.map(
                        ([sql]) =>
                            sql as string,
                    );

                const migrationSql =
                    migrationCalls.join(
                        '\n',
                    );


                /*
                 * V4 already contains preparedness, mission-progress, Quiz and
                 * Alerts/Action Plan storage. Only the Resource Hub migration should
                 * execute on the current physical-device upgrade path.
                */
                expect(
                    migrationSql,
                ).not.toContain(
                    'preparedness_mission_cache',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'user_mission_task_progress_cache',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'quiz_question_cache',
                );

                expect(
                    migrationSql,
                ).not.toContain(
                    'alert_cache',
                );


                expect(
                    migrationSql,
                ).toContain(
                    'resource_topic_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'safety_resource_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_source_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_topic_link_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_hazard_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_location_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'mission_task_resource_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'quiz_question_resource_cache',
                );

                expect(
                    migrationSql,
                ).toContain(
                    'resource_hub_cache_metadata',
                );


                expect(
                    mockDatabase.transactionExecAsync,
                ).toHaveBeenLastCalledWith(
                    'PRAGMA user_version = 5;',
                );
            },
        );


        test(
            'reuses one opened database and skips migration when already at V5',
            async () => {
                const mockDatabase =
                    createDatabaseMock(
                        5,
                    );


                mockOpenDatabaseAsync
                    .mockResolvedValue(
                        mockDatabase.database,
                    );


                const {
                    getIhtiyatDatabase,
                } =
                    loadDatabaseModule();


                const firstRequest =
                    getIhtiyatDatabase();

                const secondRequest =
                    getIhtiyatDatabase();


                /*
                 * Both concurrent requests are observed together so that, during the RED
                 * phase where V3 is not supported yet, neither rejected promise can escape
                 * Jest as an unhandled rejection.
                */
                await expect(
                    Promise.all([
                        firstRequest,
                        secondRequest,
                    ]),
                ).resolves.toEqual([
                    mockDatabase.database,
                    mockDatabase.database,
                ]);

                expect(
                    mockOpenDatabaseAsync,
                ).toHaveBeenCalledTimes(
                    1,
                );


                expect(
                    mockDatabase
                        .withExclusiveTransactionAsync,
                ).not.toHaveBeenCalled();
            },
        );

        test(
            'rejects a device database newer than this application supports',
            async () => {
                const mockDatabase =
                    createDatabaseMock(
                        6,
                    );


                mockOpenDatabaseAsync
                    .mockResolvedValue(
                        mockDatabase.database,
                    );


                const {
                    getIhtiyatDatabase,
                } =
                    loadDatabaseModule();


                await expect(
                    getIhtiyatDatabase(),
                ).rejects.toThrow(
                    'Ihtiyat SQLite database version 6 is newer than supported version 5.',
                );


                expect(
                    mockDatabase
                        .withExclusiveTransactionAsync,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'allows a later retry after database initialisation fails',
            async () => {
                const failedDatabase =
                    createDatabaseMock(
                        0,
                    );


                failedDatabase
                    .getFirstAsync
                    .mockRejectedValueOnce(
                        new Error(
                            'version read failed',
                        ),
                    );


                const recoveredDatabase =
                    createDatabaseMock(
                        5,
                    );


                mockOpenDatabaseAsync
                    .mockResolvedValueOnce(
                        failedDatabase.database,
                    )
                    .mockResolvedValueOnce(
                        recoveredDatabase.database,
                    );


                const {
                    getIhtiyatDatabase,
                } =
                    loadDatabaseModule();


                await expect(
                    getIhtiyatDatabase(),
                ).rejects.toThrow(
                    'version read failed',
                );


                await expect(
                    getIhtiyatDatabase(),
                ).resolves.toBe(
                    recoveredDatabase.database,
                );


                expect(
                    mockOpenDatabaseAsync,
                ).toHaveBeenCalledTimes(
                    2,
                );
            },
        );
    },
);