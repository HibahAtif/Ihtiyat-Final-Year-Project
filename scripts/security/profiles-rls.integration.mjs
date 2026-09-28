import assert from 'node:assert/strict';

import {
	createClient,
} from '@supabase/supabase-js';

/*
 * Hosted Supabase configuration is loaded from .env.local.
 *
 * Test-account credentials are supplied only through temporary
 * environment variables in the terminal. They must never be
 * hard-coded into this file or committed to Git.
 */
const {
	EXPO_PUBLIC_SUPABASE_URL,
	EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	IHTIYAT_TEST_A_EMAIL,
	IHTIYAT_TEST_A_PASSWORD,
	IHTIYAT_TEST_B_EMAIL,
	IHTIYAT_TEST_B_PASSWORD,
} = process.env;

/*
 * Fail immediately if any value required by the integration test
 * is missing. This prevents a misleading test result caused by
 * accidentally running against an incomplete configuration.
 */
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
 * Create an isolated Supabase client for each test identity.
 *
 * Session persistence and token refresh are disabled because this
 * script is a short-lived integration test rather than the mobile app.
 * Only the public publishable key is used so that Row Level Security
 * remains active throughout the test.
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

/*
 * Account A and Account B represent two independent authenticated users.
 * The anonymous client remains unauthenticated so that guest access to
 * the private profiles table can also be tested.
 */
const accountAClient =
	createTestClient();

const accountBClient =
	createTestClient();

const anonymousClient =
	createTestClient();

/*
 * Authenticate one test account and return its Supabase user ID.
 *
 * The returned ID is later used to prove that RLS exposes only the
 * profile row belonging to the currently authenticated user.
 */
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
 * Read one profile by ID through the normal Supabase Data API.
 *
 * maybeSingle() is useful for the RLS tests because a foreign profile
 * that has been correctly hidden by RLS should appear as no accessible
 * row rather than being returned to the requesting account.
 */
const readProfile = async (
	client,
	id,
) =>
	client
		.from('profiles')
		.select(
			'id, display_name',
		)
		.eq(
			'id',
			id,
		)
		.maybeSingle();

/*
 * Run the hosted Row Level Security integration test.
 *
 * These checks exercise the real Supabase project through its public API,
 * rather than mocking database behaviour. This complements the local
 * pgTAP database tests by verifying the deployed policies end-to-end.
 */
const run = async () => {
	/*
	 * Authenticate both real test accounts and verify that they are
	 * genuinely different Supabase users.
	 */
	const accountAId =
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
		'The test accounts must be different users',
	);

	/*
	 * Positive ownership check:
	 * Account A must be able to read its own private profile.
	 */
	const {
		data: accountAOwnProfile,
		error: accountAOwnError,
	} = await readProfile(
		accountAClient,
		accountAId,
	);

	assert.equal(
		accountAOwnError,
		null,
		'Account A should read its own profile',
	);

	assert.equal(
		accountAOwnProfile?.id,
		accountAId,
		'Account A should receive its own profile',
	);

	console.log(
		'PASS: Account A can read its own profile',
	);

	/*
	 * Repeat the positive ownership check independently for Account B.
	 * Its original display name is retained so that the later attempted
	 * unauthorised update can be proven to have had no effect.
	 */
	const {
		data: accountBOriginalProfile,
		error: accountBOwnError,
	} = await readProfile(
		accountBClient,
		accountBId,
	);

	assert.equal(
		accountBOwnError,
		null,
		'Account B should read its own profile',
	);

	assert.equal(
		accountBOriginalProfile?.id,
		accountBId,
		'Account B should receive its own profile',
	);

	console.log(
		'PASS: Account B can read its own profile',
	);

	/*
	 * Negative ownership check:
	 * Account A attempts to request Account B's profile.
	 *
	 * A correctly enforced SELECT policy hides the row, so the request
	 * itself can succeed while returning no accessible profile.
	 */
	const {
		data: accountAReadsB,
		error: accountAReadsBError,
	} = await readProfile(
		accountAClient,
		accountBId,
	);

	assert.equal(
		accountAReadsBError,
		null,
		'RLS-filtered foreign SELECT should not raise an API error',
	);

	assert.equal(
		accountAReadsB,
		null,
		'Account A must not receive Account B profile',
	);

	console.log(
		'PASS: Account A cannot read Account B profile',
	);

	/*
	 * Perform the reverse ownership check as well.
	 *
	 * Testing both directions helps demonstrate that isolation is based
	 * on the authenticated user's identity rather than a special property
	 * of only one test account.
	 */
	const {
		data: accountBReadsA,
		error: accountBReadsAError,
	} = await readProfile(
		accountBClient,
		accountAId,
	);

	assert.equal(
		accountBReadsAError,
		null,
		'RLS-filtered foreign SELECT should not raise an API error',
	);

	assert.equal(
		accountBReadsA,
		null,
		'Account B must not receive Account A profile',
	);

	console.log(
		'PASS: Account B cannot read Account A profile',
	);

	/*
	 * Attempt an unauthorised cross-account UPDATE.
	 *
	 * The unique value makes an accidental mutation easy to detect.
	 * With the current RLS policy, the foreign row should simply match
	 * zero updateable rows.
	 */
	const attemptedForeignValue =
		'RLS_TEST_UNAUTHORISED_CHANGE';

	const {
		data: accountAUpdateB,
		error: accountAUpdateBError,
	} =
		await accountAClient
			.from('profiles')
			.update({
				display_name:
					attemptedForeignValue,
			})
			.eq(
				'id',
				accountBId,
			)
			.select(
				'id, display_name',
			);

	assert.equal(
		accountAUpdateBError,
		null,
		'RLS-filtered foreign UPDATE should not raise an API error',
	);

	assert.deepEqual(
		accountAUpdateB,
		[],
		'Account A must update zero Account B rows',
	);

	/*
	 * Read Account B's profile using Account B's own authenticated
	 * session and confirm that the attempted unauthorised change
	 * did not alter the stored value.
	 */
	const {
		data: accountBAfterAttack,
		error: accountBAfterAttackError,
	} = await readProfile(
		accountBClient,
		accountBId,
	);

	assert.equal(
		accountBAfterAttackError,
		null,
		'Account B should still read its profile',
	);

	assert.equal(
		accountBAfterAttack?.display_name,
		accountBOriginalProfile?.display_name,
		'Account B profile must remain unchanged',
	);

	console.log(
		'PASS: Account A cannot update Account B profile',
	);

	/*
	 * Finally, verify the guest boundary.
	 *
	 * The anonymous client has no authenticated user identity and must
	 * therefore be unable to read the private profiles table.
	 */
	const {
		error: anonymousReadError,
	} =
		await anonymousClient
			.from('profiles')
			.select('id')
			.limit(1);

	assert.ok(
		anonymousReadError,
		'Anonymous profile access must be rejected',
	);

	console.log(
		'PASS: Anonymous client cannot read private profiles',
	);

	console.log(
		'PASS: Hosted profiles RLS integration test completed',
	);
};

/*
 * Always clear the temporary authenticated sessions created by this
 * script, even if an assertion fails part-way through the test.
 *
 * Promise.allSettled() ensures that failure to sign out one client does
 * not prevent cleanup from being attempted for the other client.
 */
try {
	await run();
} finally {
	await Promise.allSettled([
		accountAClient.auth.signOut({
			scope: 'local',
		}),
		accountBClient.auth.signOut({
			scope: 'local',
		}),
	]);
}