import assert from 'node:assert/strict';

import {
	createClient,
} from '@supabase/supabase-js';


const {
	EXPO_PUBLIC_SUPABASE_URL,
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	IHTIYAT_TEST_A_EMAIL,
	IHTIYAT_TEST_A_PASSWORD,
} = process.env;


const requiredEnvironmentValues = {
	EXPO_PUBLIC_SUPABASE_URL,
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	IHTIYAT_TEST_A_EMAIL,
	IHTIYAT_TEST_A_PASSWORD,
};


for (
	const [
		name,
		value,
	] of Object.entries(
		requiredEnvironmentValues,
	)
) {
	assert.ok(
		value,
		`Missing required environment value: ${name}`,
	);
}


/*
 * Both clients use only Ihtiyat's public publishable key.
 *
 * The anonymous client proves that onboarding/reference information can be
 * read before sign-in. The authenticated client proves that signed-in users
 * receive the same catalogue without gaining management privileges.
 */
const createTestClient = () =>
	createClient(
		EXPO_PUBLIC_SUPABASE_URL,
		EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
				detectSessionInUrl: false,
			},
		},
	);


const anonymousClient =
	createTestClient();

const authenticatedClient =
	createTestClient();


const signIn = async () => {
	const {
		data,
		error,
	} =
		await authenticatedClient.auth
			.signInWithPassword({
				email:
					IHTIYAT_TEST_A_EMAIL,

				password:
					IHTIYAT_TEST_A_PASSWORD,
			});

	assert.equal(
		error,
		null,
		'Account A should sign in successfully',
	);

	assert.ok(
		data.user?.id,
		'Account A should have a user ID',
	);
};


/*
 * Verify that a failed catalogue write is genuinely an authorisation failure
 * rather than a validation or uniqueness failure.
 */
const assertPermissionDenied = (
	error,
	message,
) => {
	assert.ok(
		error,
		message,
	);

	assert.equal(
		error.code,
		'42501',
		`${message}: expected PostgreSQL permission-denied code 42501`,
	);
};


const run = async () => {
	await signIn();


	/* ======================================================================
	 * Supported languages: guest read
	 * ====================================================================== */

	const {
		data: anonymousLanguages,
		error: anonymousLanguagesError,
	} =
		await anonymousClient
			.from('supported_languages')
			.select(
				'code, name_en, native_name, layout_direction, is_active',
			)
			.in(
				'code',
				[
					'en',
					'ar',
				],
			)
			.order(
				'code',
			);

	assert.equal(
		anonymousLanguagesError,
		null,
		'Anonymous users should read supported-language configuration',
	);

	assert.equal(
		anonymousLanguages.length,
		2,
		'English and Arabic should both exist in the hosted catalogue',
	);

	const anonymousLanguageMap =
		new Map(
			anonymousLanguages.map(
				(language) => [
					language.code,
					language,
				],
			),
		);

	assert.deepEqual(
		anonymousLanguageMap.get('en'),
		{
			code: 'en',
			name_en: 'English',
			native_name: 'English',
			layout_direction: 'ltr',
			is_active: true,
		},
		'Hosted English configuration should match the expected catalogue entry',
	);

	assert.deepEqual(
		anonymousLanguageMap.get('ar'),
		{
			code: 'ar',
			name_en: 'Arabic',
			native_name: 'العربية',
			layout_direction: 'rtl',
			is_active: true,
		},
		'Hosted Arabic configuration should match the expected catalogue entry',
	);

	console.log(
		'PASS: Anonymous users can read the hosted language catalogue',
	);


	/* ======================================================================
	 * Supported languages: authenticated read
	 * ====================================================================== */

	const {
		data: authenticatedLanguages,
		error: authenticatedLanguagesError,
	} =
		await authenticatedClient
			.from('supported_languages')
			.select('code')
			.in(
				'code',
				[
					'en',
					'ar',
				],
			);

	assert.equal(
		authenticatedLanguagesError,
		null,
		'Authenticated users should read supported-language configuration',
	);

	assert.equal(
		authenticatedLanguages.length,
		2,
		'Authenticated users should receive English and Arabic catalogue rows',
	);

	console.log(
		'PASS: Authenticated users can read the hosted language catalogue',
	);


	/* ======================================================================
	 * Saudi location catalogue: guest read
	 * ====================================================================== */

	const {
		count: regionCount,
		error: regionCountError,
	} =
		await anonymousClient
			.from('locations')
			.select(
				'id',
				{
					count: 'exact',
					head: true,
				},
			)
			.eq(
				'location_type',
				'region',
			);

	assert.equal(
		regionCountError,
		null,
		'Anonymous users should read Saudi region configuration',
	);

	assert.equal(
		regionCount,
		13,
		'Hosted catalogue should contain all 13 Saudi administrative regions',
	);


	const {
		data: makkah,
		error: makkahError,
	} =
		await anonymousClient
			.from('locations')
			.select(
				'id, official_code, name_en, location_type',
			)
			.eq(
				'official_code',
				'0002',
			)
			.single();

	assert.equal(
		makkahError,
		null,
		'Makkah Region should exist in the hosted catalogue',
	);

	assert.equal(
		makkah.location_type,
		'region',
		'Official code 0002 should represent a region',
	);


	const {
		data: jeddah,
		error: jeddahError,
	} =
		await anonymousClient
			.from('locations')
			.select(
				'id, parent_id, official_code, name_en, name_ar, location_type',
			)
			.eq(
				'official_code',
				'0124',
			)
			.single();

	assert.equal(
		jeddahError,
		null,
		'Jeddah should exist in the hosted catalogue',
	);

	assert.equal(
		jeddah.name_en,
		'Jeddah',
		'Official code 0124 should resolve to Jeddah',
	);

	assert.equal(
		jeddah.location_type,
		'governorate',
		'Jeddah should be stored as a governorate',
	);

	assert.equal(
		jeddah.parent_id,
		makkah.id,
		'Jeddah should be linked to Makkah Region',
	);

	console.log(
		'PASS: Anonymous users can resolve the hosted Saudi location hierarchy',
	);


	/* ======================================================================
	 * Saudi location catalogue: authenticated read
	 * ====================================================================== */

	const {
		data: authenticatedJeddah,
		error: authenticatedJeddahError,
	} =
		await authenticatedClient
			.from('locations')
			.select(
				'official_code, name_en',
			)
			.eq(
				'official_code',
				'0124',
			)
			.single();

	assert.equal(
		authenticatedJeddahError,
		null,
		'Authenticated users should read Saudi location configuration',
	);

	assert.equal(
		authenticatedJeddah.official_code,
		'0124',
		'Authenticated users should resolve Jeddah',
	);

	console.log(
		'PASS: Authenticated users can read the hosted Saudi location catalogue',
	);


	/* ======================================================================
	 * Client write protection
	 * ====================================================================== */

	/*
	 * Update an existing row to its current value.
	 *
	 * If write access were accidentally granted, this would not semantically
	 * alter the catalogue. Correct permissions should reject it entirely.
	 */
	const {
		error: anonymousLanguageUpdateError,
	} =
		await anonymousClient
			.from('supported_languages')
			.update({
				name_en: 'English',
			})
			.eq(
				'code',
				'en',
			);

	assertPermissionDenied(
		anonymousLanguageUpdateError,
		'Anonymous users must not update supported languages',
	);


	const {
		error: authenticatedLanguageUpdateError,
	} =
		await authenticatedClient
			.from('supported_languages')
			.update({
				name_en: 'English',
			})
			.eq(
				'code',
				'en',
			);

	assertPermissionDenied(
		authenticatedLanguageUpdateError,
		'Authenticated users must not update supported languages',
	);


	const {
		error: anonymousLocationUpdateError,
	} =
		await anonymousClient
			.from('locations')
			.update({
				name_en: 'Riyadh Region',
			})
			.eq(
				'official_code',
				'0001',
			);

	assertPermissionDenied(
		anonymousLocationUpdateError,
		'Anonymous users must not update curated locations',
	);


	const {
		error: authenticatedLocationUpdateError,
	} =
		await authenticatedClient
			.from('locations')
			.update({
				name_en: 'Riyadh Region',
			})
			.eq(
				'official_code',
				'0001',
			);

	assertPermissionDenied(
		authenticatedLocationUpdateError,
		'Authenticated users must not update curated locations',
	);

	console.log(
		'PASS: Hosted reference catalogue remains read-only to client roles',
	);


	console.log(
		'PASS: Hosted reference-data catalogue integration test completed',
	);
};


try {
	await run();
} finally {
	await Promise.allSettled([
		authenticatedClient.auth.signOut({
			scope: 'local',
		}),
	]);
}