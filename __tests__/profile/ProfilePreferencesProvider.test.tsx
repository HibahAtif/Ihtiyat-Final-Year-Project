/// <reference types="jest" />

import {
	act,
	render,
	screen,
	waitFor,
} from '@testing-library/react-native';

import {
	Text,
	View,
} from 'react-native';

import {
	useAuth,
} from '../../src/auth/AuthenticationProvider';

import {
	ProfilePreferencesProvider,
	useProfilePreferences,
} from '../../src/profile/ProfilePreferencesProvider';

import {
	loadActiveLocations,
	loadProfilePreferences,
	loadSupportedLanguages,
	updateProfilePreferences,
} from '../../src/profile/profile-service';

import type {
	LocationRecord,
	ProfilePreferences,
	ProfilePreferencesUpdate,
	SupportedLanguageRecord,
} from '../../src/profile/profile-types';


jest.mock(
	'../../src/auth/AuthenticationProvider',
	() => ({
		useAuth: jest.fn(),
	}),
);


jest.mock(
	'../../src/profile/profile-service',
	() => ({
		loadProfilePreferences:
			jest.fn(),

		loadActiveLocations:
			jest.fn(),

		loadSupportedLanguages:
			jest.fn(),

		updateProfilePreferences:
			jest.fn(),
	}),
);


const useAuthMock =
	useAuth as jest.MockedFunction<
		typeof useAuth
	>;


const loadProfilePreferencesMock =
	loadProfilePreferences as jest.MockedFunction<
		typeof loadProfilePreferences
	>;


const loadActiveLocationsMock =
	loadActiveLocations as jest.MockedFunction<
		typeof loadActiveLocations
	>;


const loadSupportedLanguagesMock =
	loadSupportedLanguages as jest.MockedFunction<
		typeof loadSupportedLanguages
	>;


const updateProfilePreferencesMock =
	updateProfilePreferences as jest.MockedFunction<
		typeof updateProfilePreferences
	>;


const ACCOUNT_A_ID =
	'11111111-1111-1111-1111-111111111111';

const ACCOUNT_B_ID =
	'22222222-2222-2222-2222-222222222222';


const accountAProfile:
	ProfilePreferences = {
		id: ACCOUNT_A_ID,
		active_location_id: 14,
		preferred_language_code: 'ar',
		text_size_preference: 'system',
		children_count: 2,
		adults_count: 2,
		older_adults_count: 0,
		pets_count: 1,
	};


const accountBProfile:
	ProfilePreferences = {
		id: ACCOUNT_B_ID,
		active_location_id: 2,
		preferred_language_code: 'en',
		text_size_preference: 'large',
		children_count: 0,
		adults_count: 1,
		older_adults_count: 1,
		pets_count: 0,
	};


const locationsFixture:
	LocationRecord[] = [
		{
			id: 2,
			parent_id: null,
			official_code: '0002',
			location_type: 'region',
			name_en: 'Makkah Region',
			name_ar: 'منطقة مكة المكرمة',
			is_active: true,
		},
		{
			id: 14,
			parent_id: 2,
			official_code: '0124',
			location_type: 'governorate',
			name_en: 'Jeddah',
			name_ar: 'جدة',
			is_active: true,
		},
	];


const languagesFixture:
	SupportedLanguageRecord[] = [
		{
			code: 'ar',
			name_en: 'Arabic',
			native_name: 'العربية',
			layout_direction: 'rtl',
			is_active: true,
		},
		{
			code: 'en',
			name_en: 'English',
			native_name: 'English',
			layout_direction: 'ltr',
			is_active: true,
		},
	];


type ProfileContextValue =
	ReturnType<
		typeof useProfilePreferences
	>;


let latestProfileContext:
	ProfileContextValue | null = null;


let currentUserId:
	string | null = null;


/**
 * Minimal authentication context fixture.
 *
 * ProfilePreferencesProvider consumes only the current user ID, so this test
 * does not need to reproduce Supabase session behaviour already covered by
 * AuthenticationProvider.test.tsx.
 */
const configureAuthUser = (
	userId: string | null,
): void => {
	currentUserId =
		userId;

	useAuthMock.mockImplementation(
		() =>
			({
				session: null,

				user: currentUserId
					? {
							id:
								currentUserId,
						}
					: null,

				isAuthenticated:
					currentUserId !== null,

				isLoading: false,
			}) as ReturnType<
				typeof useAuth
			>,
	);
};


/**
 * Allows tests to control when an asynchronous service request completes.
 */
const createDeferred =
	<T,>() => {
		let resolvePromise:
			| ((value: T) => void)
			| undefined;

		const promise =
			new Promise<T>(
				(resolve) => {
					resolvePromise =
						resolve;
				},
			);

		return {
			promise,

			resolve: (
				value: T,
			): void => {
				if (!resolvePromise) {
					throw new Error(
						'Deferred resolver is unavailable.',
					);
				}

				resolvePromise(
					value,
				);
			},
		};
	};


/**
 * Small consumer that exposes provider state without introducing a real
 * application screen into these state-management tests.
 */
function ProfilePreferencesProbe() {
	const context =
		useProfilePreferences();

	latestProfileContext =
		context;

	return (
		<View>
			<Text testID="profile-status">
				{context.status}
			</Text>

			<Text testID="profile-loading">
				{String(
					context.isLoading,
				)}
			</Text>

			<Text testID="profile-id">
				{context.profile?.id
					?? 'none'}
			</Text>

			<Text testID="location-count">
				{String(
					context.locations.length,
				)}
			</Text>

			<Text testID="language-count">
				{String(
					context.supportedLanguages.length,
				)}
			</Text>
		</View>
	);
}


const renderProvider =
	async () =>
		render(
			<ProfilePreferencesProvider>
				<ProfilePreferencesProbe />
			</ProfilePreferencesProvider>,
		);


describe(
	'ProfilePreferencesProvider',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();

			latestProfileContext =
				null;

			configureAuthUser(
				null,
			);

			loadActiveLocationsMock
				.mockResolvedValue(
					locationsFixture,
				);

			loadSupportedLanguagesMock
				.mockResolvedValue(
					languagesFixture,
				);
		});


		test(
			'remains idle and empty for a guest',
			async () => {
				await renderProvider();

				expect(
					screen.getByTestId(
						'profile-status',
					).props.children,
				).toBe(
					'idle',
				);

				expect(
					screen.getByTestId(
						'profile-id',
					).props.children,
				).toBe(
					'none',
				);

				expect(
					screen.getByTestId(
						'location-count',
					).props.children,
				).toBe(
					'0',
				);

				expect(
					screen.getByTestId(
						'language-count',
					).props.children,
				).toBe(
					'0',
				);

				expect(
					loadProfilePreferencesMock,
				).not.toHaveBeenCalled();

				expect(
					loadActiveLocationsMock,
				).not.toHaveBeenCalled();

				expect(
					loadSupportedLanguagesMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'loads profile preferences and reference catalogues for the authenticated account',
			async () => {
				configureAuthUser(
					ACCOUNT_A_ID,
				);

				loadProfilePreferencesMock
					.mockResolvedValue(
						accountAProfile,
					);

				await renderProvider();

				await waitFor(() => {
					expect(
						screen.getByTestId(
							'profile-status',
						).props.children,
					).toBe(
						'ready',
					);
				});

				expect(
					loadProfilePreferencesMock,
				).toHaveBeenCalledWith(
					ACCOUNT_A_ID,
				);

				expect(
					loadActiveLocationsMock,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					loadSupportedLanguagesMock,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					screen.getByTestId(
						'profile-id',
					).props.children,
				).toBe(
					ACCOUNT_A_ID,
				);

				expect(
					screen.getByTestId(
						'location-count',
					).props.children,
				).toBe(
					'2',
				);

				expect(
					screen.getByTestId(
						'language-count',
					).props.children,
				).toBe(
					'2',
				);
			},
		);


		test(
			'exposes an error state when authenticated profile loading fails',
			async () => {
				configureAuthUser(
					ACCOUNT_A_ID,
				);

				loadProfilePreferencesMock
					.mockRejectedValue(
						new Error(
							'Profile load failed',
						),
					);

				await renderProvider();

				await waitFor(() => {
					expect(
						screen.getByTestId(
							'profile-status',
						).props.children,
					).toBe(
						'error',
					);
				});

				expect(
					screen.getByTestId(
						'profile-id',
					).props.children,
				).toBe(
					'none',
				);

				expect(
					screen.getByTestId(
						'location-count',
					).props.children,
				).toBe(
					'0',
				);

				expect(
					screen.getByTestId(
						'language-count',
					).props.children,
				).toBe(
					'0',
				);
			},
		);


		test(
			'saves preferences for the authenticated account and replaces local state with the canonical saved profile',
			async () => {
				configureAuthUser(
					ACCOUNT_A_ID,
				);

				loadProfilePreferencesMock
					.mockResolvedValue(
						accountAProfile,
					);

				const savedProfile:
					ProfilePreferences = {
						...accountAProfile,

						text_size_preference:
							'large',

						pets_count:
							2,
					};

				updateProfilePreferencesMock
					.mockResolvedValue(
						savedProfile,
					);

				await renderProvider();

				await waitFor(() => {
					expect(
						screen.getByTestId(
							'profile-status',
						).props.children,
					).toBe(
						'ready',
					);
				});

				const updates:
					ProfilePreferencesUpdate = {
						text_size_preference:
							'large',

						pets_count:
							2,
					};

				await act(async () => {
					await latestProfileContext
						?.savePreferences(
							updates,
						);
				});

				expect(
					updateProfilePreferencesMock,
				).toHaveBeenCalledWith(
					ACCOUNT_A_ID,
					updates,
				);

				expect(
					latestProfileContext
						?.profile,
				).toEqual(
					savedProfile,
				);
			},
		);


		test(
			'clears private profile state when the user signs out',
			async () => {
				configureAuthUser(
					ACCOUNT_A_ID,
				);

				loadProfilePreferencesMock
					.mockResolvedValue(
						accountAProfile,
					);

				const {
					rerender,
				} =
					await renderProvider();

				await waitFor(() => {
					expect(
						screen.getByTestId(
							'profile-id',
						).props.children,
					).toBe(
						ACCOUNT_A_ID,
					);
				});

				configureAuthUser(
					null,
				);

				await rerender(
					<ProfilePreferencesProvider>
						<ProfilePreferencesProbe />
					</ProfilePreferencesProvider>,
				);

				await waitFor(() => {
					expect(
						screen.getByTestId(
							'profile-status',
						).props.children,
					).toBe(
						'idle',
					);
				});

				expect(
					screen.getByTestId(
						'profile-id',
					).props.children,
				).toBe(
					'none',
				);

				expect(
					screen.getByTestId(
						'location-count',
					).props.children,
				).toBe(
					'0',
				);

				expect(
					screen.getByTestId(
						'language-count',
					).props.children,
				).toBe(
					'0',
				);
			},
		);


		test(
			'ignores stale profile data when the authenticated account changes during loading',
			async () => {
				const deferredAccountA =
					createDeferred<
						ProfilePreferences
					>();

				configureAuthUser(
					ACCOUNT_A_ID,
				);

				loadProfilePreferencesMock
					.mockImplementation(
						(userId) => {
							if (
								userId
								=== ACCOUNT_A_ID
							) {
								return deferredAccountA
									.promise;
							}

							return Promise.resolve(
								accountBProfile,
							);
						},
					);

				const {
					rerender,
				} =
					await renderProvider();

				await waitFor(() => {
					expect(
						loadProfilePreferencesMock,
					).toHaveBeenCalledWith(
						ACCOUNT_A_ID,
					);
				});

				/*
				 * Account A's profile request is still unresolved. Switch to
				 * Account B and let B's request complete first.
				 */
				configureAuthUser(
					ACCOUNT_B_ID,
				);

				await rerender(
					<ProfilePreferencesProvider>
						<ProfilePreferencesProbe />
					</ProfilePreferencesProvider>,
				);

				await waitFor(() => {
					expect(
						screen.getByTestId(
							'profile-id',
						).props.children,
					).toBe(
						ACCOUNT_B_ID,
					);
				});

				expect(
					loadProfilePreferencesMock,
				).toHaveBeenCalledWith(
					ACCOUNT_B_ID,
				);

				/*
				 * The old Account A request now finishes late.
				 *
				 * Its result must be discarded rather than replacing Account
				 * B's current in-memory profile.
				 */
				await act(async () => {
					deferredAccountA.resolve(
						accountAProfile,
					);

					await deferredAccountA.promise;

					await Promise.resolve();
				});

				expect(
					screen.getByTestId(
						'profile-id',
					).props.children,
				).toBe(
					ACCOUNT_B_ID,
				);

				expect(
					latestProfileContext
						?.profile?.id,
				).toBe(
					ACCOUNT_B_ID,
				);
			},
		);
	},
);