/// <reference types="jest" />

import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react-native';

import {
    router,
} from 'expo-router';

import PreparednessQuizScreen
    from '@/app/preparedness-quiz';

import {
    useAuth,
} from '@/auth/AuthenticationProvider';

import {
    useQuizData,
} from '@/features/preparedness/QuizDataProvider';

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
    QuizOption,
    QuizQuestion,
    QuizSubmissionResult,
    UserQuizProgress,
} from '@/features/preparedness/quiz-types';


/**
 * Replaces Expo Router with deterministic navigation mocks.
 *
 * This suite tests Quiz-screen behaviour rather than the Expo Router runtime.
 *
 * Navigation calls are observed directly and Stack.Screen is represented by a
 * harmless component.
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
 * Replaces application state providers with controllable Jest boundaries.
 *
 * Authentication, QuizDataProvider and localisation already have their own
 * focused tests. This suite verifies how the production Quiz screen combines
 * those contracts.
 */
jest.mock(
    '@/auth/AuthenticationProvider',
    () => ({
        useAuth:
            jest.fn(),
    }),
);


jest.mock(
    '@/features/preparedness/QuizDataProvider',
    () => ({
        useQuizData:
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

jest.mock('@expo/vector-icons', () => ({
	Ionicons: () => null,
}));

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
		useResourceHub:
			jest.fn(),
	}),
);


const useAuthMock =
    useAuth as jest.MockedFunction<
        typeof useAuth
    >;


const useQuizDataMock =
    useQuizData as jest.MockedFunction<
        typeof useQuizData
    >;


const useAppLanguageMock =
    useAppLanguage as jest.MockedFunction<
        typeof useAppLanguage
    >;


const routerPushMock =
    router.push as jest.MockedFunction<
        typeof router.push
    >;

const useResourceHubMock =
	useResourceHub as jest.MockedFunction<
		typeof useResourceHub
	>;


const quizRefreshMock =
    jest.fn<
        Promise<void>,
        []
    >();


const submitAnswerMock =
    jest.fn<
        Promise<QuizSubmissionResult>,
        [
            number,
            number[],
        ]
    >();

const resourceHubRefreshMock =
	jest.fn<
		Promise<void>,
		[]
	>();


const USER_ID =
    '11111111-1111-1111-1111-111111111111';


const singleSelectQuestion:
    QuizQuestion = {
        id:
            301,

        mission_id:
            10,

        hazard_id:
            4,

        code:
            'flood_rising_water_action',

        question_type:
            'single_select',

        prompt_en:
            'What should you do if floodwater begins rising around your home?',

        prompt_ar:
            'ماذا ينبغي أن تفعل إذا بدأت مياه الفيضان ترتفع حول منزلك؟',

        sort_order:
            10,

        is_active:
            true,
    };


const multiSelectQuestion:
    QuizQuestion = {
        id:
            302,

        mission_id:
            10,

        hazard_id:
            null,

        code:
            'basic_emergency_kit_items',

        question_type:
            'multi_select',

        prompt_en:
            'Which items belong in a basic emergency kit?',

        prompt_ar:
            'ما العناصر التي ينبغي أن تكون ضمن حقيبة طوارئ أساسية؟',

        sort_order:
            20,

        is_active:
            true,
    };


const quizQuestions:
    QuizQuestion[] = [
        singleSelectQuestion,
        multiSelectQuestion,
    ];


const quizOptions:
    QuizOption[] = [
        {
            id:
                3011,

            question_id:
                301,

            option_code:
                'move_higher',

            text_en:
                'Move to a safe higher level if it is safe to do so.',

            text_ar:
                'انتقل إلى مستوى مرتفع وآمن إذا كان ذلك آمناً.',

            sort_order:
                10,
        },

        {
            id:
                3012,

            question_id:
                301,

            option_code:
                'drive_through_water',

            text_en:
                'Drive through the floodwater to leave quickly.',

            text_ar:
                'قد السيارة عبر مياه الفيضان للمغادرة بسرعة.',

            sort_order:
                20,
        },

        {
            id:
                3021,

            question_id:
                302,

            option_code:
                'drinking_water',

            text_en:
                'Store drinking water.',

            text_ar:
                'احتفظ بمياه للشرب.',

            sort_order:
                10,
        },

        {
            id:
                3022,

            question_id:
                302,

            option_code:
                'working_flashlight',

            text_en:
                'Keep a working flashlight.',

            text_ar:
                'احتفظ بمصباح يدوي يعمل.',

            sort_order:
                20,
        },

        {
            id:
                3023,

            question_id:
                302,

            option_code:
                'decorative_item',

            text_en:
                'Pack a decorative household item.',

            text_ar:
                'ضع قطعة منزلية للزينة.',

            sort_order:
                30,
        },
    ];


/*
 * Arbitrary fixed timestamps keep this fixture deterministic. Their calendar
 * values have no significance to Quiz-screen behaviour.
 */
const FIRST_ATTEMPTED_AT =
    '2037-11-18T04:23:17.000Z';

const LAST_ATTEMPTED_AT =
    '2037-11-21T16:41:52.000Z';


const savedQuizProgress:
    UserQuizProgress[] = [
        {
            user_id:
                USER_ID,

            question_id:
                301,

            has_correct_answer:
                true,

            attempt_count:
                3,

            first_attempted_at:
                FIRST_ATTEMPTED_AT,

            last_attempted_at:
                LAST_ATTEMPTED_AT,
        },
    ];


const guestCorrectSingleResult:
    QuizSubmissionResult = {
        question_id:
            301,

        is_correct:
            true,

        progress_recorded:
            false,

        has_correct_answer:
            null,

        attempt_count:
            null,

        first_attempted_at:
            null,

        last_attempted_at:
            null,

        explanation_en:
            'Moving to a safe higher level reduces exposure to rising floodwater.',

        explanation_ar:
            'الانتقال إلى مستوى مرتفع وآمن يقلل التعرض لمياه الفيضان المتصاعدة.',

        correct_option_ids: [
            3011,
        ],
    };


const guestIncorrectSingleResult: QuizSubmissionResult = {
    question_id:
        301,

    is_correct:
        false,

    progress_recorded:
        false,

    has_correct_answer:
        null,

    attempt_count:
        null,

    first_attempted_at:
        null,

    last_attempted_at:
        null,

    explanation_en:
        'Driving through floodwater is dangerous because its depth and force can be difficult to judge.',

    explanation_ar:
        'القيادة عبر مياه الفيضان خطرة لأن عمق المياه وقوتها قد يصعب تقديرهما.',

    correct_option_ids: [
        3011,
    ],
};


const guestCorrectMultiResult: QuizSubmissionResult = {
    question_id:
        302,

    is_correct:
        true,

    progress_recorded:
        false,

    has_correct_answer:
        null,

    attempt_count:
        null,

    first_attempted_at:
        null,

    last_attempted_at:
        null,

    explanation_en:
        'Drinking water and a working flashlight are practical emergency supplies.',

    explanation_ar:
        'مياه الشرب والمصباح اليدوي العامل من المستلزمات العملية للطوارئ.',

    correct_option_ids: [
        3021,
        3022,
    ],
};

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
			id: 701,
			code: 'flood_response_guidance',
			title_en: 'Flood response guidance',
			title_ar: 'إرشادات الاستجابة للسيول',
			summary_en:
				'Reviewed guidance for responding safely to flood conditions.',
			summary_ar:
				'إرشادات تمت مراجعتها للاستجابة الآمنة لظروف السيول.',
			content_en:
				'Reviewed flood response guidance.',
			content_ar:
				'إرشادات استجابة للسيول تمت مراجعتها.',
			publication_status: 'published',
			sort_order: 10,
			last_reviewed_on: '2026-09-25',
			published_at: '2026-09-25T00:00:00+00:00',
		},
		{
			id: 702,
			code: 'floodwater_safety_reference',
			title_en: 'Floodwater safety reference',
			title_ar: 'مرجع السلامة من مياه السيول',
			summary_en:
				'Additional reviewed floodwater safety information.',
			summary_ar:
				'معلومات إضافية تمت مراجعتها حول السلامة من مياه السيول.',
			content_en:
				'Supporting floodwater safety guidance.',
			content_ar:
				'إرشادات داعمة للسلامة من مياه السيول.',
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
	missionTaskLinks: [],

	/*
	 * Supporting is deliberately stored first and with the lower sort order.
	 * The real derivation selector must still place primary guidance first.
	 */
	quizQuestionLinks: [
		{
			question_id: 301,
			resource_id: 702,
			link_role: 'supporting',
			sort_order: 1,
		},
		{
			question_id: 301,
			resource_id: 701,
			link_role: 'primary',
			sort_order: 99,
		},
	],
};


const englishTranslations: Record< string, string > = {
    'common.back':
        'Back',

    'quiz.title':
        'Preparedness Quiz',

    'quiz.subtitle':
        'Check your understanding of practical preparedness guidance.',

    'quiz.loading':
        'Loading preparedness questions…',

    'quiz.loadError':
        'Preparedness questions could not be loaded. Please try again.',

    'quiz.retry':
        'Try again',

    'quiz.noQuestions':
        'No preparedness questions are available right now.',

    'quiz.singleSelectInstruction':
        'Choose one answer.',

    'quiz.multiSelectInstruction':
        'Choose all answers that apply.',

    'quiz.checkAnswer':
        'Check answer',

    'quiz.checkingAnswer':
        'Checking answer…',

    'quiz.correct':
        'Correct',

    'quiz.incorrect':
        'Incorrect',

    'quiz.correctAnswer':
        'Correct answer',

    'quiz.correctAnswers':
        'Correct answers',

    'quiz.signInToSave':
        'Sign in to save quiz progress and attempts.',

    'quiz.signIn':
        'Sign in to save quiz progress',

    'quiz.progressLoading':
        'Loading saved quiz progress…',

    'quiz.progressLoadError':
        'Your saved quiz progress could not be loaded. You can still answer preparedness questions.',

    'quiz.solved':
        'Solved',

    'quiz.attempts':
        'Attempts',

    'quiz.connectionRequired':
        'A connection is required to check this answer. Your selection has been kept so you can try again.',

    'quiz.reviewRelatedGuidance':
        'Review related guidance',

    'quiz.relatedGuidanceExplanation':
        'Use the reviewed guidance below to reinforce what you have just learned.',

    'quiz.primaryGuidance':
        'Primary guidance',

    'quiz.supportingGuidance':
        'Supporting guidance',

    'resourceHub.readGuidance':
        'Read guidance',
};


const arabicTranslations: Record< string, string > = {
    'common.back':
        'رجوع',

    'quiz.title':
        'اختبار الاستعداد',

    'quiz.subtitle':
        'تحقق من فهمك لإرشادات الاستعداد العملية.',

    'quiz.loading':
        'جارٍ تحميل أسئلة الاستعداد…',

    'quiz.loadError':
        'تعذر تحميل أسئلة الاستعداد. يرجى المحاولة مرة أخرى.',

    'quiz.retry':
        'المحاولة مرة أخرى',

    'quiz.noQuestions':
        'لا توجد أسئلة استعداد متاحة حالياً.',

    'quiz.singleSelectInstruction':
        'اختر إجابة واحدة.',

    'quiz.multiSelectInstruction':
        'اختر جميع الإجابات المناسبة.',

    'quiz.checkAnswer':
        'تحقق من الإجابة',

    'quiz.checkingAnswer':
        'جارٍ التحقق من الإجابة…',

    'quiz.correct':
        'صحيح',

    'quiz.incorrect':
        'غير صحيح',

    'quiz.correctAnswer':
        'الإجابة الصحيحة',

    'quiz.correctAnswers':
        'الإجابات الصحيحة',

    'quiz.signInToSave':
        'سجّل الدخول لحفظ تقدم الاختبار وعدد المحاولات.',

    'quiz.signIn':
        'تسجيل الدخول لحفظ تقدم الاختبار',

    'quiz.progressLoading':
        'جارٍ تحميل تقدم الاختبار المحفوظ…',

    'quiz.progressLoadError':
        'تعذر تحميل تقدم الاختبار المحفوظ. لا يزال بإمكانك الإجابة عن أسئلة الاستعداد.',

    'quiz.solved':
        'تم الحل',

    'quiz.attempts':
        'المحاولات',

    'quiz.connectionRequired':
        'يلزم الاتصال بالإنترنت للتحقق من هذه الإجابة. تم الاحتفاظ باختيارك لتتمكن من المحاولة مرة أخرى.',

    'quiz.reviewRelatedGuidance':
        'راجع الإرشادات ذات الصلة',

    'quiz.relatedGuidanceExplanation':
        'استخدم الإرشادات التي تمت مراجعتها أدناه لتعزيز ما تعلمته للتو.',

    'quiz.primaryGuidance':
        'إرشادات رئيسية',

    'quiz.supportingGuidance':
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


type QuizDataState =
    ReturnType<
        typeof useQuizData
    >;


function setQuizState(
    overrides:
        Partial<QuizDataState> = {},
): void {
    useQuizDataMock.mockReturnValue({
        questions:
            quizQuestions,

        options:
            quizOptions,

        progress:
            [],

        catalogueStatus:
            'ready',

        progressStatus:
            'idle',

        isCatalogueLoading:
            false,

        isProgressLoading:
            false,

        refresh:
            quizRefreshMock,

        submitAnswer:
            submitAnswerMock,

        ...overrides,
    });
}

type ResourceHubState = ReturnType< typeof useResourceHub >;

function setResourceHubState(
	overrides:
		Partial<ResourceHubState> = {},
): void {
	useResourceHubMock.mockReturnValue({
		catalogue:
			emptyResourceHubCatalogue,

		source:
			'remote',

		status:
			'ready',

		isLoading:
			false,

		refresh:
			resourceHubRefreshMock,

		...overrides,
	});
}


describe(
    'PreparednessQuizScreen',
    () => {
        beforeEach(
            () => {
                jest.clearAllMocks();

                quizRefreshMock.mockResolvedValue(undefined,);
                resourceHubRefreshMock.mockResolvedValue(undefined,);


                submitAnswerMock
                    .mockResolvedValue(
                        guestCorrectSingleResult,
                    );


                setLanguage(
                    'en',
                );


                setGuestAuth();


                setQuizState();
                setResourceHubState();
            },
        );


        test(
            'shows a loading state while the public Quiz catalogue is loading',
            async () => {
                setQuizState({
                    questions:
                        [],

                    options:
                        [],

                    catalogueStatus:
                        'loading',

                    isCatalogueLoading:
                        true,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'Loading preparedness questions…',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'shows a public Quiz load error with a working retry action',
            async () => {
                setQuizState({
                    questions:
                        [],

                    options:
                        [],

                    catalogueStatus:
                        'error',

                    isCatalogueLoading:
                        false,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'Preparedness questions could not be loaded. Please try again.',
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
                    quizRefreshMock,
                ).toHaveBeenCalledTimes(
                    1,
                );
            },
        );


        test(
            'shows an explicit empty state when no Quiz questions are available',
            async () => {
                setQuizState({
                    questions:
                        [],

                    options:
                        [],
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'No preparedness questions are available right now.',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'renders English Quiz questions and answer options from the public catalogue',
            async () => {
                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'Preparedness Quiz',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'What should you do if floodwater begins rising around your home?',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Move to a safe higher level if it is safe to do so.',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Which items belong in a basic emergency kit?',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Store drinking water.',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'uses radio semantics and replaces the previous choice for a single-select question',
            async () => {
                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ).props.accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        selected:
                            false,
                    }),
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                expect(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ).props.accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        selected:
                            true,
                    }),
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Drive through the floodwater to leave quickly.',
                        },
                    ),
                );


                expect(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ).props.accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        selected:
                            false,
                    }),
                );


                expect(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Drive through the floodwater to leave quickly.',
                        },
                    ).props.accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        selected:
                            true,
                    }),
                );
            },
        );


        test(
            'uses checkbox semantics and submits the exact selected IDs for a multi-select question',
            async () => {
                submitAnswerMock
                    .mockResolvedValue(
                        guestCorrectMultiResult,
                    );


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Store drinking water.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Keep a working flashlight.',
                        },
                    ),
                );


                expect(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Store drinking water.',
                        },
                    ).props.accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        checked:
                            true,
                    }),
                );


                const checkAnswerButtons =
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    );


                await fireEvent.press(
                    checkAnswerButtons[1],
                );


                await waitFor(() => {
                    expect(
                        submitAnswerMock,
                    ).toHaveBeenCalledWith(
                        302,
                        [
                            3021,
                            3022,
                        ],
                    );
                });
            },
        );


        test(
            'keeps Check answer disabled until a question has a valid selection',
            async () => {
                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0]
                        .props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        disabled:
                            true,
                    }),
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                expect(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0]
                        .props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        disabled:
                            false,
                    }),
                );
            },
        );


        test(
            'allows guest Quiz access while explaining that progress is not saved',
            async () => {
                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'Sign in to save quiz progress and attempts.',
                    ),
                ).toBeTruthy();


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Sign in to save quiz progress',
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
            'shows persisted Quiz progress for an authenticated account',
            async () => {
                setAuthenticatedAuth();


                setQuizState({
                    progress:
                        savedQuizProgress,

                    progressStatus:
                        'ready',
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'Solved',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Attempts: 3',
                    ),
                ).toBeTruthy();


                expect(
                    screen.queryByText(
                        'Sign in to save quiz progress and attempts.',
                    ),
                ).toBeNull();
            },
        );


        test(
            'keeps public questions visible while authenticated Quiz progress is loading',
            async () => {
                setAuthenticatedAuth();


                setQuizState({
                    progress:
                        [],

                    progressStatus:
                        'loading',

                    isProgressLoading:
                        true,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'What should you do if floodwater begins rising around your home?',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Loading saved quiz progress…',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'keeps public questions visible when authenticated Quiz progress fails to load',
            async () => {
                setAuthenticatedAuth();


                setQuizState({
                    progress:
                        [],

                    progressStatus:
                        'error',

                    isProgressLoading:
                        false,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'What should you do if floodwater begins rising around your home?',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Your saved quiz progress could not be loaded. You can still answer preparedness questions.',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'renders authoritative correctness explanation and correct answer returned by the server',
            async () => {
                submitAnswerMock
                    .mockResolvedValue(
                        guestIncorrectSingleResult,
                    );


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Drive through the floodwater to leave quickly.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'Incorrect',
                        ),
                    ).toBeTruthy();
                });


                expect(
                    submitAnswerMock,
                ).toHaveBeenCalledWith(
                    301,
                    [
                        3012,
                    ],
                );


                expect(
                    screen.getByText(
                        'Driving through floodwater is dangerous because its depth and force can be difficult to judge.',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Correct answer: Move to a safe higher level if it is safe to do so.',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'shows connection-required feedback preserves selection and allows retry after submission failure',
            async () => {
                submitAnswerMock
                    .mockRejectedValueOnce(
                        new Error(
                            'network unavailable',
                        ),
                    )
                    .mockResolvedValueOnce(
                        guestCorrectSingleResult,
                    );


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'A connection is required to check this answer. Your selection has been kept so you can try again.',
                        ),
                    ).toBeTruthy();
                });


                expect(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ).props.accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        selected:
                            true,
                    }),
                );


                expect(
                    screen.queryByText(
                        'Correct',
                    ),
                ).toBeNull();


                expect(
                    screen.queryByText(
                        'Incorrect',
                    ),
                ).toBeNull();


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'Correct',
                        ),
                    ).toBeTruthy();
                });


                expect(
                    submitAnswerMock,
                ).toHaveBeenCalledTimes(
                    2,
                );
            },
        );


        test(
            'uses Arabic question option and server explanation content when Arabic is active',
            async () => {
                setLanguage(
                    'ar',
                );


                submitAnswerMock
                    .mockResolvedValue(
                        guestIncorrectSingleResult,
                    );


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'اختبار الاستعداد',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'ماذا ينبغي أن تفعل إذا بدأت مياه الفيضان ترتفع حول منزلك؟',
                    ),
                ).toBeTruthy();


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'قد السيارة عبر مياه الفيضان للمغادرة بسرعة.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'تحقق من الإجابة',
                        },
                    )[0],
                );


                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'غير صحيح',
                        ),
                    ).toBeTruthy();
                });


                expect(
                    screen.getByText(
                        'القيادة عبر مياه الفيضان خطرة لأن عمق المياه وقوتها قد يصعب تقديرهما.',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'الإجابة الصحيحة: انتقل إلى مستوى مرتفع وآمن إذا كان ذلك آمناً.',
                    ),
                ).toBeTruthy();


                expect(
                    screen.queryByText(
                        'What should you do if floodwater begins rising around your home?',
                    ),
                ).toBeNull();
            },
        );


        test(
            'disables a question while its answer is being checked',
            async () => {
                let resolveSubmission:
                    (
                        result:
                            QuizSubmissionResult,
                    ) => void =
                    () => undefined;


                const pendingSubmission =
                    new Promise<QuizSubmissionResult>(
                        (
                            resolve,
                        ) => {
                            resolveSubmission =
                                resolve;
                        },
                    );


                submitAnswerMock
                    .mockReturnValue(
                        pendingSubmission,
                    );


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(() => {
                    expect(
                        screen.getByRole(
                            'button',
                            {
                                name:
                                    'Checking answer…',
                            },
                        ).props.accessibilityState,
                    ).toEqual(
                        expect.objectContaining({
                            disabled:
                                true,
                        }),
                    );
                });


                expect(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ).props.accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        disabled:
                            true,
                    }),
                );


                await act(
                    async () => {
                        resolveSubmission(
                            guestCorrectSingleResult,
                        );

                        await pendingSubmission;
                    },
                );


                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'Correct',
                        ),
                    ).toBeTruthy();
                });
            },
        );

        test(
            'renders multiple correct answers as separate readable items',
            async () => {
                submitAnswerMock
                    .mockResolvedValue(
                        guestCorrectMultiResult,
                    );


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Store drinking water.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Keep a working flashlight.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[1],
                );


                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'Correct',
                        ),
                    ).toBeTruthy();
                });


                expect(
                    screen.getByText(
                        'Correct answers',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        '• Store drinking water.',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        '• Keep a working flashlight.',
                    ),
                ).toBeTruthy();


                expect(
                    screen.queryByText(
                        'Correct answers: Store drinking water., Keep a working flashlight.',
                    ),
                ).toBeNull();
            },
        );
        test(
            'does not expose canonical related guidance before the user submits the question',
            async () => {
                setResourceHubState({
                    catalogue:
                        linkedResourceHubCatalogue,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.queryByText(
                        'Review related guidance',
                    ),
                ).toBeNull();


                expect(
                    screen.queryByText(
                        'Flood response guidance',
                    ),
                ).toBeNull();


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                /*
                * Merely choosing an answer must not expose material that could act
                * as a hint.
                */
                expect(
                    screen.queryByText(
                        'Flood response guidance',
                    ),
                ).toBeNull();
            },
        );

        test(
            'shows canonical related guidance only after successful answer feedback with primary before supporting',
            async () => {
                setResourceHubState({
                    catalogue:
                        linkedResourceHubCatalogue,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(
                    () => {
                        expect(
                            screen.getByText(
                                'Correct',
                            ),
                        ).toBeTruthy();


                        expect(
                            screen.getByText(
                                'Review related guidance',
                            ),
                        ).toBeTruthy();
                    },
                );


                expect(
                    screen.getByText(
                        'Primary guidance',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'Supporting guidance',
                    ),
                ).toBeTruthy();


                const guidanceButtons =
                    screen.getAllByRole(
                        'button',
                    ).filter(
                        (element) =>
                            typeof element.props
                                .accessibilityLabel
                                === 'string'
                            && element.props
                                .accessibilityLabel
                                .startsWith(
                                    'Read guidance:',
                                ),
                    );


                expect(
                    guidanceButtons.map(
                        (element) =>
                            element.props
                                .accessibilityLabel,
                    ),
                ).toEqual([
                    'Read guidance: Flood response guidance',
                    'Read guidance: Floodwater safety reference',
                ]);
            },
        );

        test(
            'navigates from post-answer guidance to the canonical Resource Hub detail without submitting another Quiz attempt',
            async () => {
                setResourceHubState({
                    catalogue:
                        linkedResourceHubCatalogue,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(
                    () => {
                        expect(
                            screen.getByRole(
                                'button',
                                {
                                    name:
                                        'Read guidance: Flood response guidance',
                                },
                            ),
                        ).toBeTruthy();
                    },
                );


                expect(
                    submitAnswerMock,
                ).toHaveBeenCalledTimes(
                    1,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Read guidance: Flood response guidance',
                        },
                    ),
                );


                expect(
                    routerPushMock,
                ).toHaveBeenCalledWith({
                    pathname:
                        '/resource-hub-resource-detail',

                    params: {
                        resourceId:
                            '701',
                    },
                });


                expect(
                    submitAnswerMock,
                ).toHaveBeenCalledTimes(
                    1,
                );
            },
        );


        test(
            'keeps related guidance available to guests after a successful answer submission',
            async () => {
                setGuestAuth();


                setResourceHubState({
                    catalogue:
                        linkedResourceHubCatalogue,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(
                    () => {
                        expect(
                            screen.getByRole(
                                'button',
                                {
                                    name:
                                        'Read guidance: Flood response guidance',
                                },
                            ),
                        ).toBeTruthy();
                    },
                );


                expect(
                    screen.getByText(
                        'Sign in to save quiz progress and attempts.',
                    ),
                ).toBeTruthy();
            },
        );


        test(
            'does not expose related guidance when answer checking fails',
            async () => {
                setResourceHubState({
                    catalogue:
                        linkedResourceHubCatalogue,
                });


                submitAnswerMock
                    .mockRejectedValueOnce(
                        new Error(
                            'network unavailable',
                        ),
                    );


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(
                    () => {
                        expect(
                            screen.getByText(
                                'A connection is required to check this answer. Your selection has been kept so you can try again.',
                            ),
                        ).toBeTruthy();
                    },
                );


                expect(
                    screen.queryByText(
                        'Review related guidance',
                    ),
                ).toBeNull();


                expect(
                    screen.queryByText(
                        'Flood response guidance',
                    ),
                ).toBeNull();
            },
        );


        test(
            'removes post-answer guidance when the user changes the answer selection',
            async () => {
                setResourceHubState({
                    catalogue:
                        linkedResourceHubCatalogue,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(
                    () => {
                        expect(
                            screen.getByText(
                                'Flood response guidance',
                            ),
                        ).toBeTruthy();
                    },
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Drive through the floodwater to leave quickly.',
                        },
                    ),
                );


                expect(
                    screen.queryByText(
                        'Correct',
                    ),
                ).toBeNull();


                expect(
                    screen.queryByText(
                        'Review related guidance',
                    ),
                ).toBeNull();


                expect(
                    screen.queryByText(
                        'Flood response guidance',
                    ),
                ).toBeNull();
            },
        );


        test(
            'does not expose guidance merely because authenticated saved progress already marks the question solved',
            async () => {
                setAuthenticatedAuth();


                setQuizState({
                    progress:
                        savedQuizProgress,

                    progressStatus:
                        'ready',
                });


                setResourceHubState({
                    catalogue:
                        linkedResourceHubCatalogue,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'Solved',
                    ),
                ).toBeTruthy();


                expect(
                    screen.queryByText(
                        'Review related guidance',
                    ),
                ).toBeNull();


                expect(
                    screen.queryByText(
                        'Flood response guidance',
                    ),
                ).toBeNull();
            },
        );


        test(
            'renders Arabic post-answer related guidance using Arabic resource titles and role labels',
            async () => {
                setLanguage(
                    'ar',
                );


                setResourceHubState({
                    catalogue:
                        linkedResourceHubCatalogue,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'انتقل إلى مستوى مرتفع وآمن إذا كان ذلك آمناً.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'تحقق من الإجابة',
                        },
                    )[0],
                );


                await waitFor(
                    () => {
                        expect(
                            screen.getByText(
                                'راجع الإرشادات ذات الصلة',
                            ),
                        ).toBeTruthy();
                    },
                );


                expect(
                    screen.getByText(
                        'إرشادات رئيسية',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'إرشادات داعمة',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByText(
                        'إرشادات الاستجابة للسيول',
                    ),
                ).toBeTruthy();


                expect(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'قراءة الإرشادات: إرشادات الاستجابة للسيول',
                        },
                    ),
                ).toBeTruthy();
            },
        );

        test(
            'keeps the Quiz fully usable when the independent Resource Hub catalogue is unavailable',
            async () => {
                setResourceHubState({
                    catalogue:
                        null,

                    source:
                        null,

                    status:
                        'error',

                    isLoading:
                        false,
                });


                await render(
                    <PreparednessQuizScreen />,
                );


                expect(
                    screen.getByText(
                        'What should you do if floodwater begins rising around your home?',
                    ),
                ).toBeTruthy();


                await fireEvent.press(
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'Move to a safe higher level if it is safe to do so.',
                        },
                    ),
                );


                await fireEvent.press(
                    screen.getAllByRole(
                        'button',
                        {
                            name:
                                'Check answer',
                        },
                    )[0],
                );


                await waitFor(
                    () => {
                        expect(
                            screen.getByText(
                                'Correct',
                            ),
                        ).toBeTruthy();
                    },
                );


                expect(
                    submitAnswerMock,
                ).toHaveBeenCalledWith(
                    301,
                    [
                        3011,
                    ],
                );


                expect(
                    screen.queryByText(
                        'Review related guidance',
                    ),
                ).toBeNull();


                expect(
                    resourceHubRefreshMock,
                ).not.toHaveBeenCalled();
            },
        );

    },
);