/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useFocusEffect } from 'expo-router';

import ProgressAchievementsScreen from '@/app/progress-achievements';
import { useAuth } from '@/auth/AuthenticationProvider';
import { useAchievements } from '@/features/achievements/AchievementProvider';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { useMissionProgress } from '@/features/preparedness/MissionProgressProvider';
import { usePreparednessData } from '@/features/preparedness/PreparednessDataProvider';

import type { LocalMissionTaskProgress } from '@/features/preparedness/mission-progress-local-repository';
import type { PreparednessMissionResolution } from '@/features/preparedness/preparedness-types';
import type { AchievementDefinition, EarnedAchievement } from '@/features/achievements/achievement-types';

/**
 * Replaces Expo Router with deterministic navigation mocks.
 *
 * This suite tests the Progress & Achievements screen rather than Expo Router
 * itself.
 *
 * Navigation calls are observed directly and Stack.Screen is represented by a
 * harmless component.
 */
jest.mock('expo-router', () => ({
	router: {
		push: jest.fn(),
		back: jest.fn(),
	},
	Stack: {
		Screen: () => null,
	},
	useFocusEffect: jest.fn(),
}));

/**
 * Authentication, achievement state and localisation already have their own
 * focused tests. This suite controls those boundaries so it can verify only
 * how the production screen presents their state.
 */
jest.mock('@/auth/AuthenticationProvider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/features/achievements/AchievementProvider', () => ({
	useAchievements: jest.fn(),
}));

jest.mock('@/localization/AppLanguageProvider', () => ({
	useAppLanguage: jest.fn(),
}));
/**
 * AppText consumes text-size state internally. Screen behaviour tests use the
 * normal application text-size setting; dedicated accessibility tests cover
 * text-size behaviour separately.
 */
jest.mock('@/accessibility/AppTextSizeProvider', () => ({
	useAppTextSize: jest.fn(() => ({
		textSizePreference: 'system',
	})),
}));

jest.mock('@/features/preparedness/PreparednessDataProvider', () => ({
	usePreparednessData: jest.fn(),
}));

jest.mock('@/features/preparedness/MissionProgressProvider', () => ({
	useMissionProgress: jest.fn(),
}));

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;
const useAchievementsMock = useAchievements as jest.MockedFunction<typeof useAchievements>;
const useAppLanguageMock = useAppLanguage as jest.MockedFunction<typeof useAppLanguage>;
const routerPushMock = router.push as jest.MockedFunction<typeof router.push>;
const refreshMock = jest.fn<Promise<void>, []>();
const useFocusEffectMock = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>;
const usePreparednessDataMock = usePreparednessData as jest.MockedFunction<typeof usePreparednessData>;
const useMissionProgressMock = useMissionProgress as jest.MockedFunction<typeof useMissionProgress>;
const preparednessRefreshMock = jest.fn<Promise<void>, []>();
const missionProgressRefreshMock = jest.fn<Promise<void>, []>();
const setTaskCompletionMock = jest.fn<Promise<boolean>, [number, boolean]>();

const USER_ID = '11111111-1111-1111-1111-111111111111';
const FIRST_EARNED_AT = '2035-03-12T07:41:19.000Z';
const LTR_ISOLATE = '\u2066';
const POP_DIRECTIONAL_ISOLATE = '\u2069';
const isolatedFraction = (current: number, total: number) => 
	`${LTR_ISOLATE}${current} / ${total}${POP_DIRECTIONAL_ISOLATE}`;

const achievementDefinitions: AchievementDefinition[] = [
	{
		id: 1,
		code: 'first_preparedness_step',
		title_en: 'First Preparedness Step',
		title_ar: 'الخطوة الأولى للاستعداد',
		description_en: 'Complete your first preparedness task.',
		description_ar: 'أكمل أول مهمة من مهام الاستعداد.',
		criterion_type: 'tasks_completed',
		threshold: 1,
		target_mission_id: null,
		sort_order: 10,
		is_active: true,
	},
	{
		id: 3,
		code: 'scenario_learner',
		title_en: 'Preparedness Learner',
		title_ar: 'متعلم الاستعداد',
		description_en: 'Answer one preparedness scenario correctly.',
		description_ar: 'أجب عن سيناريو استعداد واحد بشكل صحيح.',
		criterion_type: 'quiz_questions_correct',
		threshold: 1,
		target_mission_id: null,
		sort_order: 30,
		is_active: true,
	},
];
const earnedAchievements: EarnedAchievement[] = [
	{
		achievement: achievementDefinitions[0],
		earned_at: FIRST_EARNED_AT,
	},
];
const earnedAchievementsWithHistory: EarnedAchievement[] = [
	{
		achievement: achievementDefinitions[0],
		earned_at: FIRST_EARNED_AT,
	},
	{
		achievement: achievementDefinitions[1],
		earned_at: '2035-04-01T08:00:00.000Z',
	},
];
const progressMissions: PreparednessMissionResolution[] = [
	{
		mission: {
			id: 10,
			code: 'household_emergency_kit',
			title_en: 'Household Emergency Kit',
			title_ar: 'حقيبة الطوارئ المنزلية',
			description_en: 'Prepare emergency supplies.',
			description_ar: 'جهّز مستلزمات الطوارئ.',
			mission_scope: 'national',
			sort_order: 10,
			is_active: true,
		},
		tasks: [
			{
				id: 101,
				mission_id: 10,
				hazard_id: null,
				code: 'store_water',
				title_en: 'Store water',
				title_ar: 'خزّن المياه',
				detail_en: null,
				detail_ar: null,
				points: 10,
				sort_order: 10,
				is_active: true,
			},
			{
				id: 102,
				mission_id: 10,
				hazard_id: null,
				code: 'prepare_flashlight',
				title_en: 'Prepare flashlight',
				title_ar: 'جهّز مصباحاً',
				detail_en: null,
				detail_ar: null,
				points: 20,
				sort_order: 20,
				is_active: true,
			},
		],
		requiresLocation: false,
	},
	{
		mission: {
			id: 20,
			code: 'official_sources',
			title_en: 'Know Official Sources',
			title_ar: 'تعرّف على المصادر الرسمية',
			description_en: 'Know where to find official warnings.',
			description_ar: 'تعرّف على مصادر التحذيرات الرسمية.',
			mission_scope: 'national',
			sort_order: 20,
			is_active: true,
		},
		tasks: [
			{
				id: 201,
				mission_id: 20,
				hazard_id: null,
				code: 'know_sources',
				title_en: 'Know warning sources',
				title_ar: 'تعرّف على مصادر التحذير',
				detail_en: null,
				detail_ar: null,
				points: 30,
				sort_order: 10,
				is_active: true,
			},
		],
		requiresLocation: false,
	},
];

function createMissionProgress(taskId: number, isCompleted: boolean): LocalMissionTaskProgress {
	return {
		user_id: USER_ID,
		task_id: taskId,
		is_completed: isCompleted,
		completed_at: isCompleted
			? '2026-09-25T10:30:00.000Z'
			: null,
		updated_at: '2026-09-25T10:30:00.000Z',
	};
}

const partialMissionProgress: LocalMissionTaskProgress[] = [
	createMissionProgress(101, true),
	createMissionProgress(102, false),
	createMissionProgress(201, true),
];

const englishTranslations: Record<string, string> = {
	'common.back': 'Back',
	'achievements.title': 'Progress & Achievements',
	'achievements.subtitle': 'Track preparedness milestones earned through missions and quiz progress.',
	'achievements.loading': 'Loading achievements…',
	'achievements.loadError': 'Achievements could not be loaded. Please try again.',
	'achievements.retry': 'Try again',
	'achievements.noAchievements': 'No achievements are available right now.',
	'achievements.signInToView': 'Sign in to track and view your earned achievements.',
	'achievements.signIn': 'Sign in to view achievements',
	'achievements.progressLoading': 'Loading your earned achievements…',
	'achievements.progressLoadError': 'Your earned achievements could not be loaded. You can still view the available milestones.',
	'achievements.earnedAchievements': 'Earned achievements',
	'achievements.earned': 'Earned',
	'achievements.notEarned': 'Not earned yet',
	'achievements.missionProgress': 'Mission progress',
	'achievements.missionProgressLoading': 'Loading your mission progress…',
	'achievements.missionProgressLoadError': 'Your saved mission progress could not be loaded. Your achievements remain available.',
	'achievements.preparednessUnavailable': 'Current mission information could not be loaded. Your achievements remain available.',
	'achievements.missionCompletion': 'Mission completion',
	'achievements.tasksCompleted': 'Tasks completed',
	'achievements.missionsCompleted': 'Missions completed',
	'achievements.pendingSync': 'Changes waiting to sync',
	'achievements.completionDisclaimer': 'Mission completion reflects the preparedness tasks you have completed. It is not a measure or guarantee of household safety.',
	'achievements.recentAchievements': 'Recent achievements',
	'achievements.earnedOn': 'Earned on',
	'preparedness.points': 'points',
};

const arabicTranslations: Record<string, string> = {
	'common.back': 'رجوع',
	'achievements.title': 'التقدم والإنجازات',
	'achievements.subtitle': 'تابع إنجازات الاستعداد التي تكتسبها من المهام واختبار الاستعداد.',
	'achievements.loading': 'جارٍ تحميل الإنجازات…',
	'achievements.loadError': 'تعذر تحميل الإنجازات. يرجى المحاولة مرة أخرى.',
	'achievements.retry': 'المحاولة مرة أخرى',
	'achievements.noAchievements': 'لا توجد إنجازات متاحة حالياً.',
	'achievements.signInToView': 'سجّل الدخول لمتابعة الإنجازات التي حققتها وعرضها.',
	'achievements.signIn': 'تسجيل الدخول لعرض الإنجازات',
	'achievements.progressLoading': 'جارٍ تحميل إنجازاتك…',
	'achievements.progressLoadError': 'تعذر تحميل إنجازاتك. لا يزال بإمكانك عرض الإنجازات المتاحة.',
	'achievements.earnedAchievements': 'الإنجازات المكتسبة',
	'achievements.earned': 'تم الإنجاز',
	'achievements.notEarned': 'لم يتحقق بعد',
	'achievements.missionProgress': 'تقدم المهام',
	'achievements.missionProgressLoading': 'جارٍ تحميل تقدمك في المهام…',
	'achievements.missionProgressLoadError': 'تعذر تحميل تقدمك المحفوظ في المهام. لا تزال إنجازاتك متاحة.',
	'achievements.preparednessUnavailable': 'تعذر تحميل معلومات المهام الحالية. لا تزال إنجازاتك متاحة.',
	'achievements.missionCompletion': 'إكمال المهام',
	'achievements.tasksCompleted': 'المهام المكتملة',
	'achievements.missionsCompleted': 'المهمات المكتملة',
	'achievements.pendingSync': 'تغييرات بانتظار المزامنة',
	'achievements.completionDisclaimer': 'يعكس إكمال المهام مهام الاستعداد التي أنجزتها، ولا يمثل مقياساً أو ضماناً لسلامة المنزل.',
	'achievements.recentAchievements': 'الإنجازات الأخيرة',
	'achievements.earnedOn': 'تم تحقيقه في',
	'preparedness.points': 'نقاط',
};

function mockLanguage(language: 'en' | 'ar'): void {
	const translations = language === 'ar'
		? arabicTranslations
		: englishTranslations;
	useAppLanguageMock.mockReturnValue({
		language,
		direction: language === 'ar' ? 'rtl' : 'ltr',
		isRTL: language === 'ar',
		setLanguage: jest.fn(),
		toggleLanguage: jest.fn(),
		translate: (key: string) => translations[key] ?? key,
	});
}

function mockAuthentication(isAuthenticated: boolean): void {
	useAuthMock.mockReturnValue({
		user: isAuthenticated
			? {
				id: USER_ID,
			}
			: null,
		session: isAuthenticated
			? {
				user: {
					id: USER_ID,
				},
			}
			: null,
		isAuthenticated,
		isLoading: false,
	} as ReturnType<typeof useAuth>);
}

function mockAchievementState(overrides: 
	Partial<ReturnType<typeof useAchievements>> = {}): void {
		useAchievementsMock.mockReturnValue({
			definitions: achievementDefinitions,
			earnedAchievements: [],
			catalogueStatus: 'ready',
			earnedStatus: 'idle',
			isCatalogueLoading: false,
			isEarnedLoading: false,
			refresh: refreshMock,
			...overrides,
		});
}

function mockPreparednessState(overrides: 
	Partial<ReturnType<typeof usePreparednessData>> = {}): void {
		usePreparednessDataMock.mockReturnValue({
			activeLocation: null,
			missions: progressMissions,
			resolvedHazards: [],
			status: 'ready',
			isLoading: false,
			refresh: preparednessRefreshMock,
			...overrides,
		});
}

function mockMissionProgressState(overrides: 
	Partial<ReturnType<typeof useMissionProgress>> = {}): void {
		useMissionProgressMock.mockReturnValue({
			progress: partialMissionProgress,
			pendingTaskIds: [
				102,
			],
			status: 'ready',
			isLoading: false,
			refresh: missionProgressRefreshMock,
			setTaskCompletion: setTaskCompletionMock,
			...overrides,
		});
}

describe('ProgressAchievementsScreen', () => {
	beforeEach(() => {
		
		jest.clearAllMocks();
		refreshMock.mockResolvedValue();
		preparednessRefreshMock.mockResolvedValue();
		missionProgressRefreshMock.mockResolvedValue();
		setTaskCompletionMock.mockResolvedValue(true);
		mockLanguage('en');
		mockAuthentication(false);
		mockAchievementState();
		mockPreparednessState();
		mockMissionProgressState();
	});

	test('shows a loading state while the public achievement catalogue is loading', async () => {
		mockAchievementState({
			definitions: [],
			catalogueStatus: 'loading',
			isCatalogueLoading: true,
		});
		await render(<ProgressAchievementsScreen />);
		expect(screen.getByText('Loading achievements…')).toBeTruthy();
	});

	test('shows a public achievement load error with a working retry action', async () => {
		
		mockAchievementState({
			definitions: [],
			catalogueStatus: 'error',
			isCatalogueLoading: false,
		});
		
		await render(<ProgressAchievementsScreen />);
		
		expect(screen.getByText('Achievements could not be loaded. Please try again.')).toBeTruthy();
		
		await fireEvent.press(screen.getByRole('button', {
			name: 'Try again',
		}));
		
		expect(refreshMock).toHaveBeenCalledTimes(1);
	});

	test('shows an explicit empty state when no active achievements are available', async () => {
		
		mockAchievementState({
			definitions: [],
		});
		
		await render(<ProgressAchievementsScreen />);
		
		expect(screen.getByText('No achievements are available right now.')).toBeTruthy();
	});

	test('allows guests to browse achievement definitions while explaining that earned state requires sign in', async () => {
		
		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('First Preparedness Step')).toBeTruthy();
		expect(screen.getByText('Complete your first preparedness task.')).toBeTruthy();
		expect(screen.getByText('Preparedness Learner')).toBeTruthy();
		expect(screen.getByText('Sign in to track and view your earned achievements.')).toBeTruthy();
		expect(screen.queryByText('Mission progress')).toBeNull();
		expect(screen.queryByRole('progressbar')).toBeNull();
		
		await fireEvent.press(screen.getByRole('button', {
			name: 'Sign in to view achievements',
		}));

		expect(routerPushMock).toHaveBeenCalledWith('/sign-in');
	});

	test('shows earned and not-yet-earned states for an authenticated account', async () => {
		
		mockAuthentication(true);

		mockAchievementState({
			earnedAchievements,
			earnedStatus: 'ready',
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('Earned achievements: 1 / 2')).toBeTruthy();
		expect(screen.getByText('✓ Earned')).toBeTruthy();
		expect(screen.getByText('○ Not earned yet')).toBeTruthy();
	});

	test('refreshes achievement state when the authenticated screen gains focus', async () => {
		
		mockAuthentication(true);

		mockAchievementState({
			earnedAchievements,
			earnedStatus: 'ready',
		});

		await render(<ProgressAchievementsScreen />);

		expect(useFocusEffectMock).toHaveBeenCalledTimes(1);

		const focusCallback = useFocusEffectMock.mock.calls[0][0];

		focusCallback();

		await waitFor(() => {
			expect(refreshMock).toHaveBeenCalledTimes(1);
		});
	});

	test('shows authenticated point-weighted mission progress with accessible textual and progress-bar state', async () => {
		
		mockAuthentication(true);

		mockAchievementState({
			earnedAchievements,
			earnedStatus: 'ready',
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('Mission progress')).toBeTruthy();
		expect(screen.getByText('67%')).toBeTruthy();
		expect(screen.getByText('40 / 60 points')).toBeTruthy();
		expect(screen.getByText('2 / 3')).toBeTruthy();
		expect(screen.getByText('1 / 2')).toBeTruthy();
		expect(screen.getByText('Changes waiting to sync: 1')).toBeTruthy();

		expect(screen.getByText(
			'Mission completion reflects the preparedness tasks you have completed. It is not a measure or guarantee of household safety.'
		)).toBeTruthy();

		const progressBar = screen.getByRole('progressbar', {
			name: 'Mission completion',
		});

		expect(progressBar.props
			.accessibilityValue).toEqual({
			min: 0,
			max: 100,
			now: 67,
			text: '67%',
		});
	});

	test('keeps achievements visible while private mission progress is loading', async () => {
		
		mockAuthentication(true);

		mockAchievementState({
			earnedAchievements,
			earnedStatus: 'ready',
		});

		mockMissionProgressState({
			progress: [],
			pendingTaskIds: [],
			status: 'loading',
			isLoading: true,
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('Loading your mission progress…')).toBeTruthy();
		expect(screen.getByText('First Preparedness Step')).toBeTruthy();
		expect(screen.getByText('Earned achievements: 1 / 2')).toBeTruthy();
	});

	test('keeps achievements visible when private mission progress fails to load', async () => {
		
		mockAuthentication(true);

		mockAchievementState({
			earnedAchievements,
			earnedStatus: 'ready',
		});

		mockMissionProgressState({
			progress: [],
			pendingTaskIds: [],
			status: 'error',
			isLoading: false,
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('Your saved mission progress could not be loaded. Your achievements remain available.')).toBeTruthy();
		expect(screen.getByText('Preparedness Learner')).toBeTruthy();
		expect(screen.queryByRole('progressbar')).toBeNull();
	});

	test('keeps achievements visible when current preparedness mission information is unavailable', async () => {
		
		mockAuthentication(true);

		mockAchievementState({
			earnedAchievements,
			earnedStatus: 'ready',
		});

		mockPreparednessState({
			missions: [],
			status: 'error',
			isLoading: false,
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('Current mission information could not be loaded. Your achievements remain available.')).toBeTruthy();
		expect(screen.getByText('First Preparedness Step')).toBeTruthy();
		expect(screen.queryByRole('progressbar')).toBeNull();
	});

	test('keeps public achievement definitions visible while private earned state is loading', async () => {

		mockAuthentication(true);

		mockAchievementState({
			earnedStatus: 'loading',
			isEarnedLoading: true,
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('First Preparedness Step')).toBeTruthy();
		expect(screen.getByText('Loading your earned achievements…')).toBeTruthy();
	});

	test('keeps public achievement definitions visible when private earned state fails to load', async () => {

		mockAuthentication(true);

		mockAchievementState({
			earnedStatus: 'error',
			isEarnedLoading: false,
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('Preparedness Learner')).toBeTruthy();
		expect(screen.getByText('Your earned achievements could not be loaded. You can still view the available milestones.')).toBeTruthy();
	});

	test('uses Arabic achievement titles descriptions and interface labels when Arabic is active', async () => {

		mockLanguage('ar');
		mockAuthentication(true);

		mockAchievementState({
			earnedAchievements,
			earnedStatus: 'ready',
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('التقدم والإنجازات')).toBeTruthy();
		expect(screen.getByText('الخطوة الأولى للاستعداد')).toBeTruthy();
		expect(screen.getByText('أكمل أول مهمة من مهام الاستعداد.')).toBeTruthy();
		expect(screen.getByText('✓ تم الإنجاز')).toBeTruthy();
		expect(screen.getByText('○ لم يتحقق بعد')).toBeTruthy();
		expect(screen.getByText('تقدم المهام')).toBeTruthy();
		expect(screen.getByText('إكمال المهام')).toBeTruthy();
		expect(screen.getByText(`${isolatedFraction(40, 60)} نقاط`)).toBeTruthy();
		expect(screen.getByText(isolatedFraction(2, 3))).toBeTruthy();
		expect(screen.getByText(isolatedFraction(1, 2))).toBeTruthy();
		expect(screen.getByText(`الإنجازات المكتسبة: ${isolatedFraction(1, 2)}`)).toBeTruthy();
		expect(screen.getByText('تغييرات بانتظار المزامنة: 1')).toBeTruthy();
		expect(screen.getByText('الإنجازات الأخيرة')).toBeTruthy();
		expect(screen.getByText('✓ الخطوة الأولى للاستعداد')).toBeTruthy();
	});

	test('shows a simple recent achievement history using authoritative earned timestamps', async () => {

		mockAuthentication(true);

		mockAchievementState({
			earnedAchievements: earnedAchievementsWithHistory,
			earnedStatus: 'ready',
		});

		await render(<ProgressAchievementsScreen />);

		expect(screen.getByText('Recent achievements')).toBeTruthy();
		expect(screen.getByText('✓ Preparedness Learner')).toBeTruthy();
		expect(screen.getByText('Earned on 1 Apr 2035')).toBeTruthy();
		expect(screen.getByText('✓ First Preparedness Step')).toBeTruthy();
		expect(screen.getByText('Earned on 12 Mar 2035')).toBeTruthy();
	});
});
