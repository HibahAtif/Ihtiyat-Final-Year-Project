/// <reference types="jest" />

import type {
	ReactNode,
} from 'react';

import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from '@testing-library/react-native';

import {
	router,
} from 'expo-router';

import ResourceHubDiscoveryScreen from '@/app/resource-hub-discovery';

import {
	useResourceHub,
} from '@/features/resource-hub/ResourceHubProvider';

import type {
	ResourceHubCatalogue,
} from '@/features/resource-hub/resource-hub-types';

import {
	usePreparednessData,
} from '@/features/preparedness/PreparednessDataProvider';

import type {
	PreparednessResolvedHazard,
} from '@/features/preparedness/preparedness-types';

import {
	useAppLanguage,
} from '@/localization/AppLanguageProvider';

import type {
	LocationRecord,
} from '@/profile/profile-types';


jest.mock(
	'expo-router',
	() => ({
		router: {
			push: jest.fn(),
			back: jest.fn(),
		},

		Stack: {
			Screen: () => null,
		},
	}),
);


const mockUseWindowDimensions = jest.fn();

jest.mock(
	'react-native/Libraries/Utilities/useWindowDimensions',
	() => ({
		__esModule: true,
		default: () => mockUseWindowDimensions(),
	}),
);


jest.mock(
	'@/features/resource-hub/ResourceHubProvider',
	() => ({
		useResourceHub: jest.fn(),
	}),
);


jest.mock(
	'@/features/preparedness/PreparednessDataProvider',
	() => ({
		usePreparednessData: jest.fn(),
	}),
);


jest.mock(
	'@/localization/AppLanguageProvider',
	() => ({
		useAppLanguage: jest.fn(),
	}),
);


/*
 * Shared presentation components have their own focused tests.
 *
 * This suite isolates Resource Hub discovery behaviour rather than
 * retesting typography, safe areas, cards or common button styling.
*/
jest.mock(
	'@/components/AppScreen',
	() => {
		const React =
			jest.requireActual<typeof import('react')>(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual<typeof import('react-native')>(
				'react-native',
			);

		return {
			AppScreen: ({
				children,
			}: {
				children: ReactNode;
			}) =>
				React.createElement(
					View,
					null,
					children,
				),
		};
	},
);

jest.mock('@expo/vector-icons', () => ({
	Ionicons: () => null,
}));

jest.mock('@/components/AppBottomNavigation', () => ({
	AppBottomNavigation: () => null,
}));

jest.mock(
	'@/components/AppText',
	() => {
		const React =
			jest.requireActual<typeof import('react')>(
				'react',
			);

		const {
			Text,
		} =
			jest.requireActual<typeof import('react-native')>(
				'react-native',
			);

		return {
			AppText: ({
				children,
			}: {
				children?: ReactNode;
			}) =>
				React.createElement(
					Text,
					null,
					children,
				),
		};
	},
);


jest.mock(
	'@/components/AppStatusMessage',
	() => {
		const React =
			jest.requireActual<typeof import('react')>(
				'react',
			);

		const {
			Text,
		} =
			jest.requireActual<typeof import('react-native')>(
				'react-native',
			);

		return {
			AppStatusMessage: ({
				message,
			}: {
				message: string;
			}) =>
				React.createElement(
					Text,
					{
						testID:
							'resource-hub-status-message',
					},
					message,
				),
		};
	},
);


jest.mock(
	'@/components/AppButton',
	() => {
		const React =
			jest.requireActual<typeof import('react')>(
				'react',
			);

		const {
			Pressable,
			Text,
		} =
			jest.requireActual<typeof import('react-native')>(
				'react-native',
			);

		return {
			AppButton: ({
				label,
				onPress,
				disabled = false,
				accessibilityLabel,
			}: {
				label: string;
				onPress: () => void;
				disabled?: boolean;
				accessibilityLabel?: string;
			}) =>
				React.createElement(
					Pressable,
					{
						accessibilityRole:
							'button',

						accessibilityLabel:
							accessibilityLabel
							?? label,

						accessibilityState: {
							disabled,
						},

						disabled,
						onPress,
					},
					React.createElement(
						Text,
						null,
						label,
					),
				),
		};
	},
);


const useResourceHubMock =
	jest.mocked(
		useResourceHub,
	);

const usePreparednessDataMock =
	jest.mocked(
		usePreparednessData,
	);

const useAppLanguageMock =
	jest.mocked(
		useAppLanguage,
	);

const routerPushMock =
	router.push as jest.MockedFunction<
		typeof router.push
	>;


const resourceRefreshMock =
	jest.fn<
		Promise<void>,
		[]
	>();

const preparednessRefreshMock =
	jest.fn<
		Promise<void>,
		[]
	>();


const jeddahLocation: LocationRecord = {
	id: 201,
	parent_id: 200,
	official_code: '0124',
	location_type: 'governorate',
	name_en: 'Jeddah',
	name_ar: 'جدة',
	is_active: true,
};


const floodHazard: PreparednessResolvedHazard = {
	hazard_id: 11,
	hazard_code: 'heavy_rain_flash_flooding',
	hazard_name_en: 'Heavy Rain / Flash Flooding',
	hazard_name_ar: 'الأمطار الغزيرة والسيول',
	classification: 'core',
	hazard_sort_order: 10,
	is_prioritised: true,
	relevance_rank: 1,
	matched_location_id: 201,
	matched_location_code: '0124',
	matched_location_type: 'governorate',
	matched_location_name_en: 'Jeddah',
	matched_location_name_ar: 'جدة',
	hierarchy_distance: 0,
};


const nonPrioritisedHeatHazard:
	PreparednessResolvedHazard = {
		hazard_id: 22,
		hazard_code: 'extreme_heat',
		hazard_name_en: 'Extreme Heat',
		hazard_name_ar: 'الحر الشديد',
		classification: 'core',
		hazard_sort_order: 20,
		is_prioritised: false,
		relevance_rank: null,
		matched_location_id: null,
		matched_location_code: null,
		matched_location_type: null,
		matched_location_name_en: null,
		matched_location_name_ar: null,
		hierarchy_distance: null,
	};


const catalogue: ResourceHubCatalogue = {
	topics: [
		{
			id: 1,
			code: 'first_aid',
			name_en: 'First Aid',
			name_ar: 'الإسعافات الأولية',
			description_en:
				'First-aid preparation.',
			description_ar:
				'الاستعداد للإسعافات الأولية.',
			sort_order: 10,
			is_active: true,
		},
		{
			id: 2,
			code: 'flood_safety',
			name_en: 'Flood Safety',
			name_ar: 'السلامة من السيول',
			description_en:
				'Flood preparedness and response.',
			description_ar:
				'الاستعداد للسيول والاستجابة لها.',
			sort_order: 20,
			is_active: true,
		},
		{
			id: 3,
			code: 'heat_safety',
			name_en: 'Heat Safety',
			name_ar: 'السلامة من الحر',
			description_en:
				'Heat safety guidance.',
			description_ar:
				'إرشادات السلامة من الحر.',
			sort_order: 30,
			is_active: true,
		},
	],

	resources: [
		{
			id: 101,
			code: 'first_aid_kit_basics',
			title_en: 'First aid kit basics',
			title_ar: 'أساسيات حقيبة الإسعافات الأولية',
			summary_en:
				'Prepare essential first-aid supplies.',
			summary_ar:
				'جهّز مستلزمات الإسعافات الأولية الأساسية.',
			content_en:
				'Reviewed first-aid guidance.',
			content_ar:
				'إرشادات إسعافات أولية تمت مراجعتها.',
			publication_status: 'published',
			sort_order: 10,
			last_reviewed_on: '2026-09-22',
			published_at:
				'2026-09-22T00:00:00+00:00',
		},
		{
			id: 102,
			code: 'flood_route_safety',
			title_en: 'Flood route safety',
			title_ar: 'السلامة على الطرق أثناء السيول',
			summary_en:
				'Avoid dangerous flooded routes.',
			summary_ar:
				'تجنب الطرق الخطرة المغمورة بالمياه.',
			content_en:
				'Reviewed flood-route guidance.',
			content_ar:
				'إرشادات تمت مراجعتها للطرق أثناء السيول.',
			publication_status: 'published',
			sort_order: 20,
			last_reviewed_on: '2026-09-23',
			published_at:
				'2026-09-23T00:00:00+00:00',
		},
		{
			id: 103,
			code: 'extreme_heat_safety',
			title_en: 'Extreme heat safety',
			title_ar: 'السلامة من الحر الشديد',
			summary_en:
				'Reduce exposure during extreme heat.',
			summary_ar:
				'قلل التعرض أثناء الحر الشديد.',
			content_en:
				'Reviewed heat safety guidance.',
			content_ar:
				'إرشادات تمت مراجعتها للسلامة من الحر.',
			publication_status: 'published',
			sort_order: 30,
			last_reviewed_on: '2026-09-24',
			published_at:
				'2026-09-24T00:00:00+00:00',
		},
	],

	sources: [],

	topicLinks: [
		{
			resource_id: 101,
			topic_id: 1,
			is_primary: true,
			sort_order: 10,
		},
		{
			resource_id: 102,
			topic_id: 2,
			is_primary: true,
			sort_order: 10,
		},
		{
			resource_id: 103,
			topic_id: 3,
			is_primary: true,
			sort_order: 10,
		},
	],

	/*
	 * Resource 102 deliberately matches both the current hazard and current
	 * location. The derivation layer should still return it only once.
	*/
	hazardLinks: [
		{
			resource_id: 102,
			hazard_id: 11,
		},
		{
			resource_id: 103,
			hazard_id: 22,
		},
	],

	locationLinks: [
		{
			resource_id: 102,
			location_id: 201,
		},
	],

	missionTaskLinks: [],
	quizQuestionLinks: [],
};


const englishTranslations:
	Record<string, string> = {
		'resourceHub.title':
			'Resource Hub',

		'resourceHub.subtitle':
			'Browse reviewed safety guidance from trusted sources.',

		'resourceHub.loading':
			'Loading safety resources…',

		'resourceHub.errorTitle':
			'Resource Hub unavailable',

		'resourceHub.errorMessage':
			'Safety resources could not be loaded from the network or the saved offline copy.',

		'resourceHub.tryAgain':
			'Try again',

		'resourceHub.refresh':
			'Refresh resources',

		'resourceHub.currentLocation':
			'Current location',

		'resourceHub.noLocation':
			'No location selected',

		'resourceHub.relevantHazards':
			'Relevant hazards',

		'resourceHub.noHazardContext':
			'No location-specific hazard context is available right now.',

		'resourceHub.catalogueSource':
			'Resource status',

		'resourceHub.updatedOnline':
			'Updated online',

		'resourceHub.offlineCopy':
			'Offline copy',

		'resourceHub.offlineNotice':
			'You are viewing the last saved Resource Hub copy. The guidance remains available while you are offline.',

		'resourceHub.relevantTitle':
			'Relevant to your location',

		'resourceHub.relevantDescription':
			'Guidance linked to hazards or locations relevant to your current preparedness context.',

		'resourceHub.browseTitle':
			'Browse all guidance',

		'resourceHub.filterTitle':
			'Filter by topic',

		'resourceHub.allResources':
			'All guidance',

		'resourceHub.noRelevantResources':
			'No resources are specifically linked to your current location or hazard profile.',

		'resourceHub.noResources':
			'No published safety resources are available right now.',

		'resourceHub.readGuidance':
			'Read guidance',

		'resourceHub.lastReviewed':
			'Last reviewed',

		'resourceHub.reviewDateUnavailable':
			'Review date unavailable',

		'resourceHub.sourceContext':
			'Ihtiyat presents reviewed preparedness guidance and links back to its sources. Official emergency services and authorities remain authoritative.',
	};


const arabicTranslations:
	Record<string, string> = {
		'resourceHub.title':
			'مركز الموارد',

		'resourceHub.subtitle':
			'استعرض إرشادات سلامة تمت مراجعتها من مصادر موثوقة.',

		'resourceHub.loading':
			'جارٍ تحميل موارد السلامة…',

		'resourceHub.errorTitle':
			'مركز الموارد غير متاح',

		'resourceHub.errorMessage':
			'تعذر تحميل موارد السلامة من الشبكة أو من النسخة المحفوظة للاستخدام دون اتصال.',

		'resourceHub.tryAgain':
			'المحاولة مرة أخرى',

		'resourceHub.refresh':
			'تحديث الموارد',

		'resourceHub.currentLocation':
			'الموقع الحالي',

		'resourceHub.noLocation':
			'لم يتم اختيار موقع',

		'resourceHub.relevantHazards':
			'المخاطر ذات الصلة',

		'resourceHub.noHazardContext':
			'لا يتوفر حالياً سياق مخاطر خاص بالموقع.',

		'resourceHub.catalogueSource':
			'حالة الموارد',

		'resourceHub.updatedOnline':
			'تم التحديث عبر الإنترنت',

		'resourceHub.offlineCopy':
			'نسخة محفوظة دون اتصال',

		'resourceHub.offlineNotice':
			'أنت تعرض آخر نسخة محفوظة من مركز الموارد. تظل الإرشادات متاحة أثناء عدم الاتصال بالإنترنت.',

		'resourceHub.relevantTitle':
			'إرشادات مرتبطة بموقعك',

		'resourceHub.relevantDescription':
			'إرشادات مرتبطة بالمخاطر أو المواقع ذات الصلة بسياق استعدادك الحالي.',

		'resourceHub.browseTitle':
			'استعراض جميع الإرشادات',

		'resourceHub.filterTitle':
			'التصفية حسب الموضوع',

		'resourceHub.allResources':
			'جميع الإرشادات',

		'resourceHub.noRelevantResources':
			'لا توجد موارد مرتبطة بشكل خاص بموقعك الحالي أو ملف المخاطر.',

		'resourceHub.noResources':
			'لا توجد موارد سلامة منشورة متاحة حالياً.',

		'resourceHub.readGuidance':
			'قراءة الإرشادات',

		'resourceHub.lastReviewed':
			'آخر مراجعة',

		'resourceHub.reviewDateUnavailable':
			'تاريخ المراجعة غير متاح',

		'resourceHub.sourceContext':
			'يعرض احتياط إرشادات استعداد تمت مراجعتها ويوفر روابط إلى مصادرها. وتظل الجهات الرسمية وخدمات الطوارئ هي المرجع المعتمد.',
	};


function mockLanguage(
	language: 'en' | 'ar',
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

		translate: (
			key: string,
		): string =>
			translations[key]
			?? key,
	});
}


function mockResourceHubReady(
	overrides: Partial<
		ReturnType<
			typeof useResourceHub
		>
	> = {},
): void {
	useResourceHubMock.mockReturnValue({
		catalogue,
		source: 'remote',
		status: 'ready',
		isLoading: false,
		refresh: resourceRefreshMock,
		...overrides,
	});
}


function mockPreparednessReady(
	overrides: Partial<
		ReturnType<
			typeof usePreparednessData
		>
	> = {},
): void {
	usePreparednessDataMock.mockReturnValue({
		activeLocation:
			jeddahLocation,

		missions:
			[],

		resolvedHazards: [
			floodHazard,
			nonPrioritisedHeatHazard,
		],

		status:
			'ready',

		isLoading:
			false,

		refresh:
			preparednessRefreshMock,

		...overrides,
	});
}


beforeEach(() => {
	jest.clearAllMocks();

	resourceRefreshMock.mockResolvedValue(
		undefined,
	);

	preparednessRefreshMock.mockResolvedValue(
		undefined,
	);

	mockLanguage(
		'en',
	);

	mockResourceHubReady();
	mockPreparednessReady();

	mockUseWindowDimensions.mockReturnValue({
		width: 390,
		height: 844,
		scale: 3,
		fontScale: 1,
	});
});


describe(
	'ResourceHubDiscoveryScreen',
	() => {
		test(
			'renders a clear loading state while the Resource Hub catalogue is restoring',
			async () => {
				mockResourceHubReady({
					catalogue: null,
					source: null,
					status: 'loading',
					isLoading: true,
				});

				await render(
					<ResourceHubDiscoveryScreen />,
				);

				expect(
					screen.getByText(
						'Loading safety resources…',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders the terminal loader error and retries through the shared Resource Hub provider',
			async () => {
				mockResourceHubReady({
					catalogue: null,
					source: null,
					status: 'error',
					isLoading: false,
				});

				await render(
					<ResourceHubDiscoveryScreen />,
				);

				expect(
					screen.getByText(
						'Resource Hub unavailable',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Safety resources could not be loaded from the network or the saved offline copy.',
					),
				).toBeTruthy();

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name: 'Try again',
						},
					),
				);

				expect(
					resourceRefreshMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'renders the English public Resource Hub catalogue and provenance context',
			async () => {
				await render(
					<ResourceHubDiscoveryScreen />,
				);

				expect(
					screen.getAllByText(
						'Resource Hub',
					).length,
				).toBeGreaterThanOrEqual(
					1,
				);

				expect(
					screen.getByText(
						'Browse reviewed safety guidance from trusted sources.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'First aid kit basics',
					),
				).toBeTruthy();

				expect(
					screen.getAllByText(
						'Flood route safety',
					).length,
				).toBeGreaterThanOrEqual(
					1,
				);

				expect(
					screen.getByText(
						'Extreme heat safety',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Ihtiyat presents reviewed preparedness guidance and links back to its sources. Official emergency services and authorities remain authoritative.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Updated online',
					),
				).toBeTruthy();
			},
		);


		test(
			'shows the active location and only prioritised preparedness hazards as current context',
			async () => {
				await render(
					<ResourceHubDiscoveryScreen />,
				);

				expect(
					screen.getByText(
						'Jeddah',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Heavy Rain / Flash Flooding',
					),
				).toBeTruthy();

				expect(
					screen.queryByText(
						'Extreme Heat',
					),
				).toBeNull();
			},
		);


		test(
			'derives location and hazard relevant resources without duplicating a resource matched by both relationships',
			async () => {
				await render(
					<ResourceHubDiscoveryScreen />,
				);

				/*
				 * Resource 102 is rendered once in the relevant section and once
				 * in Browse all guidance. It matches both hazard 11 and location
				 * 201, but must not be duplicated within the relevant section.
				*/
				expect(
					screen.getAllByText(
						'Flood route safety',
					),
				).toHaveLength(
					2,
				);

				/*
				 * First aid has no current hazard/location relationship, so it
				 * appears only in the complete browsing catalogue.
				*/
				expect(
					screen.getAllByText(
						'First aid kit basics',
					),
				).toHaveLength(
					1,
				);

				expect(
					screen.getAllByText(
						'Extreme heat safety',
					),
				).toHaveLength(
					1,
				);
			},
		);


		test(
			'filters the browse catalogue by topic and exposes selection through radio state and a visible checkmark',
			async () => {
				await render(
					<ResourceHubDiscoveryScreen />,
				);

				const firstAidFilter =
					screen.getByRole(
						'radio',
						{
							name: 'First Aid',
						},
					);

				expect(
					firstAidFilter.props
						.accessibilityState
						.selected,
				).toBe(
					false,
				);

				await fireEvent.press(firstAidFilter,);

				const selectedFilter = screen.getByRole('radio', {
					name: 'First Aid',
				});

				expect(
					selectedFilter.props.accessibilityState.selected
				).toBe(true);

				expect(
					screen.getByRole('radio',
						{
							name: 'All guidance',
						},
					).props.accessibilityState.selected,
				).toBe(false);

				/*
				 * First aid remains in the filtered browse list.
				*/
				expect(
					screen.getByText(
						'First aid kit basics',
					),
				).toBeTruthy();

				/*
				 * Flood guidance remains once because the context-relevant
				 * section is independent of the topic filter, but its Browse
				 * all guidance copy has disappeared.
				*/
				expect(
					screen.getAllByText(
						'Flood route safety',
					),
				).toHaveLength(
					1,
				);

				/*
				 * Heat guidance belongs only to another topic and is not
				 * context-relevant, so it disappears completely.
				*/
				expect(
					screen.queryByText(
						'Extreme heat safety',
					),
				).toBeNull();
			},
		);

		test(
			'keeps topic filters accessible and selectable with a large system font scale',
			async () => {
				mockUseWindowDimensions.mockReturnValue({
					width: 390,
					height: 844,
					scale: 3,
					fontScale: 2,
				});

				await render(<ResourceHubDiscoveryScreen />);

				const firstAidFilter = screen.getByRole('radio', {
					name: 'First Aid',
				});

				expect(firstAidFilter.props.accessibilityState.selected).toBe(false);

				await fireEvent.press(firstAidFilter);

				const selectedFirstAidFilter = screen.getByRole('radio', {
					name: 'First Aid',
				});

				expect(selectedFirstAidFilter.props.accessibilityState.selected).toBe(true);

				const selectedFilterContent = within(selectedFirstAidFilter);

				expect(selectedFilterContent.getByText('First Aid')).toBeTruthy();
			},
		);


		test(
			'clearly identifies a catalogue restored from the durable SQLite cache',
			async () => {
				mockResourceHubReady({
					source: 'cache',
				});

				await render(
					<ResourceHubDiscoveryScreen />,
				);

				expect(
					screen.getByText(
						'Offline copy',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'You are viewing the last saved Resource Hub copy. The guidance remains available while you are offline.',
					),
				).toBeTruthy();

				expect(
					screen.queryByText(
						'Updated online',
					),
				).toBeNull();
			},
		);


		test(
			'renders Arabic location, hazard, topic and resource content when Arabic is active',
			async () => {
				mockLanguage(
					'ar',
				);

				await render(
					<ResourceHubDiscoveryScreen />,
				);

				expect(
					screen.getAllByText(
						'مركز الموارد',
					).length,
				).toBeGreaterThanOrEqual(
					1,
				);

				expect(
					screen.getByText(
						'جدة',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'الأمطار الغزيرة والسيول',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'أساسيات حقيبة الإسعافات الأولية',
					),
				).toBeTruthy();

				expect(
					screen.getByRole(
						'radio',
						{
							name:
								'الإسعافات الأولية',
						},
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'تم التحديث عبر الإنترنت',
					),
				).toBeTruthy();
			},
		);


		test(
			'navigates to Resource Hub detail with the canonical resource ID',
			async () => {
				await render(
					<ResourceHubDiscoveryScreen />,
				);

				/*
				 * Resource 101 is not in the relevant section, so this accessible
				 * action is unique on the screen.
				 */
				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Read guidance: First aid kit basics',
						},
					),
				);

				expect(
					routerPushMock,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					routerPushMock,
				).toHaveBeenCalledWith({
					pathname:
						'/resource-hub-resource-detail',

					params: {
						resourceId:
							'101',
					},
				});
			},
		);


		test(
			'refreshes resources only through the shared Resource Hub provider boundary',
			async () => {
				await render(
					<ResourceHubDiscoveryScreen />,
				);

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Refresh resources',
						},
					),
				);

				expect(
					resourceRefreshMock,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					preparednessRefreshMock,
				).not.toHaveBeenCalled();
			},
		);
	},
);