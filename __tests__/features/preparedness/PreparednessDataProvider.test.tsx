/// <reference types="jest" />

import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react-native';

import {
    Pressable,
    Text,
} from 'react-native';

import {
    PreparednessDataProvider,
    usePreparednessData,
} from '@/features/preparedness/PreparednessDataProvider';

import {
    loadPreparednessFeatureSnapshot,
} from '@/features/preparedness/preparedness-feature-loader';

import {
    useActiveLocation,
} from '@/location/ActiveLocationProvider';

import type {
    PreparednessFeatureSnapshot,
} from '@/features/preparedness/preparedness-feature-loader';

import type {
    PreparednessMissionResolution,
} from '@/features/preparedness/preparedness-types';

import type {
    LocationRecord,
} from '@/profile/profile-types';


/**
 * WHAT:
 * Replaces the real active-location provider boundary with a controllable hook.
 *
 * WHY:
 * These tests focus on preparedness React-state behaviour. They should not
 * restore SQLite location state, load profile preferences or initialise the
 * wider application provider tree.
 *
 * HOW:
 * Each test configures useActiveLocation() with the exact location/loading
 * state required by that scenario.
 */
jest.mock(
    '@/location/ActiveLocationProvider',
    () => ({
        useActiveLocation:
            jest.fn(),
    }),
);


/**
 * WHAT:
 * Replaces the real preparedness feature loader with a deterministic mock.
 *
 * WHY:
 * Online catalogue access, hazard resolution, adaptive mission filtering and
 * SQLite fallback already have focused tests. This suite verifies only how
 * PreparednessDataProvider coordinates the resulting snapshot with React state.
 * 
 * HOW:
 * Tests control when each loader request resolves or rejects and then assert
 * the public state exposed through usePreparednessData().
 */
jest.mock(
    '@/features/preparedness/preparedness-feature-loader',
    () => ({
        loadPreparednessFeatureSnapshot:
            jest.fn(),
    }),
);


const useActiveLocationMock =
    useActiveLocation as jest.MockedFunction<
        typeof useActiveLocation
    >;


const loadPreparednessFeatureSnapshotMock =
    loadPreparednessFeatureSnapshot as jest.MockedFunction<
        typeof loadPreparednessFeatureSnapshot
    >;


const jeddahLocation: LocationRecord = {
    id: 201,
    parent_id: 200,
    official_code: '0124',
    location_type: 'governorate',
    name_en: 'Jeddah',
    name_ar: 'جدة',
    is_active: true,
};


const makkahLocation: LocationRecord = {
    id: 200,
    parent_id: null,
    official_code: '0002',
    location_type: 'region',
    name_en: 'Makkah Region',
    name_ar: 'منطقة مكة المكرمة',
    is_active: true,
};


const nationalMissionResolution:
    PreparednessMissionResolution = {
        mission: {
            id: 1,
            code: 'prepare_first_aid_kit',
            title_en: 'Prepare a First Aid Kit',
            title_ar: 'جهّز حقيبة إسعافات أولية',
            description_en:
                'Prepare essential first aid supplies.',
            description_ar:
                'جهّز مستلزمات الإسعافات الأولية الأساسية.',
            mission_scope: 'national',
            sort_order: 10,
            is_active: true,
        },
        tasks: [
            {
                id: 1,
                mission_id: 1,
                hazard_id: null,
                code: 'first_aid_kit_ready',
                title_en: 'Prepare the kit',
                title_ar: 'جهّز الحقيبة',
                detail_en: null,
                detail_ar: null,
                points: 20,
                sort_order: 10,
                is_active: true,
            },
        ],
        requiresLocation: false,
    };


const jeddahAdaptiveMissionResolution:
    PreparednessMissionResolution = {
        mission: {
            id: 4,
            code: 'know_your_local_hazards',
            title_en: 'Know Your Local Hazards',
            title_ar:
                'تعرّف على المخاطر المحلية في منطقتك',
            description_en:
                'Learn about hazards prioritised for your selected location.',
            description_ar:
                'تعرّف على المخاطر ذات الأولوية في موقعك المختار.',
            mission_scope: 'adaptive',
            sort_order: 40,
            is_active: true,
        },
        tasks: [
            {
                id: 16,
                mission_id: 4,
                hazard_id: 1,
                code: 'local_hazard_flood',
                title_en:
                    'Learn flood safety',
                title_ar:
                    'تعلّم السلامة من السيول',
                detail_en: null,
                detail_ar: null,
                points: 20,
                sort_order: 10,
                is_active: true,
            },
        ],
        requiresLocation: false,
    };


const makkahAdaptiveMissionResolution:
    PreparednessMissionResolution = {
        ...jeddahAdaptiveMissionResolution,
        tasks: [
            {
                id: 17,
                mission_id: 4,
                hazard_id: 2,
                code: 'local_hazard_heat',
                title_en:
                    'Learn extreme heat safety',
                title_ar:
                    'تعلّم السلامة من الحر الشديد',
                detail_en: null,
                detail_ar: null,
                points: 20,
                sort_order: 20,
                is_active: true,
            },
        ],
    };


const noLocationAdaptiveMissionResolution:
    PreparednessMissionResolution = {
        ...jeddahAdaptiveMissionResolution,
        tasks: [],
        requiresLocation: true,
    };


const noLocationSnapshot:
    PreparednessFeatureSnapshot = {
        activeLocation: null,
        resolvedHazards: null,
        missions: [
            nationalMissionResolution,
            noLocationAdaptiveMissionResolution,
        ],
    };


const jeddahSnapshot:
    PreparednessFeatureSnapshot = {
        activeLocation:
            jeddahLocation,
        resolvedHazards: [],
        missions: [
            nationalMissionResolution,
            jeddahAdaptiveMissionResolution,
        ],
    };


const makkahSnapshot:
    PreparednessFeatureSnapshot = {
        activeLocation:
            makkahLocation,
        resolvedHazards: [],
        missions: [
            nationalMissionResolution,
            makkahAdaptiveMissionResolution,
        ],
    };


type DeferredSnapshot = {
    promise:
        Promise<PreparednessFeatureSnapshot>;

    resolve: (
        value: PreparednessFeatureSnapshot,
    ) => void;

    reject: (
        reason: unknown,
    ) => void;
};


/**
 * WHAT:
 * Creates a preparedness-loader request whose completion timing is controlled
 * by the test.
 *
 * WHY:
 * Stale-request protection can only be verified when an older request remains
 * pending while a newer location request starts and finishes.
 *
 * HOW:
 * The helper exposes the underlying promise together with resolve/reject
 * functions that tests call inside act().
 */
function createDeferredSnapshot():
    DeferredSnapshot {
    let resolvePromise:
        | ((
            value:
                PreparednessFeatureSnapshot,
        ) => void)
        | undefined;

    let rejectPromise:
        | ((
            reason:
                unknown,
        ) => void)
        | undefined;


    const promise =
        new Promise<PreparednessFeatureSnapshot>(
            (
                resolve,
                reject,
            ) => {
                resolvePromise =
                    resolve;

                rejectPromise =
                    reject;
            },
        );


    return {
        promise,

        resolve: (
            value:
                PreparednessFeatureSnapshot,
        ): void => {
            if (!resolvePromise) {
                throw new Error(
                    'Deferred preparedness resolver is unavailable.',
                );
            }

            resolvePromise(
                value,
            );
        },

        reject: (
            reason:
                unknown,
        ): void => {
            if (!rejectPromise) {
                throw new Error(
                    'Deferred preparedness rejecter is unavailable.',
                );
            }

            rejectPromise(
                reason,
            );
        },
    };
}


/**
 * WHAT:
 * Displays the public state exposed by usePreparednessData().
 *
 * WHY:
 * Provider tests should interact with the same hook that production screens
 * will consume instead of asserting private component implementation details.
 *
 * HOW:
 * Important state is rendered as deterministic text and refresh() is exposed
 * through an accessible button.
 */
function PreparednessDataProbe() {
    const {
        activeLocation,
        missions,
        resolvedHazards,
        status,
        isLoading,
        refresh,
    } = usePreparednessData();


    const taskCodes =
        missions
            .flatMap(
                (mission) =>
                    mission.tasks,
            )
            .map(
                (task) =>
                    task.code,
            )
            .join(
                ',',
            );


    const requiresLocation =
        missions.some(
            (mission) =>
                mission.requiresLocation,
        );


    return (
        <>
            <Text
                testID="preparedness-status"
            >
                {status}
            </Text>

            <Text
                testID="preparedness-loading"
            >
                {String(
                    isLoading,
                )}
            </Text>

            <Text
                testID="preparedness-location"
            >
                {
                    activeLocation
                        ?.official_code
                    ?? 'none'
                }
            </Text>

            <Text
                testID="preparedness-mission-count"
            >
                {
                    String(
                        missions.length,
                    )
                }
            </Text>

            <Text
                testID="preparedness-task-codes"
            >
                {
                    taskCodes
                    || 'none'
                }
            </Text>

            <Text
                testID="preparedness-requires-location"
            >
                {
                    String(
                        requiresLocation,
                    )
                }
            </Text>

            <Text
                testID="preparedness-hazard-state"
            >
                {
                    resolvedHazards === null
                        ? 'null'
                        : String(
                            resolvedHazards.length,
                        )
                }
            </Text>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh preparedness data"
                onPress={refresh}
            >
                <Text>
                    Refresh preparedness data
                </Text>
            </Pressable>
        </>
    );
}


function renderProvider() {
    return render(
        <PreparednessDataProvider>
            <PreparednessDataProbe />
        </PreparednessDataProvider>,
    );
}


describe(
    'PreparednessDataProvider',
    () => {
        beforeEach(() => {
            jest.clearAllMocks();

            useActiveLocationMock
                .mockReturnValue({
                    activeLocation: null,
                    status: 'ready',
                    isLoading: false,
                    confirmLocation:
                        jest.fn(),
                });
        });


        test(
            'waits for ActiveLocationProvider before requesting preparedness data',
            async () => {
                useActiveLocationMock
                    .mockReturnValue({
                        activeLocation: null,
                        status: 'loading',
                        isLoading: true,
                        confirmLocation:
                            jest.fn(),
                    });


                await renderProvider();


                expect(
                    screen.getByTestId(
                        'preparedness-status',
                    ).props.children,
                ).toBe(
                    'loading',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-loading',
                    ).props.children,
                ).toBe(
                    'true',
                );

                expect(
                    loadPreparednessFeatureSnapshotMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'loads national preparedness data when no active location exists',
            async () => {
                loadPreparednessFeatureSnapshotMock
                    .mockResolvedValue(
                        noLocationSnapshot,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'preparedness-status',
                        ).props.children,
                    ).toBe(
                        'ready',
                    );
                });


                expect(
                    loadPreparednessFeatureSnapshotMock,
                ).toHaveBeenCalledWith(
                    null,
                );

                expect(
                    screen.getByTestId(
                        'preparedness-location',
                    ).props.children,
                ).toBe(
                    'none',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-mission-count',
                    ).props.children,
                ).toBe(
                    '2',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-task-codes',
                    ).props.children,
                ).toBe(
                    'first_aid_kit_ready',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-requires-location',
                    ).props.children,
                ).toBe(
                    'true',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-hazard-state',
                    ).props.children,
                ).toBe(
                    'null',
                );
            },
        );


        test(
            'loads and exposes the snapshot for the current active location',
            async () => {
                useActiveLocationMock
                    .mockReturnValue({
                        activeLocation:
                            jeddahLocation,
                        status: 'ready',
                        isLoading: false,
                        confirmLocation:
                            jest.fn(),
                    });

                loadPreparednessFeatureSnapshotMock
                    .mockResolvedValue(
                        jeddahSnapshot,
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'preparedness-status',
                        ).props.children,
                    ).toBe(
                        'ready',
                    );
                });


                expect(
                    loadPreparednessFeatureSnapshotMock,
                ).toHaveBeenCalledWith(
                    jeddahLocation,
                );

                expect(
                    screen.getByTestId(
                        'preparedness-location',
                    ).props.children,
                ).toBe(
                    '0124',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-task-codes',
                    ).props.children,
                ).toBe(
                    'first_aid_kit_ready,local_hazard_flood',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-requires-location',
                    ).props.children,
                ).toBe(
                    'false',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-hazard-state',
                    ).props.children,
                ).toBe(
                    '0',
                );
            },
        );


        test(
            'refreshes the current location through the shared feature loader',
            async () => {
                useActiveLocationMock
                    .mockReturnValue({
                        activeLocation:
                            jeddahLocation,
                        status: 'ready',
                        isLoading: false,
                        confirmLocation:
                            jest.fn(),
                    });

                loadPreparednessFeatureSnapshotMock
                    .mockResolvedValueOnce(
                        jeddahSnapshot,
                    )
                    .mockResolvedValueOnce({
                        ...jeddahSnapshot,
                        missions: [
                            nationalMissionResolution,
                        ],
                    });


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'preparedness-status',
                        ).props.children,
                    ).toBe(
                        'ready',
                    );
                });


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Refresh preparedness data',
                        },
                    ),
                );


                await waitFor(() => {
                    expect(
                        loadPreparednessFeatureSnapshotMock,
                    ).toHaveBeenCalledTimes(
                        2,
                    );
                });


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'preparedness-mission-count',
                        ).props.children,
                    ).toBe(
                        '1',
                    );
                });


                expect(
                    loadPreparednessFeatureSnapshotMock,
                ).toHaveBeenLastCalledWith(
                    jeddahLocation,
                );
            },
        );


        test(
            'enters error state and clears data when the current load fails',
            async () => {
                useActiveLocationMock
                    .mockReturnValue({
                        activeLocation:
                            jeddahLocation,
                        status: 'ready',
                        isLoading: false,
                        confirmLocation:
                            jest.fn(),
                    });

                loadPreparednessFeatureSnapshotMock
                    .mockRejectedValue(
                        new Error(
                            'preparedness unavailable',
                        ),
                    );


                await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'preparedness-status',
                        ).props.children,
                    ).toBe(
                        'error',
                    );
                });


                expect(
                    screen.getByTestId(
                        'preparedness-loading',
                    ).props.children,
                ).toBe(
                    'false',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-mission-count',
                    ).props.children,
                ).toBe(
                    '0',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-task-codes',
                    ).props.children,
                ).toBe(
                    'none',
                );
            },
        );


        test(
            'ignores an older location request that completes after a newer location request',
            async () => {
                const jeddahRequest =
                    createDeferredSnapshot();

                const makkahRequest =
                    createDeferredSnapshot();


                useActiveLocationMock
                    .mockReturnValue({
                        activeLocation:
                            jeddahLocation,
                        status: 'ready',
                        isLoading: false,
                        confirmLocation:
                            jest.fn(),
                    });

                loadPreparednessFeatureSnapshotMock
                    .mockReturnValueOnce(
                        jeddahRequest.promise,
                    )
                    .mockReturnValueOnce(
                        makkahRequest.promise,
                    );


                const {
                    rerender,
                } = await renderProvider();


                await waitFor(() => {
                    expect(
                        loadPreparednessFeatureSnapshotMock,
                    ).toHaveBeenCalledWith(
                        jeddahLocation,
                    );
                });


                useActiveLocationMock
                    .mockReturnValue({
                        activeLocation:
                            makkahLocation,
                        status: 'ready',
                        isLoading: false,
                        confirmLocation:
                            jest.fn(),
                    });


                await rerender(
                    <PreparednessDataProvider>
                        <PreparednessDataProbe />
                    </PreparednessDataProvider>,
                );


                await waitFor(() => {
                    expect(
                        loadPreparednessFeatureSnapshotMock,
                    ).toHaveBeenCalledWith(
                        makkahLocation,
                    );
                });


                /*
                 * The new location becomes visible immediately, while old mission
                 * data has been invalidated until its own snapshot is ready.
                 */
                expect(
                    screen.getByTestId(
                        'preparedness-location',
                    ).props.children,
                ).toBe(
                    '0002',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-mission-count',
                    ).props.children,
                ).toBe(
                    '0',
                );


                await act(async () => {
                    makkahRequest.resolve(
                        makkahSnapshot,
                    );

                    await makkahRequest.promise;
                });


                await waitFor(() => {
                    expect(
                        screen.getByTestId(
                            'preparedness-task-codes',
                        ).props.children,
                    ).toBe(
                        'first_aid_kit_ready,local_hazard_heat',
                    );
                });


                await act(async () => {
                    jeddahRequest.resolve(
                        jeddahSnapshot,
                    );

                    await jeddahRequest.promise;
                });


                /*
                 * The late Jeddah result must not replace the newer Makkah data.
                 */
                expect(
                    screen.getByTestId(
                        'preparedness-location',
                    ).props.children,
                ).toBe(
                    '0002',
                );

                expect(
                    screen.getByTestId(
                        'preparedness-task-codes',
                    ).props.children,
                ).toBe(
                    'first_aid_kit_ready,local_hazard_heat',
                );
            },
        );
    },
);
