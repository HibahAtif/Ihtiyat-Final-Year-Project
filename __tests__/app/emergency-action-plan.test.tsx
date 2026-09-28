/// <reference types="jest" />

import type {
	ReactNode,
} from 'react';

import {
	render,
	screen,
	waitFor,
} from '@testing-library/react-native';

import EmergencyActionPlanScreen from '@/app/emergency-action-plan';

import {
	useAlertsActionPlan,
} from '@/features/alerts/AlertsActionPlanProvider';

import {
	useAppLanguage,
} from '@/localization/AppLanguageProvider';

import type {
	DerivedActionPlan,
} from '@/features/alerts/alerts-action-plan-derivation';

import type {
	AlertsActionAlert,
} from '@/features/alerts/alerts-action-catalogue-service';

import type {
	ActionPlanAction,
	ActionPlanRule,
} from '@/features/alerts/action-plan-types';

import type {
	LocationRecord,
} from '@/profile/profile-types';


const mockUseLocalSearchParams =
	jest.fn();


jest.mock(
	'expo-router',
	() => ({
		Stack: {
			Screen:
				() => null,
		},

		useLocalSearchParams:
			() =>
				mockUseLocalSearchParams(),
	}),
);


jest.mock(
	'@/features/alerts/AlertsActionPlanProvider',
	() => ({
		useAlertsActionPlan:
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
 * Shared layout primitives have their own focused tests.
 *
 * This suite keeps the Action Plan tests centred on route handling, provider
 * integration, bilingual content and presentation of the already-ranked plan.
 */
jest.mock(
	'@/components/AppScreen',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);

		return {
			AppScreen:
				({
					children,
				}: {
					children:
						ReactNode;
				}) =>
					React.createElement(
						View,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/components/AppHeader',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			Text,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);

		return {
			AppHeader:
				({
					title,
				}: {
					title?: string;
				}) =>
					React.createElement(
						Text,
						null,
						title,
					),
		};
	},
);


jest.mock(
	'@/components/AppCard',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);

		return {
			AppCard:
				({
					children,
				}: {
					children:
						ReactNode;
				}) =>
					React.createElement(
						View,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/components/AppText',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			Text,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);

		return {
			AppText:
				({
					children,
					testID,
				}: {
					children?:
						ReactNode;
					testID?: string;
				}) =>
					React.createElement(
						Text,
						{
							testID,
						},
						children,
					),
		};
	},
);


const useAlertsActionPlanMock =
	useAlertsActionPlan as jest.MockedFunction<
		typeof useAlertsActionPlan
	>;

const useAppLanguageMock =
	useAppLanguage as jest.MockedFunction<
		typeof useAppLanguage
	>;


const getActionPlanMock =
	jest.fn<
		DerivedActionPlan,
		[number]
	>();

const setSimulationSeverityMock =
	jest.fn();


const jeddahLocation: LocationRecord = {
	id: 201,
	parent_id: 200,
	official_code: '0124',
	location_type: 'governorate',
	name_en: 'Jeddah',
	name_ar: 'جدة',
	is_active: true,
};


const floodAlert: AlertsActionAlert = {
	id: 101,
	code:
		'sim_flood_jeddah_severe',
	hazard_id: 11,
	origin_type: 'simulated',
	external_alert_id: null,
	severity: 3,

	title_en:
		'Severe Heavy Rain & Flash Flooding — Jeddah',

	title_ar:
		'أمطار غزيرة وسيول شديدة — جدة',

	message_en:
		'A severe flood scenario is being simulated for Jeddah.',

	message_ar:
		'تتم محاكاة سيناريو سيول شديدة في جدة.',

	starts_at:
		'2040-01-01T00:00:00.000Z',

	published_at:
		'2040-01-01T00:00:00.000Z',

	expires_at:
		'2099-12-31T23:59:59.000Z',

	publication_status:
		'published',

	sort_order: 10,
};


const followOfficialDirections: ActionPlanAction = {
	id: 301,
	code:
		'follow_official_directions',

	title_en:
		'Follow current official directions',

	title_ar:
		'اتبع التوجيهات الرسمية الحالية',

	instruction_en:
		'Follow evacuation, shelter or safety instructions issued by the relevant authorities.',

	instruction_ar:
		'اتبع تعليمات الإخلاء أو الاحتماء أو السلامة الصادرة عن الجهات المختصة.',

	sort_order: 10,
	is_active: true,
};


const checkOfficialUpdates: ActionPlanAction = {
	id: 302,
	code:
		'check_official_updates',

	title_en:
		'Check official updates',

	title_ar:
		'تحقق من التحديثات الرسمية',

	instruction_en:
		'Check current official information and continue monitoring changes.',

	instruction_ar:
		'تحقق من المعلومات الرسمية الحالية واستمر في متابعة المستجدات.',

	sort_order: 20,
	is_active: true,
};


const followDirectionsRule: ActionPlanRule = {
	id: 401,
	code:
		'flood_follow_official_directions',

	action_id:
		followOfficialDirections.id,

	hazard_id:
		floodAlert.hazard_id,

	location_id: null,
	linked_task_id: null,

	min_severity: 3,

	base_priority: 130,
	incomplete_task_boost: 0,

	safety_override: 1000,
	safety_override_min_severity: 3,

	min_children_count: null,
	min_older_adults_count: null,

	reason_en:
		'Official directions receive the highest priority at severe flood severity.',

	reason_ar:
		'تحصل التوجيهات الرسمية على أعلى أولوية عند شدة السيول العالية.',

	sort_order: 10,
	is_active: true,
};


const checkUpdatesRule: ActionPlanRule = {
	id: 402,
	code:
		'flood_check_official_updates',

	action_id:
		checkOfficialUpdates.id,

	hazard_id:
		floodAlert.hazard_id,

	location_id: null,
	linked_task_id: null,

	min_severity: 1,

	base_priority: 90,
	incomplete_task_boost: 0,

	safety_override: 500,
	safety_override_min_severity: 1,

	min_children_count: null,
	min_older_adults_count: null,

	reason_en:
		'Current official updates are important during flooding.',

	reason_ar:
		'التحديثات الرسمية الحالية مهمة أثناء السيول.',

	sort_order: 20,
	is_active: true,
};


const severeFloodPlan: DerivedActionPlan = {
	alert:
		floodAlert,

	effectiveSeverity:
		3,

	items: [
		{
			action:
				followOfficialDirections,

			rule:
				followDirectionsRule,

			score:
				1160,

			scoreBreakdown: {
				basePriority: 130,
				severityContribution: 30,
				incompleteTaskBoost: 0,
				safetyOverride: 1000,
				total: 1160,
			},
		},
		{
			action:
				checkOfficialUpdates,

			rule:
				checkUpdatesRule,

			score:
				620,

			scoreBreakdown: {
				basePriority: 90,
				severityContribution: 30,
				incompleteTaskBoost: 0,
				safetyOverride: 500,
				total: 620,
			},
		},
	],
};


const englishTranslations:
	Record<string, string> = {
		'actionPlan.title':
			'Emergency Action Plan',

		'actionPlan.preparing':
			'Preparing your emergency action plan…',

		'actionPlan.simulationBadge':
			'SIMULATION',

		'actionPlan.simulationNotice':
			'Preparedness simulation — not an official emergency warning.',

		'actionPlan.currentLocation':
			'Current location',

		'actionPlan.severity':
			'Scenario severity',

		'actionPlan.source':
			'Source',

		'actionPlan.remoteSource':
			'Ihtiyat simulation catalogue',

		'actionPlan.cacheSource':
			'Offline copy — previously downloaded Ihtiyat simulation data',

		'actionPlan.rankedActions':
			'What to do now',

		'actionPlan.priority':
			'Priority',

		'actionPlan.whyThisAction':
			'Why this action',

		'actionPlan.noActionsTitle':
			'No actions are currently recommended',

		'actionPlan.noActionsMessage':
			'No action rules currently apply to this scenario and preparedness context.',

		'actionPlan.unavailableTitle':
			'Action plan unavailable',

		'actionPlan.unavailableMessage':
			'Ihtiyat could not prepare this action plan from the current alert context.',

		'actionPlan.officialGuidance':
			'In a real emergency, follow current instructions from official Saudi authorities.',

		'alerts.level1':
			'Level 1',

		'alerts.level2':
			'Level 2',

		'alerts.level3':
			'Level 3',
	};


const arabicTranslations:
	Record<string, string> = {
		'actionPlan.title':
			'خطة إجراءات الطوارئ',

		'actionPlan.preparing':
			'جارٍ إعداد خطة إجراءات الطوارئ…',

		'actionPlan.simulationBadge':
			'محاكاة',

		'actionPlan.simulationNotice':
			'محاكاة لأغراض الاستعداد — وليست تحذيراً رسمياً للطوارئ.',

		'actionPlan.currentLocation':
			'الموقع الحالي',

		'actionPlan.severity':
			'شدة السيناريو',

		'actionPlan.source':
			'المصدر',

		'actionPlan.remoteSource':
			'كتالوج محاكاة احتياط',

		'actionPlan.cacheSource':
			'نسخة دون اتصال — بيانات محاكاة احتياط تم تنزيلها سابقاً',

		'actionPlan.rankedActions':
			'ما يجب فعله الآن',

		'actionPlan.priority':
			'الأولوية',

		'actionPlan.whyThisAction':
			'سبب أولوية هذا الإجراء',

		'actionPlan.noActionsTitle':
			'لا توجد إجراءات موصى بها حالياً',

		'actionPlan.noActionsMessage':
			'لا تنطبق حالياً أي قواعد إجراءات على هذا السيناريو وسياق الاستعداد.',

		'actionPlan.unavailableTitle':
			'خطة إجراءات الطوارئ غير متاحة',

		'actionPlan.unavailableMessage':
			'تعذر على احتياط إعداد خطة الإجراءات من سياق التنبيه الحالي.',

		'actionPlan.officialGuidance':
			'في حالة طوارئ حقيقية، اتبع التعليمات الحالية الصادرة عن الجهات الرسمية السعودية.',

		'alerts.level1':
			'المستوى 1',

		'alerts.level2':
			'المستوى 2',

		'alerts.level3':
			'المستوى 3',
	};


function mockLanguage(
	language:
		| 'en'
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
			(key: string) =>
				translations[key]
				?? key,
	});
}


function mockReadyProvider(
	overrides: Partial<
		ReturnType<
			typeof useAlertsActionPlan
		>
	> = {},
): void {
	useAlertsActionPlanMock.mockReturnValue({
		activeLocation:
			jeddahLocation,

		applicableAlerts: [
			floodAlert,
		],

		source:
			'remote',

		status:
			'ready',

		isLoading:
			false,

		isActionPlanContextLoading:
			false,

		simulationSeverity:
			3,

		setSimulationSeverity:
			setSimulationSeverityMock,

		getActionPlan:
			getActionPlanMock,

		refresh:
			jest.fn(
				async () =>
					undefined,
			),

		...overrides,
	});
}


beforeEach(() => {
	jest.clearAllMocks();

	mockUseLocalSearchParams.mockReturnValue({
		alertId:
			String(
				floodAlert.id,
			),

		severity:
			'3',
	});

	mockLanguage(
		'en',
	);

	getActionPlanMock.mockReturnValue(
		severeFloodPlan,
	);

	mockReadyProvider();
});


describe(
	'EmergencyActionPlanScreen',
	() => {
		test(
			'shows a preparing state while the catalogue or private Action Plan context is still loading',
			async () => {
				mockReadyProvider({
					isActionPlanContextLoading:
						true,
				});

				await render(
					<EmergencyActionPlanScreen />,
				);

				expect(
					screen.getByText(
						'Preparing your emergency action plan…',
					),
				).toBeTruthy();

				expect(
					getActionPlanMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'synchronises a valid route severity into the shared provider before deriving the plan',
			async () => {
				mockUseLocalSearchParams.mockReturnValue({
					alertId:
						String(
							floodAlert.id,
						),

					severity:
						'2',
				});

				mockReadyProvider({
					simulationSeverity:
						3,
				});

				await render(
					<EmergencyActionPlanScreen />,
				);

				await waitFor(
					() => {
						expect(
							setSimulationSeverityMock,
						).toHaveBeenCalledWith(
							2,
						);
					},
				);

				expect(
					getActionPlanMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'derives the plan for the routed alert once the required context and severity are ready',
			async () => {
				await render(
					<EmergencyActionPlanScreen />,
				);

				expect(
					getActionPlanMock,
				).toHaveBeenCalledWith(
					floodAlert.id,
				);
			},
		);


		test(
			'renders the selected alert context and deterministic actions in evaluator order',
			async () => {
				await render(
					<EmergencyActionPlanScreen />,
				);

				expect(
					screen.getByText(
						'Emergency Action Plan',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'SIMULATION',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						floodAlert.title_en,
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Jeddah',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Level 3',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Ihtiyat simulation catalogue',
					),
				).toBeTruthy();

				const actionTitles =
					screen.getAllByTestId(
						'action-plan-item-title',
					);

				expect(
					actionTitles.map(
						(item) =>
							item.props.children,
					),
				).toEqual([
					'Follow current official directions',
					'Check official updates',
				]);

				expect(
					screen.getByText(
						followOfficialDirections
							.instruction_en,
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						followDirectionsRule
							.reason_en,
					),
				).toBeTruthy();

				expect(
					screen.getAllByText(
						'Why this action',
					),
				).toHaveLength(
					2,
				);

				expect(
					screen.getByText(
						'Priority 1',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Priority 2',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Preparedness simulation — not an official emergency warning.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'In a real emergency, follow current instructions from official Saudi authorities.',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders canonical Arabic alert, action, instruction and winning-rule reason content',
			async () => {
				mockLanguage(
					'ar',
				);

				await render(
					<EmergencyActionPlanScreen />,
				);

				expect(
					screen.getByText(
						floodAlert.title_ar,
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'جدة',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						followOfficialDirections
							.title_ar,
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						followOfficialDirections
							.instruction_ar,
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						followDirectionsRule
							.reason_ar,
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'الأولوية 1',
					),
				).toBeTruthy();
			},
		);


		test(
			'clearly identifies a plan produced from the offline SQLite catalogue',
			async () => {
				mockReadyProvider({
					source:
						'cache',
				});

				await render(
					<EmergencyActionPlanScreen />,
				);

				expect(
					screen.getByText(
						'Offline copy — previously downloaded Ihtiyat simulation data',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders an explicit empty state when the evaluator returns no applicable actions',
			async () => {
				getActionPlanMock.mockReturnValue({
					...severeFloodPlan,

					items: [],
				});

				await render(
					<EmergencyActionPlanScreen />,
				);

				expect(
					screen.getByText(
						'No actions are currently recommended',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'No action rules currently apply to this scenario and preparedness context.',
					),
				).toBeTruthy();
			},
		);


		test(
			'rejects malformed route parameters without invoking Action Plan derivation',
			async () => {
				mockUseLocalSearchParams.mockReturnValue({
					alertId:
						'not-an-alert',

					severity:
						'4',
				});

				await render(
					<EmergencyActionPlanScreen />,
				);

				expect(
					screen.getByText(
						'Action plan unavailable',
					),
				).toBeTruthy();

				expect(
					getActionPlanMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'renders a safe unavailable state when current catalogue context cannot derive the routed plan',
			async () => {
				getActionPlanMock.mockImplementation(
					() => {
						throw new Error(
							'Alert is not applicable.',
						);
					},
				);

				await render(
					<EmergencyActionPlanScreen />,
				);

				expect(
					screen.getByText(
						'Action plan unavailable',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Ihtiyat could not prepare this action plan from the current alert context.',
					),
				).toBeTruthy();
			},
		);
	},
);