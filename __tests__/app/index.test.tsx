/// <reference types="jest" />

import {
	fireEvent,
	render,
	screen,
} from '@testing-library/react-native';

import { router } from 'expo-router';

import IndexScreen from '@/app/index';
import { useAuth } from '@/auth/AuthenticationProvider';
import { useMissionProgress } from '@/features/preparedness/MissionProgressProvider';
import { usePreparednessData } from '@/features/preparedness/PreparednessDataProvider';
import { useAppLanguage } from '@/localization/AppLanguageProvider';

import type { LocalMissionTaskProgress } from '@/features/preparedness/mission-progress-local-repository';
import type { PreparednessMissionResolution } from '@/features/preparedness/preparedness-types';
import type { LocationRecord } from '@/profile/profile-types';

jest.mock('expo-router', () => ({
	router: {
		push: jest.fn(),
		replace: jest.fn(),
	},
	Stack: {
		Screen: () => null,
	},
}));

jest.mock('@expo/vector-icons', () => ({
	Ionicons: () => null,
}));

// Bottom-navigation behaviour will have its own focused test. Home only needs
// to prove that it mounts the production dashboard around it.
jest.mock('@/components/AppBottomNavigation', () => ({
	AppBottomNavigation: () => null,
}));

jest.mock('@/auth/AuthenticationProvider', () => ({
	useAuth: jest.fn(),
}));

/*
 * Home imports the Supabase client only for the authenticated sign-out action.
 * I keep the native SQLite-backed client outside this unit test and mock that
 * boundary instead.
 */
jest.mock('@/lib/supabase-config', () => ({
	supabaseClient: {
		auth: {
			signOut: jest.fn(),
		},
	},
}));

jest.mock('@/features/preparedness/PreparednessDataProvider', () => ({
	usePreparednessData: jest.fn(),
}));

jest.mock('@/features/preparedness/MissionProgressProvider', () => ({
	useMissionProgress: jest.fn(),
}));

jest.mock('@/localization/AppLanguageProvider', () => ({
	useAppLanguage: jest.fn(),
}));

jest.mock('@/accessibility/AppTextSizeProvider', () => ({
	useAppTextSize: jest.fn(() => ({
		textSizePreference: 'system',
	})),
}));

const useAuthMock = useAuth as jest.MockedFunction<typeof useAuth>;

const usePreparednessDataMock =
	usePreparednessData as jest.MockedFunction<typeof usePreparednessData>;

const useMissionProgressMock =
	useMissionProgress as jest.MockedFunction<typeof useMissionProgress>;

const useAppLanguageMock =
	useAppLanguage as jest.MockedFunction<typeof useAppLanguage>;

const routerPushMock =
	router.push as jest.MockedFunction<typeof router.push>;

const toggleLanguageMock = jest.fn();

const USER_ID = '11111111-1111-1111-1111-111111111111';

const jeddahLocation: LocationRecord = {
	id: 201,
	parent_id: 200,
	official_code: '0124',
	location_type: 'governorate',
	name_en: 'Jeddah',
	name_ar: 'جدة',
	is_active: true,
};

const missions: PreparednessMissionResolution[] = [
	{
		mission: {
			id: 10,
			code: 'household_emergency_kit',
			title_en: 'Household Emergency Kit',
			title_ar: 'حقيبة الطوارئ المنزلية',
			description_en: 'Prepare essential emergency supplies.',
			description_ar: 'جهّز مستلزمات الطوارئ الأساسية.',
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
				points: 20,
				sort_order: 10,
				is_active: true,
			},
			{
				id: 102,
				mission_id: 10,
				hazard_id: null,
				code: 'prepare_flashlight',
				title_en: 'Prepare a flashlight',
				title_ar: 'جهّز مصباحاً',
				detail_en: null,
				detail_ar: null,
				points: 30,
				sort_order: 20,
				is_active: true,
			},
		],
		requiresLocation: false,
	},
];

const missionProgress: LocalMissionTaskProgress[] = [
	{
		user_id: USER_ID,
		task_id: 101,
		is_completed: true,
		completed_at: '2026-09-25T10:30:00.000Z',
		updated_at: '2026-09-25T10:30:00.000Z',
	},
];

const translations = {
	en: {
		'common.appName': 'Ihtiyat',
		'home.readyToday': 'Ready today',
		'home.title': 'Preparedness starts before an emergency',
		'home.subtitle':
			'Build your readiness, understand local hazards, and access trusted safety guidance.',
		'home.progressTitle': 'Your mission progress',
		'home.continuePreparing': 'Continue preparing',
		'home.quickAccess': 'Quick access',
		'home.quizDescription': 'Check your practical preparedness knowledge.',
		'home.progressDescription':
			'Review your completion, points, and earned achievements.',
		'home.locationDescription':
			'Change the location used for local preparedness guidance.',
		'home.profileAction': 'Profile',
		'home.profileDescription':
			'Manage your preferences and accessibility settings.',
		'home.createAccountDescription':
			'Save progress and preferences across devices.',
		'home.guestProgressTitle': 'Save your preparedness progress',
		'home.guestProgressDescription':
			'Sign in to track completed tasks, points, and achievements.',
		'home.progressUnavailable': 'Mission progress is unavailable right now.',
		'language.switchToArabic': 'العربية',
		'language.switchToEnglish': 'English',
		'authentication.signIn': 'Sign in',
		'authentication.createAccount': 'Create account',
		'authentication.signOut': 'Sign out',
		'location.currentLocationTitle': 'Current location',
		'location.noLocationSelected': 'You have not selected a location yet.',
		'location.title': 'Your location',
		'preparedness.title': 'Preparedness Missions',
		'preparedness.subtitle':
			'Complete practical checklists to build your preparedness.',
		'preparedness.points': 'points',
		'preparedness.tasksCompleted': 'Tasks completed',
		'preparedness.pendingSync': 'Pending sync',
		'preparedness.progressLoading': 'Loading saved progress…',
		'quiz.title': 'Preparedness Quiz',
		'achievements.title': 'Progress & Achievements',
	},
	ar: {
		'common.appName': 'احتياط',
		'home.readyToday': 'استعدادك اليوم',
		'home.title': 'الاستعداد يبدأ قبل حالة الطوارئ',
		'home.subtitle':
			'عزّز استعدادك، وتعرّف على المخاطر المحلية، واطّلع على إرشادات السلامة الموثوقة.',
		'home.progressTitle': 'تقدمك في المهام',
		'home.continuePreparing': 'واصل الاستعداد',
		'home.quickAccess': 'وصول سريع',
		'home.quizDescription': 'اختبر معرفتك العملية بإرشادات الاستعداد.',
		'home.progressDescription':
			'راجع تقدمك ونقاطك والإنجازات التي حققتها.',
		'home.locationDescription':
			'غيّر الموقع المستخدم لإرشادات الاستعداد المحلية.',
		'home.profileAction': 'الملف الشخصي',
		'home.profileDescription': 'أدر تفضيلاتك وإعدادات إمكانية الوصول.',
		'home.createAccountDescription': 'احفظ تقدمك وتفضيلاتك عبر الأجهزة.',
		'home.guestProgressTitle': 'احفظ تقدمك في الاستعداد',
		'home.guestProgressDescription':
			'سجّل الدخول لتتبع المهام المكتملة والنقاط والإنجازات.',
		'home.progressUnavailable': 'تقدم المهام غير متاح حالياً.',
		'language.switchToArabic': 'العربية',
		'language.switchToEnglish': 'English',
		'authentication.signIn': 'تسجيل الدخول',
		'authentication.createAccount': 'إنشاء حساب',
		'authentication.signOut': 'تسجيل الخروج',
		'location.currentLocationTitle': 'الموقع الحالي',
		'location.noLocationSelected': 'لم تختر موقعاً بعد.',
		'location.title': 'موقعك',
		'preparedness.title': 'مهام الاستعداد',
		'preparedness.subtitle': 'أكمل قوائم عملية لتعزيز استعدادك.',
		'preparedness.points': 'نقاط',
		'preparedness.tasksCompleted': 'المهام المكتملة',
		'preparedness.pendingSync': 'مزامنة معلقة',
		'preparedness.progressLoading': 'جارٍ تحميل التقدم المحفوظ…',
		'quiz.title': 'اختبار الاستعداد',
		'achievements.title': 'التقدم والإنجازات',
	},
} as const;

function setLanguage(language: 'en' | 'ar'): void {
	useAppLanguageMock.mockReturnValue({
		language,
		direction: language === 'ar' ? 'rtl' : 'ltr',
		isRTL: language === 'ar',
		setLanguage: jest.fn(),
		toggleLanguage: toggleLanguageMock,
		translate: (key: string) =>
			translations[language][
				key as keyof typeof translations[typeof language]
			] ?? key,
	});
}

function setGuestAuth(): void {
	useAuthMock.mockReturnValue({
		session: null,
		user: null,
		isAuthenticated: false,
		isLoading: false,
	});
}

function setAuthenticatedAuth(): void {
	useAuthMock.mockReturnValue({
		session: {} as ReturnType<typeof useAuth>['session'],
		user: { id: USER_ID } as ReturnType<typeof useAuth>['user'],
		isAuthenticated: true,
		isLoading: false,
	});
}

function setPreparednessReady(): void {
	usePreparednessDataMock.mockReturnValue({
		activeLocation: jeddahLocation,
		missions,
		resolvedHazards: [],
		status: 'ready',
		isLoading: false,
		refresh: jest.fn(),
	});
}

function setGuestProgress(): void {
	useMissionProgressMock.mockReturnValue({
		progress: [],
		pendingTaskIds: [],
		status: 'idle',
		isLoading: false,
		refresh: jest.fn(),
		setTaskCompletion: jest.fn(),
	});
}

function setAuthenticatedProgress(): void {
	useMissionProgressMock.mockReturnValue({
		progress: missionProgress,
		pendingTaskIds: [],
		status: 'ready',
		isLoading: false,
		refresh: jest.fn(),
		setTaskCompletion: jest.fn(),
	});
}

describe('IndexScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		setLanguage('en');
		setGuestAuth();
		setPreparednessReady();
		setGuestProgress();
	});

	test(
		'renders the production Home dashboard with active location and authenticated progress',
		async () => {
			setAuthenticatedAuth();
			setAuthenticatedProgress();

			await render(<IndexScreen />);

			expect(screen.getByText('Ihtiyat')).toBeTruthy();

			expect(
				screen.getByText('Preparedness starts before an emergency'),
			).toBeTruthy();

			expect(screen.getByText('Jeddah')).toBeTruthy();
			expect(screen.getByText('40%')).toBeTruthy();
			expect(screen.getByText('20 / 50 points')).toBeTruthy();
			expect(screen.getByText('1 / 2')).toBeTruthy();
		},
	);

	test(
		'routes from Home to the Preparedness Quiz and Missions',
		async () => {
			await render(<IndexScreen />);

			await fireEvent.press(
				screen.getByRole('button', {
					name: 'Preparedness Quiz',
				}),
			);

			expect(routerPushMock).toHaveBeenCalledWith(
				'/preparedness-quiz',
			);

			await fireEvent.press(
				screen.getByRole('button', {
					name: 'Preparedness Missions',
				}),
			);

			expect(routerPushMock).toHaveBeenCalledWith(
				'/missions-checklists',
			);
		},
	);

	test(
		'keeps guest progress private and offers account creation',
		async () => {
			await render(<IndexScreen />);

			expect(
				screen.getByText('Save your preparedness progress'),
			).toBeTruthy();

			expect(screen.queryByText('40%')).toBeNull();

			await fireEvent.press(
				screen.getByRole('button', {
					name: 'Create account',
				}),
			);

			expect(routerPushMock).toHaveBeenCalledWith('/register');
		},
	);

	test(
		'opens the shared location-selection screen from Home',
		async () => {
			await render(<IndexScreen />);

			await fireEvent.press(
				screen.getByRole('button', {
					name: 'Current location: Jeddah',
				}),
			);

			expect(routerPushMock).toHaveBeenCalledWith(
				'/location-selection',
			);
		},
	);

	test(
		'renders Arabic Home copy and keeps the language switch available',
		async () => {
			setLanguage('ar');

			await render(<IndexScreen />);

			expect(screen.getByText('احتياط')).toBeTruthy();

			expect(
				screen.getByText('الاستعداد يبدأ قبل حالة الطوارئ'),
			).toBeTruthy();

			expect(screen.getByText('جدة')).toBeTruthy();

			await fireEvent.press(
				screen.getByRole('button', {
					name: 'English',
				}),
			);

			expect(toggleLanguageMock).toHaveBeenCalledTimes(1);
		},
	);
});