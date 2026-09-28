/// <reference types="jest" />

import {
	loadActiveLocations,
	loadProfilePreferences,
	loadSupportedLanguages,
	updateProfilePreferences,
} from '../../src/profile/profile-service';

import { supabaseClient } from '../../src/lib/supabase-config';

import type {
	ProfilePreferencesUpdate,
} from '../../src/profile/profile-types';


jest.mock(
	'../../src/lib/supabase-config',
	() => ({
		supabaseClient: {
			from: jest.fn(),
		},
	}),
);


const fromMock =
	supabaseClient.from as unknown as jest.Mock;


/**
 * Representative saved profile returned by Supabase.
 */
const profileFixture = {
	id: '11111111-1111-1111-1111-111111111111',
	active_location_id: 14,
	preferred_language_code: 'ar',
	text_size_preference: 'large',
	children_count: 2,
	adults_count: 2,
	older_adults_count: 1,
	pets_count: 1,
};


/**
 * Representative curated location records.
 */
const locationsFixture = [
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


/**
 * Representative supported-language catalogue.
 */
const languagesFixture = [
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


describe(
	'profile-service',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();
		});


		test(
			'loads the requested user profile preferences',
			async () => {
				const singleMock =
					jest.fn()
						.mockResolvedValue({
							data: profileFixture,
							error: null,
						});

				const eqMock =
					jest.fn()
						.mockReturnValue({
							single: singleMock,
						});

				const selectMock =
					jest.fn()
						.mockReturnValue({
							eq: eqMock,
						});

				fromMock.mockReturnValue({
					select: selectMock,
				});

				const result =
					await loadProfilePreferences(
						profileFixture.id,
					);

				expect(
					fromMock,
				).toHaveBeenCalledWith(
					'profiles',
				);

				expect(
					selectMock,
				).toHaveBeenCalledWith(
					expect.stringContaining(
						'active_location_id',
					),
				);

				expect(
					eqMock,
				).toHaveBeenCalledWith(
					'id',
					profileFixture.id,
				);

				expect(
					singleMock,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					result,
				).toEqual(
					profileFixture,
				);
			},
		);


		test(
			'propagates an error when profile loading fails',
			async () => {
				const profileError = {
					code: 'TEST_PROFILE_READ',
					message:
						'Unable to load profile',
				};

				const singleMock =
					jest.fn()
						.mockResolvedValue({
							data: null,
							error: profileError,
						});

				const eqMock =
					jest.fn()
						.mockReturnValue({
							single: singleMock,
						});

				const selectMock =
					jest.fn()
						.mockReturnValue({
							eq: eqMock,
						});

				fromMock.mockReturnValue({
					select: selectMock,
				});

				await expect(
					loadProfilePreferences(
						profileFixture.id,
					),
				).rejects.toBe(
					profileError,
				);
			},
		);


		test(
			'updates only the supplied preferences for the requested user and returns the saved profile',
			async () => {
				const updates:
					ProfilePreferencesUpdate = {
						active_location_id: 14,
						preferred_language_code:
							'ar',
						text_size_preference:
							'large',
						children_count: 2,
						adults_count: 2,
						older_adults_count: 1,
						pets_count: 1,
					};

				const singleMock =
					jest.fn()
						.mockResolvedValue({
							data: profileFixture,
							error: null,
						});

				const selectAfterUpdateMock =
					jest.fn()
						.mockReturnValue({
							single: singleMock,
						});

				const eqMock =
					jest.fn()
						.mockReturnValue({
							select:
								selectAfterUpdateMock,
						});

				const updateMock =
					jest.fn()
						.mockReturnValue({
							eq: eqMock,
						});

				fromMock.mockReturnValue({
					update: updateMock,
				});

				const result =
					await updateProfilePreferences(
						profileFixture.id,
						updates,
					);

				expect(
					fromMock,
				).toHaveBeenCalledWith(
					'profiles',
				);

				expect(
					updateMock,
				).toHaveBeenCalledWith(
					updates,
				);

				expect(
					eqMock,
				).toHaveBeenCalledWith(
					'id',
					profileFixture.id,
				);

				expect(
					selectAfterUpdateMock,
				).toHaveBeenCalledWith(
					expect.stringContaining(
						'preferred_language_code',
					),
				);

				expect(
					result,
				).toEqual(
					profileFixture,
				);
			},
		);


		test(
			'propagates an error when profile updating fails',
			async () => {
				const updateError = {
					code: 'TEST_PROFILE_UPDATE',
					message:
						'Unable to update profile',
				};

				const singleMock =
					jest.fn()
						.mockResolvedValue({
							data: null,
							error: updateError,
						});

				const selectAfterUpdateMock =
					jest.fn()
						.mockReturnValue({
							single: singleMock,
						});

				const eqMock =
					jest.fn()
						.mockReturnValue({
							select:
								selectAfterUpdateMock,
						});

				const updateMock =
					jest.fn()
						.mockReturnValue({
							eq: eqMock,
						});

				fromMock.mockReturnValue({
					update: updateMock,
				});

				await expect(
					updateProfilePreferences(
						profileFixture.id,
						{
							text_size_preference:
								'large',
						},
					),
				).rejects.toBe(
					updateError,
				);
			},
		);


		test(
			'loads only active curated locations in official-code order',
			async () => {
				const orderMock =
					jest.fn()
						.mockResolvedValue({
							data: locationsFixture,
							error: null,
						});

				const eqMock =
					jest.fn()
						.mockReturnValue({
							order: orderMock,
						});

				const selectMock =
					jest.fn()
						.mockReturnValue({
							eq: eqMock,
						});

				fromMock.mockReturnValue({
					select: selectMock,
				});

				const result =
					await loadActiveLocations();

				expect(
					fromMock,
				).toHaveBeenCalledWith(
					'locations',
				);

				expect(
					selectMock,
				).toHaveBeenCalledWith(
					expect.stringContaining(
						'official_code',
					),
				);

				expect(
					eqMock,
				).toHaveBeenCalledWith(
					'is_active',
					true,
				);

				expect(
					orderMock,
				).toHaveBeenCalledWith(
					'official_code',
					{
						ascending: true,
					},
				);

				expect(
					result,
				).toEqual(
					locationsFixture,
				);
			},
		);


		test(
			'propagates an error when the location catalogue cannot be loaded',
			async () => {
				const locationError = {
					code: 'TEST_LOCATION_READ',
					message:
						'Unable to load locations',
				};

				const orderMock =
					jest.fn()
						.mockResolvedValue({
							data: null,
							error: locationError,
						});

				const eqMock =
					jest.fn()
						.mockReturnValue({
							order: orderMock,
						});

				const selectMock =
					jest.fn()
						.mockReturnValue({
							eq: eqMock,
						});

				fromMock.mockReturnValue({
					select: selectMock,
				});

				await expect(
					loadActiveLocations(),
				).rejects.toBe(
					locationError,
				);
			},
		);


		test(
			'loads only active supported languages in code order',
			async () => {
				const orderMock =
					jest.fn()
						.mockResolvedValue({
							data: languagesFixture,
							error: null,
						});

				const eqMock =
					jest.fn()
						.mockReturnValue({
							order: orderMock,
						});

				const selectMock =
					jest.fn()
						.mockReturnValue({
							eq: eqMock,
						});

				fromMock.mockReturnValue({
					select: selectMock,
				});

				const result =
					await loadSupportedLanguages();

				expect(
					fromMock,
				).toHaveBeenCalledWith(
					'supported_languages',
				);

				expect(
					selectMock,
				).toHaveBeenCalledWith(
					expect.stringContaining(
						'layout_direction',
					),
				);

				expect(
					eqMock,
				).toHaveBeenCalledWith(
					'is_active',
					true,
				);

				expect(
					orderMock,
				).toHaveBeenCalledWith(
					'code',
					{
						ascending: true,
					},
				);

				expect(
					result,
				).toEqual(
					languagesFixture,
				);
			},
		);


		test(
			'propagates an error when the supported-language catalogue cannot be loaded',
			async () => {
				const languageError = {
					code: 'TEST_LANGUAGE_READ',
					message:
						'Unable to load languages',
				};

				const orderMock =
					jest.fn()
						.mockResolvedValue({
							data: null,
							error: languageError,
						});

				const eqMock =
					jest.fn()
						.mockReturnValue({
							order: orderMock,
						});

				const selectMock =
					jest.fn()
						.mockReturnValue({
							eq: eqMock,
						});

				fromMock.mockReturnValue({
					select: selectMock,
				});

				await expect(
					loadSupportedLanguages(),
				).rejects.toBe(
					languageError,
				);
			},
		);
	},
);