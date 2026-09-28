import assert from 'node:assert/strict';

import {
	createClient,
} from '@supabase/supabase-js';

/*
 * Hosted Supabase configuration is loaded from .env.local.
 *
 * Real test-account credentials are supplied only through temporary
 * PowerShell environment variables. They must never be hard-coded or
 * committed to the repository.
 */
const {
	EXPO_PUBLIC_SUPABASE_URL,
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	IHTIYAT_TEST_A_EMAIL,
	IHTIYAT_TEST_A_PASSWORD,
	IHTIYAT_TEST_B_EMAIL,
	IHTIYAT_TEST_B_PASSWORD,
} = process.env;


const requiredEnvironmentValues = {
	EXPO_PUBLIC_SUPABASE_URL,
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	IHTIYAT_TEST_A_EMAIL,
	IHTIYAT_TEST_A_PASSWORD,
	IHTIYAT_TEST_B_EMAIL,
	IHTIYAT_TEST_B_PASSWORD,
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
 * Each identity receives an isolated Supabase client.
 *
 * Only the public publishable key is used. No service-role key is involved,
 * so all profile operations remain subject to the deployed RLS policies and
 * authenticated-role column permissions.
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


const accountAClient =
	createTestClient();

const accountBClient =
	createTestClient();


const signIn = async (
	client,
	email,
	password,
	label,
) => {
	const {
		data,
		error,
	} = await client.auth
		.signInWithPassword({
			email,
			password,
		});

	assert.equal(
		error,
		null,
		`${label} should sign in successfully`,
	);

	assert.ok(
		data.user?.id,
		`${label} should have a user ID`,
	);

	return data.user.id;
};


/*
 * These are the Day-03 profile fields exercised by this integration test.
 *
 * display_name is deliberately excluded because its ownership behaviour is
 * already covered by profiles-rls.integration.mjs.
 */
const profilePreferenceColumns = [
	'active_location_id',
	'preferred_language_code',
	'text_size_preference',
	'children_count',
	'adults_count',
	'older_adults_count',
	'pets_count',
].join(', ');


const readProfilePreferences = async (
	client,
	userId,
) =>
	client
		.from('profiles')
		.select(
			profilePreferenceColumns,
		)
		.eq(
			'id',
			userId,
		)
		.maybeSingle();


/*
 * State used for cleanup.
 *
 * The integration test operates on real hosted test accounts, so Account A's
 * original preferences are captured before mutation and restored afterwards.
 */
let accountAId = null;

let accountAOriginalPreferences = null;


/*
 * Restore Account A even if an assertion fails after the temporary mutation.
 */
const restoreAccountA = async () => {
	if (
		!accountAId
		|| !accountAOriginalPreferences
	) {
		return;
	}

	const {
		error,
	} =
		await accountAClient
			.from('profiles')
			.update({
				active_location_id:
					accountAOriginalPreferences
						.active_location_id,

				preferred_language_code:
					accountAOriginalPreferences
						.preferred_language_code,

				text_size_preference:
					accountAOriginalPreferences
						.text_size_preference,

				children_count:
					accountAOriginalPreferences
						.children_count,

				adults_count:
					accountAOriginalPreferences
						.adults_count,

				older_adults_count:
					accountAOriginalPreferences
						.older_adults_count,

				pets_count:
					accountAOriginalPreferences
						.pets_count,
			})
			.eq(
				'id',
				accountAId,
			);

	assert.equal(
		error,
		null,
		'Account A original profile preferences should be restored',
	);
};


const run = async () => {
	/*
	 * Authenticate two independent real hosted test accounts.
	 */
	accountAId =
		await signIn(
			accountAClient,
			IHTIYAT_TEST_A_EMAIL,
			IHTIYAT_TEST_A_PASSWORD,
			'Account A',
		);

	const accountBId =
		await signIn(
			accountBClient,
			IHTIYAT_TEST_B_EMAIL,
			IHTIYAT_TEST_B_PASSWORD,
			'Account B',
		);

	assert.notEqual(
		accountAId,
		accountBId,
		'The integration test requires two different accounts',
	);


	/*
	 * Capture Account A's original state before changing anything.
	 *
	 * This allows the hosted integration test to be repeatable without
	 * permanently changing the test account's preferences.
	 */
	const {
		data: originalAccountA,
		error: originalAccountAError,
	} =
		await readProfilePreferences(
			accountAClient,
			accountAId,
		);

	assert.equal(
		originalAccountAError,
		null,
		'Account A should read its current profile preferences',
	);

	assert.ok(
		originalAccountA,
		'Account A should have a profile row',
	);

	accountAOriginalPreferences =
		originalAccountA;


	/*
	 * Capture Account B as well so that an attempted cross-account change can
	 * later be proven to have had no effect.
	 */
	const {
		data: originalAccountB,
		error: originalAccountBError,
	} =
		await readProfilePreferences(
			accountBClient,
			accountBId,
		);

	assert.equal(
		originalAccountBError,
		null,
		'Account B should read its current profile preferences',
	);

	assert.ok(
		originalAccountB,
		'Account B should have a profile row',
	);


	/*
	 * Resolve Jeddah through the deployed curated location catalogue.
	 *
	 * We use the official code rather than hard-coding the generated bigint
	 * identity because database-generated IDs are implementation details.
	 */
	const {
		data: jeddah,
		error: jeddahError,
	} =
		await accountAClient
			.from('locations')
			.select(
				'id, official_code',
			)
			.eq(
				'official_code',
				'0124',
			)
			.single();

	assert.equal(
		jeddahError,
		null,
		'Jeddah should be readable from the hosted location catalogue',
	);

	assert.equal(
		jeddah.official_code,
		'0124',
		'The resolved location should be Jeddah',
	);


	/*
	 * Positive profile update.
	 *
	 * The values deliberately exercise all new Day-03 profile preference
	 * fields through the real authenticated Data API.
	 */
	const expectedPreferences = {
		active_location_id:
			jeddah.id,

		preferred_language_code:
			'ar',

		text_size_preference:
			'large',

		children_count:
			1,

		adults_count:
			1,

		older_adults_count:
			0,

		pets_count:
			1,
	};


	const {
		data: accountAUpdate,
		error: accountAUpdateError,
	} =
		await accountAClient
			.from('profiles')
			.update(
				expectedPreferences,
			)
			.eq(
				'id',
				accountAId,
			)
			.select(
				profilePreferenceColumns,
			)
			.single();

	assert.equal(
		accountAUpdateError,
		null,
		'Account A should update its own profile preferences',
	);

	assert.deepEqual(
		accountAUpdate,
		expectedPreferences,
		'Account A should receive the saved profile preference values',
	);

	console.log(
		'PASS: Account A can update its own profile preferences',
	);


	/*
	 * Read the row again rather than relying only on UPDATE ... RETURNING.
	 *
	 * This verifies that the values actually persist in the hosted database.
	 */
	const {
		data: accountAStored,
		error: accountAStoredError,
	} =
		await readProfilePreferences(
			accountAClient,
			accountAId,
		);

	assert.equal(
		accountAStoredError,
		null,
		'Account A should read its updated profile preferences',
	);

	assert.deepEqual(
		accountAStored,
		expectedPreferences,
		'Hosted profile preferences should persist after update',
	);

	console.log(
		'PASS: Account A profile preferences persist in hosted Supabase',
	);


	/*
	 * Verify the corrective pet-count migration on the deployed project.
	 *
	 * Detailed boundary testing remains in pgTAP. This representative remote
	 * assertion confirms that the hosted database also contains the corrected
	 * 0-10 pet constraint.
	 */
	const {
		error: invalidPetCountError,
	} =
		await accountAClient
			.from('profiles')
			.update({
				pets_count: 11,
			})
			.eq(
				'id',
				accountAId,
			);

	assert.ok(
		invalidPetCountError,
		'The hosted database must reject pets_count = 11',
	);

	assert.equal(
		invalidPetCountError.code,
		'23514',
		'The invalid pet count should violate a CHECK constraint',
	);

	console.log(
		'PASS: Hosted pet-count constraint rejects values above 10',
	);


	/*
	 * Cross-account UPDATE.
	 *
	 * Account A supplies otherwise valid preference values for Account B.
	 * RLS should hide the foreign row from UPDATE and therefore return an
	 * empty result without mutating Account B.
	 */
	const {
		data: accountAUpdatesB,
		error: accountAUpdatesBError,
	} =
		await accountAClient
			.from('profiles')
			.update({
				active_location_id:
					jeddah.id,

				preferred_language_code:
					'ar',

				text_size_preference:
					'large',

				children_count:
					2,

				adults_count:
					2,

				older_adults_count:
					0,

				pets_count:
					2,
			})
			.eq(
				'id',
				accountBId,
			)
			.select(
				profilePreferenceColumns,
			);

	assert.equal(
		accountAUpdatesBError,
		null,
		'RLS-filtered foreign preference UPDATE should not raise an API error',
	);

	assert.deepEqual(
		accountAUpdatesB,
		[],
		'Account A must update zero Account B profile rows',
	);


	const {
		data: accountBAfterAttack,
		error: accountBAfterAttackError,
	} =
		await readProfilePreferences(
			accountBClient,
			accountBId,
		);

	assert.equal(
		accountBAfterAttackError,
		null,
		'Account B should still read its own profile preferences',
	);

	assert.deepEqual(
		accountBAfterAttack,
		originalAccountB,
		'Account B profile preferences must remain unchanged',
	);

	console.log(
		'PASS: Account A cannot update Account B profile preferences',
	);


	console.log(
		'PASS: Hosted profile-preferences integration test completed',
	);
};


/*
 * Preserve any test failure while still attempting both data restoration and
 * local-session cleanup.
 */
let testError = null;

try {
	await run();
} catch (error) {
	testError =
		error;
} finally {
	try {
		await restoreAccountA();
	} catch (error) {
		if (!testError) {
			testError =
				error;
		} else {
			console.error(
				'ERROR: Account A cleanup also failed:',
				error,
			);
		}
	}

	await Promise.allSettled([
		accountAClient.auth.signOut({
			scope: 'local',
		}),
		accountBClient.auth.signOut({
			scope: 'local',
		}),
	]);
}


if (testError) {
	throw testError;
}