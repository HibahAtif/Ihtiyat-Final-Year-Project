/// <reference types="jest" />

import {
    fireEvent,
    render,
    screen,
} from '@testing-library/react-native';

import {
    router,
} from 'expo-router';

import MissionsChecklistsScreen
    from '@/app/missions-checklists';

import {
    useAuth,
} from '@/auth/AuthenticationProvider';

import {
    useMissionProgress,
} from '@/features/preparedness/MissionProgressProvider';

import {
    usePreparednessData,
} from '@/features/preparedness/PreparednessDataProvider';

import {
    useAppLanguage,
} from '@/localization/AppLanguageProvider';

import {
	useResourceHub,
} from '@/features/resource-hub/ResourceHubProvider';

import type {
	ResourceHubCatalogue,
} from '@/features/resource-hub/resource-hub-types';

import type {
    LocalMissionTaskProgress,
} from '@/features/preparedness/mission-progress-local-repository';

import type {
    PreparednessMissionResolution,
} from '@/features/preparedness/preparedness-types';


/**
 * WHAT:
 * Replaces Expo Router navigation with deterministic Jest mocks.
 *
 * WHY:
 * This suite verifies that the Missions / Checklists screen requests the
 * correct route when a guest signs in or when an adaptive mission requires a
 * location. It should not initialise the real Expo Router runtime.
 *
 * HOW:
 * router.push() is observed directly while Stack.Screen is represented by a
 * harmless null component in case the production screen configures its header.
*/
jest.mock(
    'expo-router',
    () => ({
        router: {
            push:
                jest.fn(),
            back:
                jest.fn(),
        },

        Stack: {
            Screen:
                () => null,
        },
    }),
);


/**
 * WHAT:
 * Replaces application provider hooks with controllable test boundaries.
 *
 * WHY:
 * The provider implementations already have focused suites. These tests are
 * specifically concerned with how the production screen combines their public
 * contracts.
 *
 * HOW:
 * Each test supplies the exact catalogue, authentication, mission-progress and
 * language state required by the scenario.
*/
jest.mock(
    '@/auth/AuthenticationProvider',
    () => ({
        useAuth:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/PreparednessDataProvider',
    () => ({
        usePreparednessData:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/MissionProgressProvider',
    () => ({
        useMissionProgress:
            jest.fn(),
    }),
);


jest.mock(
    '@/localization/AppLanguageProvider',
    () => ({
        useAppLanguage:
            jest.fn(),
    }),
);


/**
 * AppText consumes the text-size hook internally. The screen tests do not need
 * to restore persisted accessibility preferences, so expose the normal
 * application text-size state directly.
 */
jest.mock(
    '@/accessibility/AppTextSizeProvider',
    () => ({
        useAppTextSize:
            jest.fn(
                () => ({
                    textSizePreference:
                        'system',
                }),
            ),
    }),
);

jest.mock(
	'@/features/resource-hub/ResourceHubProvider',
	() => ({
		useResourceHub: jest.fn(),
	}),
);

jest.mock('@expo/vector-icons', () => ({
	Ionicons: () => null,
}));

jest.mock('@/components/AppBottomNavigation', () => ({
	AppBottomNavigation: () => null,
}));

const useAuthMock =
    useAuth as jest.MockedFunction<
        typeof useAuth
    >;


const usePreparednessDataMock =
    usePreparednessData as jest.MockedFunction<
        typeof usePreparednessData
    >;


const useMissionProgressMock =
    useMissionProgress as jest.MockedFunction<
        typeof useMissionProgress
    >;


const useAppLanguageMock =
    useAppLanguage as jest.MockedFunction<
        typeof useAppLanguage
    >;

const useResourceHubMock =
	useResourceHub as jest.MockedFunction<
		typeof useResourceHub
	>;


const routerPushMock =
    router.push as jest.MockedFunction<
        typeof router.push
    >;


const preparednessRefreshMock =
    jest.fn<
        Promise<void>,
        []
    >();


const missionProgressRefreshMock =
    jest.fn<
        Promise<void>,
        []
    >();

const resourceHubRefreshMock = jest.fn<Promise<void>, []>();


const setTaskCompletionMock =
    jest.fn<
        Promise<boolean>,
        [
            number,
            boolean,
        ]
    >();


const USER_ID =
    '11111111-1111-1111-1111-111111111111';


const missionResolution:
    PreparednessMissionResolution = {
        mission: {
            id:
                10,
            code:
                'household_emergency_kit',
            title_en:
                'Household Emergency Kit',
            title_ar:
                'حقيبة الطوارئ المنزلية',
            description_en:
                'Prepare essential supplies before an emergency.',
            description_ar:
                'جهّز المستلزمات الأساسية قبل حالة الطوارئ.',
            mission_scope:
                'national',
            sort_order:
                10,
            is_active:
                true,
        },

        tasks: [
            {
                id:
                    101,
                mission_id:
                    10,
                hazard_id:
                    null,
                code:
                    'store_drinking_water',
                title_en:
                    'Store drinking water',
                title_ar:
                    'خزّن مياه الشرب',
                detail_en:
                    'Keep an appropriate emergency supply of drinking water.',
                detail_ar:
                    'احتفظ بكمية مناسبة من مياه الشرب للطوارئ.',
                points:
                    10,
                sort_order:
                    10,
                is_active:
                    true,
            },
            {
                id:
                    102,
                mission_id:
                    10,
                hazard_id:
                    null,
                code:
                    'prepare_flashlight',
                title_en:
                    'Prepare a flashlight',
                title_ar:
                    'جهّز مصباحاً يدوياً',
                detail_en:
                    'Keep a working flashlight somewhere easy to reach.',
                detail_ar:
                    'احتفظ بمصباح يدوي يعمل في مكان يسهل الوصول إليه.',
                points:
                    20,
                sort_order:
                    20,
                is_active:
                    true,
            },
        ],

        requiresLocation:
            false,
    };


const locationRequiredMission:
    PreparednessMissionResolution = {
        mission: {
            id:
                20,
            code:
                'know_local_hazards',
            title_en:
                'Know Your Local Hazards',
            title_ar:
                'تعرّف على المخاطر المحلية',
            description_en:
                'Learn about hazards relevant to your selected location.',
            description_ar:
                'تعرّف على المخاطر المرتبطة بموقعك المختار.',
            mission_scope:
                'adaptive',
            sort_order:
                20,
            is_active:
                true,
        },

        /*
         * General tasks can still be returned by the adaptive resolver while
         * location-specific hazard tasks wait for location selection.
         */
        tasks: [
            {
                id:
                    201,
                mission_id:
                    20,
                hazard_id:
                    null,
                code:
                    'know_official_sources',
                title_en:
                    'Know official warning sources',
                title_ar:
                    'تعرّف على مصادر التحذير الرسمية',
                detail_en:
                    null,
                detail_ar:
                    null,
                points:
                    10,
                sort_order:
                    10,
                is_active:
                    true,
            },
        ],

        requiresLocation:
            true,
    };


function createProgress(
    taskId: number,
    isCompleted: boolean,
): LocalMissionTaskProgress {
    /*
     * Arbitrary fixed dates keep the fixture deterministic. Their calendar
     * value has no significance to the screen behaviour being tested.
     */
    return {
        user_id:
            USER_ID,

        task_id:
            taskId,

        is_completed:
            isCompleted,

        completed_at:
            isCompleted
                ? '2024-02-15T10:30:00.000Z'
                : null,

        updated_at:
            '2024-02-15T10:30:00.000Z',
    };
}

const emptyResourceHubCatalogue: ResourceHubCatalogue = {
	topics: [],
	resources: [],
	sources: [],
	topicLinks: [],
	hazardLinks: [],
	locationLinks: [],
	missionTaskLinks: [],
	quizQuestionLinks: [],
};


const linkedResourceHubCatalogue: ResourceHubCatalogue = {
	topics: [],

	resources: [
		{
			id: 501,
			code: 'emergency_water_preparation',
			title_en: 'Emergency water preparation',
			title_ar: 'الاستعداد لمياه الطوارئ',
			summary_en: 'Prepare safe drinking water before an emergency.',
			summary_ar: 'جهّز مياه شرب آمنة قبل حالة الطوارئ.',
			content_en: 'Reviewed emergency water guidance.',
			content_ar: 'إرشادات تمت مراجعتها لمياه الطوارئ.',
			publication_status: 'published',
			sort_order: 10,
			last_reviewed_on: '2026-09-25',
			published_at: '2026-09-25T00:00:00+00:00',
		},
		{
			id: 502,
			code: 'household_emergency_supplies',
			title_en: 'Household emergency supplies',
			title_ar: 'مستلزمات الطوارئ المنزلية',
			summary_en: 'Prepare useful household emergency supplies.',
			summary_ar: 'جهّز مستلزمات منزلية مفيدة للطوارئ.',
			content_en: 'Reviewed household preparedness guidance.',
			content_ar: 'إرشادات منزلية للاستعداد تمت مراجعتها.',
			publication_status: 'published',
			sort_order: 20,
			last_reviewed_on: '2026-09-25',
			published_at: '2026-09-25T00:00:00+00:00',
		},
	],

	sources: [],
	topicLinks: [],
	hazardLinks: [],
	locationLinks: [],

	/*
	 * Supporting is deliberately placed first and given a lower sort_order.
	 * The real derivation layer must still return primary guidance first.
	*/
	missionTaskLinks: [
		{
			task_id: 101,
			resource_id: 502,
			link_role: 'supporting',
			sort_order: 1,
		},
		{
			task_id: 101,
			resource_id: 501,
			link_role: 'primary',
			sort_order: 99,
		},
	],

	quizQuestionLinks: [],
};

const repeatedMissionGuidanceCatalogue:ResourceHubCatalogue = {
	...linkedResourceHubCatalogue,
		missionTaskLinks: [
			{
				task_id: 101,
				resource_id: 501,
				link_role: 'primary',
				sort_order: 10,
			},
			{
				task_id: 102,
				resource_id: 501,
				link_role: 'primary',
				sort_order: 10,
			},
		],
};


const englishTranslations:
    Record<
        string,
        string
    > = {
        'preparedness.title':
            'Preparedness Missions',

        'preparedness.subtitle':
            'Complete practical checklists to build your preparedness.',

        'preparedness.loading':
            'Loading preparedness missions…',

        'preparedness.loadError':
            'Preparedness missions could not be loaded. Please try again.',

        'preparedness.retry':
            'Try again',

        'preparedness.noMissions':
            'No preparedness missions are available right now.',

        'preparedness.progress':
            'Mission completion',

        'preparedness.tasksCompleted':
            'Tasks completed',

        'preparedness.readinessPoints':
            'Readiness points',

        'preparedness.pendingSync':
            'Pending sync',

        'preparedness.signInToSave':
            'Sign in to save checklist progress and unlock achievements.',

        'preparedness.signIn':
            'Sign in to save progress',

        'preparedness.progressLoadError':
            'Your saved mission progress could not be loaded. You can still read the preparedness guidance.',

        'preparedness.progressLoading':
            'Loading saved progress…',

        'preparedness.locationRequired':
            'Choose a location to see the hazard-specific tasks for this mission.',

        'preparedness.chooseLocation':
            'Choose location',

        'preparedness.taskSaveError':
            'This checklist change could not be saved. Please try again.',
        'achievements.title':
	        'Progress & Achievements',

        'preparedness.relatedGuidance':
            'Related guidance',

        'preparedness.primaryGuidance':
            'Primary guidance',

        'preparedness.supportingGuidance':
            'Supporting guidance',

        'resourceHub.readGuidance':
            'Read guidance',
    };


const arabicTranslations:
    Record<
        string,
        string
    > = {
        'preparedness.title':
            'مهام الاستعداد',

        'preparedness.subtitle':
            'أكمل قوائم عملية لتعزيز استعدادك.',

        'preparedness.loading':
            'جارٍ تحميل مهام الاستعداد…',

        'preparedness.loadError':
            'تعذر تحميل مهام الاستعداد. يرجى المحاولة مرة أخرى.',

        'preparedness.retry':
            'المحاولة مرة أخرى',

        'preparedness.noMissions':
            'لا توجد مهام استعداد متاحة حالياً.',

        'preparedness.progress':
            'إكمال المهمة',

        'preparedness.tasksCompleted':
            'المهام المكتملة',

        'preparedness.readinessPoints':
            'نقاط الاستعداد',

        'preparedness.pendingSync':
            'بانتظار المزامنة',

        'preparedness.signInToSave':
            'سجّل الدخول لحفظ تقدم قائمة المهام وفتح الإنجازات.',

        'preparedness.signIn':
            'تسجيل الدخول لحفظ التقدم',

        'preparedness.progressLoadError':
            'تعذر تحميل تقدم المهمة المحفوظ. لا يزال بإمكانك قراءة إرشادات الاستعداد.',

        'preparedness.progressLoading':
            'جارٍ تحميل التقدم المحفوظ…',

        'preparedness.locationRequired':
            'اختر موقعاً لعرض المهام الخاصة بالمخاطر لهذه المهمة.',

        'preparedness.chooseLocation':
            'اختر الموقع',

        'preparedness.taskSaveError':
            'تعذر حفظ هذا التغيير في قائمة المهام. يرجى المحاولة مرة أخرى.',

        'achievements.title':
	        'التقدم والإنجازات',

        'preparedness.relatedGuidance':
            'إرشادات ذات صلة',

        'preparedness.primaryGuidance':
            'إرشادات رئيسية',

        'preparedness.supportingGuidance':
            'إرشادات داعمة',

        'resourceHub.readGuidance':
            'قراءة الإرشادات',
    };


function setLanguage(
    language:
        'en'
        | 'ar',
): void {
    const translations =
        language === 'ar'
            ? arabicTranslations
            : englishTranslations;


    useAppLanguageMock.mockReturnValue({
        language,

        direction:
            language === 'ar'
                ? 'rtl'
                : 'ltr',

        isRTL:
            language === 'ar',

        setLanguage:
            jest.fn(),

        toggleLanguage:
            jest.fn(),

        translate:
            (
                key: string,
            ): string =>
                translations[key]
                ?? key,
    });
}


function setGuestAuth(): void {
    useAuthMock.mockReturnValue({
        session:
            null,

        user:
            null,

        isAuthenticated:
            false,

        isLoading:
            false,
    });
}


function setAuthenticatedAuth(): void {
    useAuthMock.mockReturnValue({
        session:
            {} as NonNullable<
                ReturnType<
                    typeof useAuth
                >['session']
            >,

        user: {
            id:
                USER_ID,
        } as NonNullable<
            ReturnType<
                typeof useAuth
            >['user']
        >,

        isAuthenticated:
            true,

        isLoading:
            false,
    });
}


function setPreparednessReady(
    missions:
        PreparednessMissionResolution[] = [
            missionResolution,
        ],
): void {
    usePreparednessDataMock.mockReturnValue({
        activeLocation:
            null,

        missions,

        resolvedHazards:
            null,

        status:
            'ready',

        isLoading:
            false,

        refresh:
            preparednessRefreshMock,
    });
}


function setProgressReady(
    progress:
        LocalMissionTaskProgress[] = [],
    pendingTaskIds:
        number[] = [],
): void {
    useMissionProgressMock.mockReturnValue({
        progress,

        pendingTaskIds,

        status:
            'ready',

        isLoading:
            false,

        refresh:
            missionProgressRefreshMock,

        setTaskCompletion:
            setTaskCompletionMock,
    });
}

function setResourceHubReady(
	catalogue: ResourceHubCatalogue = emptyResourceHubCatalogue,
): void {
	useResourceHubMock.mockReturnValue({
		catalogue,
		source: 'remote',
		status: 'ready',
		isLoading: false,
		refresh: resourceHubRefreshMock,
	});
}


describe(
    'MissionsChecklistsScreen',
    () => {
        beforeEach(
            () => {
                jest.clearAllMocks();

                preparednessRefreshMock.mockResolvedValue(undefined,);

                missionProgressRefreshMock.mockResolvedValue(undefined,);

                setTaskCompletionMock.mockResolvedValue(true,);

                resourceHubRefreshMock.mockResolvedValue(undefined);

                setLanguage('en',);
                setGuestAuth();
                setPreparednessReady();
                setResourceHubReady();
                setProgressReady();

            },
        );


        test(
            'shows a loading state while the public preparedness catalogue is loading',
            async () => {
                usePreparednessDataMock.mockReturnValue({
                    activeLocation:
                        null,

                    missions:
                        [],

                    resolvedHazards:
                        null,

                    status:
                        'loading',

                    isLoading:
                        true,

                    refresh:
                        preparednessRefreshMock,
                });


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getByText(
                        'Loading preparedness missions…',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'shows a public-data error with a working retry action',
            async () => {
                usePreparednessDataMock.mockReturnValue({
                    activeLocation:
                        null,

                    missions:
                        [],

                    resolvedHazards:
                        null,

                    status:
                        'error',

                    isLoading:
                        false,

                    refresh:
                        preparednessRefreshMock,
                });


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getByText(
                        'Preparedness missions could not be loaded. Please try again.',
                    ),
                ).toBeTruthy();


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Try again',
                        },
                    ),
                );


                expect(
                    preparednessRefreshMock,
                ).toHaveBeenCalledTimes(
                    1,
                );
            },
        );


        test(
            'keeps mission guidance visible to guests and disables private checklist persistence',
            async () => {
                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getByText(
                        'Household Emergency Kit',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'Store drinking water',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'Prepare a flashlight',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Sign in to save checklist progress and unlock achievements.',
                    ),
                ).toBeTruthy();


                const firstTaskCheckbox =
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Store drinking water',
                        },
                    );


                expect(
                    firstTaskCheckbox
                        .props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        checked:
                            false,

                        disabled:
                            true,
                    }),
                );


                expect(
                    setTaskCompletionMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'routes a guest to sign in from the progress-saving call to action',
            async () => {
                await render(
                    <MissionsChecklistsScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Sign in to save progress',
                        },
                    ),
                );


                expect(
                    routerPushMock,
                ).toHaveBeenCalledWith(
                    '/sign-in',
                );
            },
        );

        test(
            'routes to Progress & Achievements from the Missions screen',
            async () => {
                await render(
                    <MissionsChecklistsScreen />,
                );

                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Progress & Achievements',
                        },
                    ),
                );

                expect(
                    routerPushMock,
                ).toHaveBeenCalledWith(
                    '/progress-achievements',
                );
            },
        );


        test(
            'shows authenticated mission completion counts percentage points and checklist state',
            async () => {
                setAuthenticatedAuth();

                setProgressReady(
                    [
                        createProgress(
                            101,
                            true,
                        ),

                        createProgress(
                            102,
                            false,
                        ),
                    ],
                );


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getByText(
                        'Mission completion',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        '50%',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'Tasks completed',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        '1 / 2',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'Readiness points',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        '10 / 30',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Store drinking water',
                        },
                    )
                        .props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        checked:
                            true,

                        disabled:
                            false,
                    }),
                );


                expect(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Prepare a flashlight',
                        },
                    )
                        .props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        checked:
                            false,

                        disabled:
                            false,
                    }),
                );
            },
        );


        test(
            'persists the next completion state when an authenticated user presses a checklist task',
            async () => {
                setAuthenticatedAuth();

                setProgressReady(
                    [
                        createProgress(
                            101,
                            false,
                        ),
                    ],
                );


                await render(
                    <MissionsChecklistsScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Store drinking water',
                        },
                    ),
                );


                expect(
                    setTaskCompletionMock,
                ).toHaveBeenCalledTimes(
                    1,
                );

                expect(
                    setTaskCompletionMock,
                ).toHaveBeenCalledWith(
                    101,
                    true,
                );
            },
        );


        test(
            'shows pending synchronisation as text and on the relevant task state',
            async () => {
                setAuthenticatedAuth();

                setProgressReady(
                    [
                        createProgress(
                            101,
                            true,
                        ),

                        createProgress(
                            102,
                            true,
                        ),
                    ],
                    [
                        102,
                    ],
                );


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getAllByText(
                        'Pending sync',
                    ).length,
                ).toBeGreaterThan(
                    0,
                );


                expect(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Prepare a flashlight',
                        },
                    )
                        .props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        checked:
                            true,
                    }),
                );
            },
        );


        test(
            'keeps public mission content visible when authenticated progress fails to load',
            async () => {
                setAuthenticatedAuth();


                useMissionProgressMock.mockReturnValue({
                    progress:
                        [],

                    pendingTaskIds:
                        [],

                    status:
                        'error',

                    isLoading:
                        false,

                    refresh:
                        missionProgressRefreshMock,

                    setTaskCompletion:
                        setTaskCompletionMock,
                });


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getByText(
                        'Household Emergency Kit',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'Store drinking water',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'Your saved mission progress could not be loaded. You can still read the preparedness guidance.',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'shows a location requirement without hiding the adaptive mission general guidance',
            async () => {
                setPreparednessReady(
                    [
                        locationRequiredMission,
                    ],
                );


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getByText(
                        'Know Your Local Hazards',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'Know official warning sources',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'Choose a location to see the hazard-specific tasks for this mission.',
                    ),
                ).toBeTruthy();


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Choose location',
                        },
                    ),
                );


                expect(
                    routerPushMock,
                ).toHaveBeenCalledWith(
                    '/location-selection',
                );
            },
        );


        test(
            'uses Arabic mission and task content when Arabic is active',
            async () => {
                setLanguage(
                    'ar',
                );


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getByText(
                        'مهام الاستعداد',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'حقيبة الطوارئ المنزلية',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByText(
                        'خزّن مياه الشرب',
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'خزّن مياه الشرب',
                        },
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name: 'التقدم والإنجازات',
                        },
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'shows an explicit empty state when no missions are available',
            async () => {
                setPreparednessReady(
                    [],
                );


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getByText(
                        'No preparedness missions are available right now.',
                    ),
                ).toBeTruthy();
            },
        );

        test(
            'renders canonical mission-task Resource Hub guidance with primary guidance before supporting guidance',
            async () => {
                setResourceHubReady(linkedResourceHubCatalogue);

                await render(
                    <MissionsChecklistsScreen />,
                );

                expect(
                    screen.getByText('Related guidance'),
                ).toBeTruthy();

                expect(
                    screen.getByText('Primary guidance'),
                ).toBeTruthy();

                expect(
                    screen.getByText('Supporting guidance'),
                ).toBeTruthy();

                expect(
                    screen.getByText('Emergency water preparation'),
                ).toBeTruthy();

                expect(
                    screen.getByText('Household emergency supplies'),
                ).toBeTruthy();

                const guidanceButtons =
                    screen.getAllByRole('button').filter(
                        (element) =>
                            typeof element.props.accessibilityLabel === 'string'
                            && element.props.accessibilityLabel.startsWith(
                                'Read guidance:',
                            ),
                    );

                expect(
                    guidanceButtons.map(
                        (element) => element.props.accessibilityLabel,
                    ),
                ).toEqual([
                    'Read guidance: Emergency water preparation',
                    'Read guidance: Household emergency supplies',
                ]);
            },
        );


        test(
            'does not invent related guidance for tasks without canonical Resource Hub relationships',
            async () => {
                setResourceHubReady(emptyResourceHubCatalogue);

                await render(
                    <MissionsChecklistsScreen />,
                );

                expect(
                    screen.queryByText('Related guidance'),
                ).toBeNull();

                expect(
                    screen.queryByText('Emergency water preparation'),
                ).toBeNull();

                expect(
                    screen.queryByText('Household emergency supplies'),
                ).toBeNull();
            },
        );


        test(
            'navigates to the canonical Resource Hub detail route without changing mission completion',
            async () => {
                setAuthenticatedAuth();
                setProgressReady();
                setResourceHubReady(linkedResourceHubCatalogue);

                await render(
                    <MissionsChecklistsScreen />,
                );

                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Read guidance: Emergency water preparation',
                        },
                    ),
                );

                expect(
                    routerPushMock,
                ).toHaveBeenCalledWith({
                    pathname: '/resource-hub-resource-detail',
                    params: {
                        resourceId: '501',
                    },
                });

                expect(
                    setTaskCompletionMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'keeps related safety guidance available to guests even though checklist persistence is disabled',
            async () => {
                setGuestAuth();
                setResourceHubReady(linkedResourceHubCatalogue);

                await render(
                    <MissionsChecklistsScreen />,
                );

                expect(
                    screen.getByRole(
                        'checkbox',
                        {
                            name: 'Store drinking water',
                        },
                    ).props.accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        disabled: true,
                    }),
                );

                const guidanceButton =
                    screen.getByRole(
                        'button',
                        {
                            name: 'Read guidance: Emergency water preparation',
                        },
                    );

                expect(
                    guidanceButton,
                ).toBeTruthy();

                await fireEvent.press(
                    guidanceButton,
                );

                expect(
                    routerPushMock,
                ).toHaveBeenCalledWith({
                    pathname: '/resource-hub-resource-detail',
                    params: {
                        resourceId: '501',
                    },
                });

                expect(
                    setTaskCompletionMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'renders Arabic related-resource titles and relationship labels when Arabic is active',
            async () => {
                setLanguage('ar');
                setResourceHubReady(linkedResourceHubCatalogue);

                await render(
                    <MissionsChecklistsScreen />,
                );

                expect(
                    screen.getByText('إرشادات ذات صلة'),
                ).toBeTruthy();

                expect(
                    screen.getByText('إرشادات رئيسية'),
                ).toBeTruthy();

                expect(
                    screen.getByText('إرشادات داعمة'),
                ).toBeTruthy();

                expect(
                    screen.getByText('الاستعداد لمياه الطوارئ'),
                ).toBeTruthy();

                expect(
                    screen.getByText('مستلزمات الطوارئ المنزلية'),
                ).toBeTruthy();

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'قراءة الإرشادات: الاستعداد لمياه الطوارئ',
                        },
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'keeps Missions usable while the independent Resource Hub catalogue is loading',
            async () => {
                useResourceHubMock.mockReturnValue({
                    catalogue: null,
                    source: null,
                    status: 'loading',
                    isLoading: true,
                    refresh: resourceHubRefreshMock,
                });

                await render(
                    <MissionsChecklistsScreen />,
                );

                expect(
                    screen.getByText('Household Emergency Kit'),
                ).toBeTruthy();

                expect(
                    screen.getByText('Store drinking water'),
                ).toBeTruthy();

                expect(
                    screen.getByRole(
                        'checkbox',
                        {
                            name: 'Store drinking water',
                        },
                    ),
                ).toBeTruthy();

                expect(
                    screen.queryByText('Related guidance'),
                ).toBeNull();
            },
        );


        test(
            'keeps Missions usable when the independent Resource Hub catalogue is unavailable',
            async () => {
                useResourceHubMock.mockReturnValue({
                    catalogue: null,
                    source: null,
                    status: 'error',
                    isLoading: false,
                    refresh: resourceHubRefreshMock,
                });

                await render(
                    <MissionsChecklistsScreen />,
                );

                expect(
                    screen.getByText('Household Emergency Kit'),
                ).toBeTruthy();

                expect(
                    screen.getByText('Prepare a flashlight'),
                ).toBeTruthy();

                expect(
                    screen.queryByText('Related guidance'),
                ).toBeNull();

                expect(
                    preparednessRefreshMock,
                ).not.toHaveBeenCalled();

                expect(
                    resourceHubRefreshMock,
                ).not.toHaveBeenCalled();
            },
        );


        test(
            'preserves authenticated checklist completion behaviour when related guidance is present',
            async () => {
                setAuthenticatedAuth();

                setProgressReady([
                    createProgress(
                        101,
                        false,
                    ),
                ]);

                setResourceHubReady(linkedResourceHubCatalogue);

                await render(
                    <MissionsChecklistsScreen />,
                );

                expect(
                    screen.getByText('Related guidance'),
                ).toBeTruthy();

                await fireEvent.press(
                    screen.getByRole(
                        'checkbox',
                        {
                            name: 'Store drinking water',
                        },
                    ),
                );

                expect(
                    setTaskCompletionMock,
                ).toHaveBeenCalledTimes(1);

                expect(
                    setTaskCompletionMock,
                ).toHaveBeenCalledWith(
                    101,
                    true,
                );

                expect(
                    routerPushMock,
                ).not.toHaveBeenCalled();
            },
        );

        test(
            'does not repeat the same Resource Hub guidance beneath several tasks in one mission',
            async () => {
                setResourceHubReady(
                    repeatedMissionGuidanceCatalogue,
                );


                await render(
                    <MissionsChecklistsScreen />,
                );


                expect(
                    screen.getAllByText(
                        'Emergency water preparation',
                    ),
                ).toHaveLength(
                    1,
                );


                expect(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Read guidance: Emergency water preparation',
                        },
                    ),
                ).toHaveLength(
                    1,
                );
            },
        );
    },
);