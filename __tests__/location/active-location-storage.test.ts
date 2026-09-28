/// <reference types="jest" />

import Storage from 'expo-sqlite/kv-store';

import {
	clearLocalActiveLocation,
	loadLocalActiveLocation,
	saveLocalActiveLocation,
} from '../../src/location/active-location-storage';

import type {
	LocationRecord,
} from '../../src/profile/profile-types';


/**
 * WHAT:
 * Replaces Expo SQLite key-value storage with deterministic Jest functions.
 *
 * WHY:
 * These unit tests verify Ihtiyat's persistence logic rather than Expo's
 * native SQLite implementation. Loading the native module directly inside
 * Jest would also require an Android/iOS runtime.
 *
 * HOW:
 * getItem, setItem and removeItem are replaced with Jest mocks whose behaviour
 * each test can configure independently.
 */
jest.mock(
	'expo-sqlite/kv-store',
	() => ({
		__esModule: true,

		default: {
			getItem: jest.fn(),
			setItem: jest.fn(),
			removeItem: jest.fn(),
		},
	}),
);


const getItemMock =
	Storage.getItem as jest.MockedFunction<
		typeof Storage.getItem
	>;

const setItemMock =
	Storage.setItem as jest.MockedFunction<
		typeof Storage.setItem
	>;

const removeItemMock =
	Storage.removeItem as jest.MockedFunction<
		typeof Storage.removeItem
	>;

const guestScope = {
    type: 'guest',
} as const;

const authenticatedScope = {
    type: 'authenticated',
    userId: '11111111-1111-1111-1111-111111111111'
} as const;

const GUEST_STORAGE_KEY = 'ihtiyat.active-location.guest'


const jeddahLocation: LocationRecord = {
	id: 14,
	parent_id: 2,
	official_code: '0124',
	location_type: 'governorate',
	name_en: 'Jeddah',
	name_ar: 'جدة',
	is_active: true,
};


describe(
	'active-location-storage',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();

			setItemMock
				.mockResolvedValue();

			removeItemMock
				.mockResolvedValue();
		});


		test(
			'saves the complete curated location locally',
			async () => {
				await saveLocalActiveLocation(
					jeddahLocation,
                    guestScope
				);

				expect(
					setItemMock,
				).toHaveBeenCalledWith(
					GUEST_STORAGE_KEY,
					JSON.stringify(
						jeddahLocation,
					),
				);
			},
		);


		test(
			'restores a valid saved location',
			async () => {
				getItemMock
					.mockResolvedValue(
						JSON.stringify(
							jeddahLocation,
						),
					);

				const result =
					await loadLocalActiveLocation( guestScope);

				expect(result).toEqual(
					jeddahLocation,
				);

				expect(
					removeItemMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'returns null when no local location exists',
			async () => {
				getItemMock
					.mockResolvedValue(
						null,
					);

				const result =
					await loadLocalActiveLocation( guestScope);

				expect(result).toBeNull();

				expect(
					removeItemMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'removes malformed JSON instead of exposing it as a location',
			async () => {
				getItemMock
					.mockResolvedValue(
						'{invalid-json',
					);

				const result =
					await loadLocalActiveLocation( guestScope);

				expect(result).toBeNull();

				expect(
					removeItemMock,
				).toHaveBeenCalledWith(
					GUEST_STORAGE_KEY,
				);
			},
		);


		test(
			'removes a stored object that is missing required location fields',
			async () => {
				getItemMock
					.mockResolvedValue(
						JSON.stringify({
							id: 14,
							name_en: 'Jeddah',
						}),
					);

				const result =
					await loadLocalActiveLocation( guestScope);

				expect(result).toBeNull();

				expect(
					removeItemMock,
				).toHaveBeenCalledWith(
					GUEST_STORAGE_KEY,
				);
			},
		);


		test(
			'preserves the stable official location code when restoring data',
			async () => {
				getItemMock
					.mockResolvedValue(
						JSON.stringify(
							jeddahLocation,
						),
					);

				const result =
					await loadLocalActiveLocation( guestScope);

				expect(
					result?.official_code,
				).toBe(
					'0124',
				);
			},
		);


		test(
			'clears only the persisted active-location entry',
			async () => {
				await clearLocalActiveLocation( guestScope);

				expect(
					removeItemMock,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					removeItemMock,
				).toHaveBeenCalledWith(
					GUEST_STORAGE_KEY,
				);
			},
		);

        test(
            'keeps authenticated location storage separate from guest storage',
            async () => {
                await saveLocalActiveLocation(
                    jeddahLocation,
                    authenticatedScope,
                );

                expect(
                    setItemMock,
                ).toHaveBeenCalledWith(
                    'ihtiyat.active-location.user.11111111-1111-1111-1111-111111111111',
                    JSON.stringify(
                        jeddahLocation,
                    ),
                );

                expect(
                    setItemMock,
                ).not.toHaveBeenCalledWith(
                    'ihtiyat.active-location.guest',
                    expect.anything(),
                );
            },
        );
	},
);