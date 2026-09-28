/// <reference types="jest" />

import type {
	ReactNode,
} from 'react';

import {
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react-native';

import {
	router,
	useLocalSearchParams,
} from 'expo-router';

import ResourceHubResourceDetailScreen from '@/app/resource-hub-resource-detail';

import {
	openResourceSourceUrl,
} from '@/features/resource-hub/resource-hub-external-link';

import {
	useResourceHub,
} from '@/features/resource-hub/ResourceHubProvider';

import type {
	ResourceHubCatalogue,
} from '@/features/resource-hub/resource-hub-types';

import {
	usePreparednessData,
} from '@/features/preparedness/PreparednessDataProvider';

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
			replace: jest.fn(),
			back: jest.fn(),
		},

		useLocalSearchParams:
			jest.fn(),

		Stack: {
			Screen: () => null,
		},
	}),
);


jest.mock(
	'@/features/resource-hub/resource-hub-external-link',
	() => ({
		openResourceSourceUrl:
			jest.fn(),
	}),
);


const mockUseWindowDimensions =
	jest.fn();

jest.mock(
	'react-native/Libraries/Utilities/useWindowDimensions',
	() => ({
		__esModule: true,
		default: () =>
			mockUseWindowDimensions(),
	}),
);


jest.mock(
	'@/features/resource-hub/ResourceHubProvider',
	() => ({
		useResourceHub:
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
	'@/localization/AppLanguageProvider',
	() => ({
		useAppLanguage:
			jest.fn(),
	}),
);


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


jest.mock(
	'@/components/AppHeader',
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
			AppHeader: ({
				title,
			}: {
				title?: string;
			}) =>
				React.createElement(
					Text,
					{
						testID:
							'resource-detail-header',
					},
					title,
				),
		};
	},
);

jest.mock('@expo/vector-icons', () => ({
	Ionicons: () => null,
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
							'resource-detail-status-message',
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

const useLocalSearchParamsMock =
	jest.mocked(
		useLocalSearchParams,
	);

const openResourceSourceUrlMock =
	jest.mocked(
		openResourceSourceUrl,
	);

const routerReplaceMock =
	router.replace as jest.MockedFunction<
		typeof router.replace
	>;


const refreshMock =
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
	],

	resources: [
		{
			id: 101,
			code: 'flood_route_safety',
			title_en:
				'Flood route safety',
			title_ar:
				'السلامة على الطرق أثناء السيول',
			summary_en:
				'Avoid dangerous flooded routes.',
			summary_ar:
				'تجنب الطرق الخطرة المغمورة بالمياه.',
			content_en:
				'Never attempt to cross moving floodwater. Follow current official instructions and use safer routes.',
			content_ar:
				'لا تحاول عبور مياه السيول الجارية. اتبع التعليمات الرسمية الحالية واستخدم الطرق الأكثر أماناً.',
			publication_status:
				'published',
			sort_order: 10,
			last_reviewed_on:
				'2026-09-22',
			published_at:
				'2026-09-22T00:00:00+00:00',
		},
		{
			id: 102,
			code: 'resource_without_sources',
			title_en:
				'Preparedness basics',
			title_ar:
				'أساسيات الاستعداد',
			summary_en:
				'General preparedness guidance.',
			summary_ar:
				'إرشادات عامة للاستعداد.',
			content_en:
				'Prepare before an emergency.',
			content_ar:
				'استعد قبل حالة الطوارئ.',
			publication_status:
				'published',
			sort_order: 20,
			last_reviewed_on:
				null,
			published_at:
				null,
		},
	],

	sources: [
		{
			id: 201,
			resource_id: 101,
			publisher_name_en:
				'National Center for Meteorology',
			publisher_name_ar:
				'المركز الوطني للأرصاد',
			source_title_en:
				'Flood safety guidance',
			source_title_ar:
				'إرشادات السلامة من السيول',
			source_url:
				'https://example.gov.sa/flood',
			source_language_code:
				'ar',
			is_official:
				true,
			last_checked_on:
				'2026-09-23',
			sort_order:
				10,
			is_active:
				true,
		},
		{
			id: 202,
			resource_id: 101,
			publisher_name_en:
				'Preparedness Research Centre',
			publisher_name_ar:
				'مركز أبحاث الاستعداد',
			source_title_en:
				'Supporting flood preparedness reference',
			source_title_ar:
				'مرجع داعم للاستعداد للسيول',
			source_url:
				'https://example.org/flood-reference',
			source_language_code:
				'en',
			is_official:
				false,
			last_checked_on:
				'2026-09-24',
			sort_order:
				20,
			is_active:
				true,
		},
	],

	topicLinks: [
		{
			resource_id: 101,
			topic_id: 2,
			is_primary: true,
			sort_order: 20,
		},
		{
			resource_id: 101,
			topic_id: 1,
			is_primary: false,
			sort_order: 10,
		},
	],

	hazardLinks: [],
	locationLinks: [],
	missionTaskLinks: [],
	quizQuestionLinks: [],
};


const englishTranslations:
	Record<string, string> = {
		'resourceHub.title':
			'Resource Hub',

		'resourceHub.detailLoading':
			'Loading guidance…',

		'resourceHub.detailUnavailableTitle':
			'Guidance unavailable',

		'resourceHub.detailUnavailableMessage':
			'This Resource Hub entry is not available in the current catalogue.',

		'resourceHub.backToResourceHub':
			'Back to Resource Hub',

		'resourceHub.guidance':
			'Guidance',

		'resourceHub.topics':
			'Topics',

		'resourceHub.primaryTopic':
			'Primary topic',

		'resourceHub.additionalTopic':
			'Related topic',

		'resourceHub.sources':
			'Sources',

		'resourceHub.sourcesDescription':
			'Ihtiyat links reviewed guidance back to its original sources so you can check the authoritative information directly.',

		'resourceHub.noSources':
			'No external source links are available for this resource.',

		'resourceHub.officialSource':
			'Official source',

		'resourceHub.referenceSource':
			'Reference source',

		'resourceHub.publisher':
			'Publisher',

		'resourceHub.sourceChecked':
			'Source checked',

		'resourceHub.openOfficialSource':
			'Open official source',

		'resourceHub.openSource':
			'Open source',

		'resourceHub.sourceOpenError':
			'The source could not be opened on this device. Please try again later.',

		'resourceHub.unsafeSourceLink':
			'This source link could not be opened because its address is not considered safe.',

		'resourceHub.detailOfflineNotice':
			'This guidance is being shown from the last saved offline Resource Hub copy.',

		'resourceHub.resourceStatus':
			'Resource status',

		'resourceHub.currentLocation':
			'Current location',

		'resourceHub.noLocation':
			'No location selected',

		'resourceHub.updatedOnline':
			'Updated online',

		'resourceHub.offlineCopy':
			'Offline copy',

		'resourceHub.lastReviewed':
			'Last reviewed',

		'resourceHub.reviewDateUnavailable':
			'Review date unavailable',

		'resourceHub.refresh':
			'Refresh resources',

		'resourceHub.tryAgain':
			'Try again',

		'resourceHub.errorTitle':
			'Resource Hub unavailable',

		'resourceHub.errorMessage':
			'Safety resources could not be loaded from the network or the saved offline copy.',

		'resourceHub.sourceContext':
			'Ihtiyat presents reviewed preparedness guidance and links back to its sources. Official emergency services and authorities remain authoritative.',
	};


const arabicTranslations:
	Record<string, string> = {
		'resourceHub.title':
			'مركز الموارد',

		'resourceHub.detailLoading':
			'جارٍ تحميل الإرشادات…',

		'resourceHub.detailUnavailableTitle':
			'الإرشادات غير متاحة',

		'resourceHub.detailUnavailableMessage':
			'هذا المورد غير متاح في الكتالوج الحالي لمركز الموارد.',

		'resourceHub.backToResourceHub':
			'العودة إلى مركز الموارد',

		'resourceHub.guidance':
			'الإرشادات',

		'resourceHub.topics':
			'الموضوعات',

		'resourceHub.primaryTopic':
			'الموضوع الرئيسي',

		'resourceHub.additionalTopic':
			'موضوع ذو صلة',

		'resourceHub.sources':
			'المصادر',

		'resourceHub.sourcesDescription':
			'يربط احتياط الإرشادات التي تمت مراجعتها بمصادرها الأصلية حتى تتمكن من الرجوع إلى المعلومات المعتمدة مباشرة.',

		'resourceHub.noSources':
			'لا تتوفر روابط خارجية لمصادر هذا المورد.',

		'resourceHub.officialSource':
			'مصدر رسمي',

		'resourceHub.referenceSource':
			'مصدر مرجعي',

		'resourceHub.publisher':
			'الناشر',

		'resourceHub.sourceChecked':
			'آخر تحقق من المصدر',

		'resourceHub.openOfficialSource':
			'فتح المصدر الرسمي',

		'resourceHub.openSource':
			'فتح المصدر',

		'resourceHub.sourceOpenError':
			'تعذر فتح المصدر على هذا الجهاز. يرجى المحاولة مرة أخرى لاحقاً.',

		'resourceHub.unsafeSourceLink':
			'تعذر فتح رابط المصدر لأن عنوانه لا يستوفي متطلبات الأمان.',

		'resourceHub.detailOfflineNotice':
			'يتم عرض هذه الإرشادات من آخر نسخة محفوظة دون اتصال لمركز الموارد.',

		'resourceHub.resourceStatus':
			'حالة المورد',

		'resourceHub.currentLocation':
			'الموقع الحالي',

		'resourceHub.noLocation':
			'لم يتم اختيار موقع',

		'resourceHub.updatedOnline':
			'تم التحديث عبر الإنترنت',

		'resourceHub.offlineCopy':
			'نسخة محفوظة دون اتصال',

		'resourceHub.lastReviewed':
			'آخر مراجعة',

		'resourceHub.reviewDateUnavailable':
			'تاريخ المراجعة غير متاح',

		'resourceHub.refresh':
			'تحديث الموارد',

		'resourceHub.tryAgain':
			'المحاولة مرة أخرى',

		'resourceHub.errorTitle':
			'مركز الموارد غير متاح',

		'resourceHub.errorMessage':
			'تعذر تحميل موارد السلامة من الشبكة أو من النسخة المحفوظة للاستخدام دون اتصال.',

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
		refresh: refreshMock,
		...overrides,
	});
}


function mockPreparednessReady():
	void {
	usePreparednessDataMock.mockReturnValue({
		activeLocation:
			jeddahLocation,

		missions:
			[],

		resolvedHazards:
			[],

		status:
			'ready',

		isLoading:
			false,

		refresh:
			jest.fn(),
	});
}


beforeEach(() => {
	jest.clearAllMocks();

	refreshMock.mockResolvedValue(
		undefined,
	);

	useLocalSearchParamsMock.mockReturnValue({
		resourceId: '101',
	});

	openResourceSourceUrlMock.mockResolvedValue(
		'opened',
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
	'ResourceHubResourceDetailScreen',
	() => {
		test(
			'rejects an invalid route resource ID and provides a deterministic return to the Resource Hub',
			async () => {
				useLocalSearchParamsMock.mockReturnValue({
					resourceId: 'not-a-number',
				});

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				expect(
					screen.getByText(
						'Guidance unavailable',
					),
				).toBeTruthy();

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Back to Resource Hub',
						},
					),
				);

				expect(
					routerReplaceMock,
				).toHaveBeenCalledWith(
					'/resource-hub-discovery',
				);
			},
		);


		test(
			'renders an unavailable state when a valid resource ID is absent from the accepted catalogue',
			async () => {
				useLocalSearchParamsMock.mockReturnValue({
					resourceId: '999',
				});

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				expect(
					screen.getByText(
						'Guidance unavailable',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'This Resource Hub entry is not available in the current catalogue.',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders a loading state while the Resource Hub catalogue is restoring',
			async () => {
				mockResourceHubReady({
					catalogue: null,
					source: null,
					status: 'loading',
					isLoading: true,
				});

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				expect(
					screen.getByText(
						'Loading guidance…',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders the terminal catalogue error and retries through the shared provider',
			async () => {
				mockResourceHubReady({
					catalogue: null,
					source: null,
					status: 'error',
					isLoading: false,
				});

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				expect(
					screen.getByText(
						'Resource Hub unavailable',
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
					refreshMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'renders full English guidance, location, review metadata, topic roles and source provenance',
			async () => {
				await render(
					<ResourceHubResourceDetailScreen />,
				);

				expect(
					screen.getByText(
						'Flood route safety',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Avoid dangerous flooded routes.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Never attempt to cross moving floodwater. Follow current official instructions and use safer routes.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Jeddah',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Updated online',
					),
				).toBeTruthy();

				expect(
					screen.getAllByText('Flood Safety'),
				).toHaveLength(2);

				expect(
					screen.getByText(
						'Primary topic',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'First Aid',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Related topic',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Official source',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Reference source',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'National Center for Meteorology',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Preparedness Research Centre',
					),
				).toBeTruthy();
			},
		);


		test(
			'clearly identifies guidance restored from the durable offline Resource Hub cache',
			async () => {
				mockResourceHubReady({
					source: 'cache',
				});

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				expect(
					screen.getByText(
						'Offline copy',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'This guidance is being shown from the last saved offline Resource Hub copy.',
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
			'renders Arabic guidance, location, topics and source provenance when Arabic is active',
			async () => {
				mockLanguage(
					'ar',
				);

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				expect(
					screen.getByText(
						'السلامة على الطرق أثناء السيول',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'تجنب الطرق الخطرة المغمورة بالمياه.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'لا تحاول عبور مياه السيول الجارية. اتبع التعليمات الرسمية الحالية واستخدم الطرق الأكثر أماناً.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'جدة',
					),
				).toBeTruthy();

				expect(
					screen.getAllByText('السلامة من السيول'),
				).toHaveLength(2);

				expect(
					screen.getByText(
						'الموضوع الرئيسي',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'المركز الوطني للأرصاد',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'مصدر رسمي',
					),
				).toBeTruthy();
			},
		);


		test(
			'opens the selected official HTTPS source through the validated external-link boundary',
			async () => {
				await render(
					<ResourceHubResourceDetailScreen />,
				);

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Open official source: Flood safety guidance',
						},
					),
				);

				await waitFor(() => {
					expect(
						openResourceSourceUrlMock,
					).toHaveBeenCalledWith(
						'https://example.gov.sa/flood',
					);
				});
			},
		);


		test(
			'shows a clear safety message when the external-link boundary rejects a source URL',
			async () => {
				openResourceSourceUrlMock
					.mockResolvedValueOnce(
						'invalid-url',
					);

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Open official source: Flood safety guidance',
						},
					),
				);

				await waitFor(() => {
					expect(
						screen.getByText(
							'This source link could not be opened because its address is not considered safe.',
						),
					).toBeTruthy();
				});
			},
		);


		test(
			'shows a recoverable message when Android cannot open a valid source URL',
			async () => {
				openResourceSourceUrlMock
					.mockResolvedValueOnce(
						'open-failed',
					);

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Open official source: Flood safety guidance',
						},
					),
				);

				await waitFor(() => {
					expect(
						screen.getByText(
							'The source could not be opened on this device. Please try again later.',
						),
					).toBeTruthy();
				});
			},
		);


		test(
			'renders an explicit no-source state rather than inventing provenance',
			async () => {
				useLocalSearchParamsMock.mockReturnValue({
					resourceId: '102',
				});

				await render(
					<ResourceHubResourceDetailScreen />,
				);

				expect(
					screen.getByText(
						'No external source links are available for this resource.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Review date unavailable',
					),
				).toBeTruthy();
			},
		);


		test(
			'refreshes the complete Resource Hub only through the shared provider',
			async () => {
				await render(
					<ResourceHubResourceDetailScreen />,
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
					refreshMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);
	},
);