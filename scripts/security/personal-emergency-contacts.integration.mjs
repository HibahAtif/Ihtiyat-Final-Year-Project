import assert from 'node:assert/strict';

import {
	createClient,
} from '@supabase/supabase-js';


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
 * Integration clients use only Ihtiyat's public publishable key.
 *
 * This is important because the test is intended to exercise the same
 * grants and Row Level Security policies used by the mobile application.
 * No service-role key is involved.
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

const anonymousClient =
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
	} =
		await client.auth
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
 * IDs of temporary contacts created by the test.
 *
 * They are retained only so the finally block can remove them if an
 * assertion fails before normal deletion occurs.
 */
let accountATestContactId = null;

let accountBTestContactId = null;


/*
 * Best-effort cleanup for test-created rows.
 *
 * Cleanup deliberately targets only the exact UUIDs created by this script,
 * so existing personal contacts belonging to the test accounts are untouched.
 */
const cleanupTestContacts = async () => {
	const cleanupOperations = [];

	if (accountATestContactId) {
		cleanupOperations.push(
			accountAClient
				.from(
					'personal_emergency_contacts',
				)
				.delete()
				.eq(
					'id',
					accountATestContactId,
				),
		);
	}

	if (accountBTestContactId) {
		cleanupOperations.push(
			accountBClient
				.from(
					'personal_emergency_contacts',
				)
				.delete()
				.eq(
					'id',
					accountBTestContactId,
				),
		);
	}

	const results =
		await Promise.allSettled(
			cleanupOperations,
		);

	for (const result of results) {
		if (
			result.status === 'fulfilled'
			&& result.value.error
		) {
			console.error(
				'ERROR: Test-contact cleanup failed:',
				result.value.error,
			);
		}

		if (
			result.status === 'rejected'
		) {
			console.error(
				'ERROR: Test-contact cleanup failed:',
				result.reason,
			);
		}
	}
};


const run = async () => {
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
		'The integration test requires two different accounts',
	);


	/* ======================================================================
	 * Account A: create and read an owned contact
	 * ====================================================================== */

	const {
		data: accountAContact,
		error: accountAInsertError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.insert({
				user_id:
					accountAId,

				name:
					'Ihtiyat Integration Contact A',

				relationship_label:
					'Test contact',

				phone_number:
					'+966501234567',

				email:
					'integration-a@example.test',

				is_primary:
					false,
			})
			.select(
				'id, user_id, name, relationship_label, phone_number, email, is_primary',
			)
			.single();

	assert.equal(
		accountAInsertError,
		null,
		'Account A should create its own personal contact',
	);

	assert.ok(
		accountAContact?.id,
		'Account A contact should receive a database-generated ID',
	);

	accountATestContactId =
		accountAContact.id;

	assert.equal(
		accountAContact.user_id,
		accountAId,
		'The new contact should belong to Account A',
	);

	assert.equal(
		accountAContact.phone_number,
		'+966501234567',
		'The canonical Saudi phone number should be stored',
	);

	console.log(
		'PASS: Account A can create its own personal emergency contact',
	);


	const {
		data: accountAReadsOwnContact,
		error: accountAReadOwnError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.select(
				'id, user_id, name',
			)
			.eq(
				'id',
				accountATestContactId,
			)
			.maybeSingle();

	assert.equal(
		accountAReadOwnError,
		null,
		'Account A should read its own personal contact',
	);

	assert.equal(
		accountAReadsOwnContact?.id,
		accountATestContactId,
		'Account A should receive its own contact row',
	);

	console.log(
		'PASS: Account A can read its own personal emergency contact',
	);


	/* ======================================================================
	 * Account B: create an independent owned contact
	 * ====================================================================== */

	const {
		data: accountBContact,
		error: accountBInsertError,
	} =
		await accountBClient
			.from(
				'personal_emergency_contacts',
			)
			.insert({
				user_id:
					accountBId,

				name:
					'Ihtiyat Integration Contact B',

				relationship_label:
					'Test contact',

				phone_number:
					'+966531234567',

				email:
					null,

				is_primary:
					false,
			})
			.select(
				'id, user_id',
			)
			.single();

	assert.equal(
		accountBInsertError,
		null,
		'Account B should create its own personal contact',
	);

	assert.ok(
		accountBContact?.id,
		'Account B contact should receive a database-generated ID',
	);

	accountBTestContactId =
		accountBContact.id;

	assert.equal(
		accountBContact.user_id,
		accountBId,
		'The new contact should belong to Account B',
	);

	console.log(
		'PASS: Account B can create its own personal emergency contact',
	);


	/* ======================================================================
	 * Cross-account SELECT isolation
	 * ====================================================================== */

	const {
		data: accountBReadsA,
		error: accountBReadsAError,
	} =
		await accountBClient
			.from(
				'personal_emergency_contacts',
			)
			.select(
				'id',
			)
			.eq(
				'id',
				accountATestContactId,
			)
			.maybeSingle();

	assert.equal(
		accountBReadsAError,
		null,
		'RLS-filtered foreign SELECT should not raise an API error',
	);

	assert.equal(
		accountBReadsA,
		null,
		'Account B must not receive Account A contact',
	);


	const {
		data: accountAReadsB,
		error: accountAReadsBError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.select(
				'id',
			)
			.eq(
				'id',
				accountBTestContactId,
			)
			.maybeSingle();

	assert.equal(
		accountAReadsBError,
		null,
		'RLS-filtered foreign SELECT should not raise an API error',
	);

	assert.equal(
		accountAReadsB,
		null,
		'Account A must not receive Account B contact',
	);

	console.log(
		'PASS: Hosted contact reads are isolated between accounts',
	);


	/* ======================================================================
	 * Cross-account INSERT protection
	 * ====================================================================== */

	const {
		error: accountAInsertForBError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.insert({
				user_id:
					accountBId,

				name:
					'Unauthorised Integration Contact',

				relationship_label:
					'Test contact',

				phone_number:
					'+966541234567',

				is_primary:
					false,
			});

	assert.ok(
		accountAInsertForBError,
		'Account A must not create a contact owned by Account B',
	);

	assert.equal(
		accountAInsertForBError.code,
		'42501',
		'Foreign contact creation should be rejected by RLS',
	);

	console.log(
		'PASS: Account A cannot create contacts owned by Account B',
	);


	/* ======================================================================
	 * Own-contact UPDATE
	 * ====================================================================== */

	const {
		data: accountAUpdatedContact,
		error: accountAUpdateError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.update({
				name:
					'Ihtiyat Integration Contact A Updated',

				relationship_label:
					'Updated test contact',
			})
			.eq(
				'id',
				accountATestContactId,
			)
			.select(
				'id, name, relationship_label',
			)
			.single();

	assert.equal(
		accountAUpdateError,
		null,
		'Account A should update its own personal contact',
	);

	assert.equal(
		accountAUpdatedContact.name,
		'Ihtiyat Integration Contact A Updated',
		'The permitted contact update should persist',
	);

	assert.equal(
		accountAUpdatedContact.relationship_label,
		'Updated test contact',
		'The updated relationship label should persist',
	);

	console.log(
		'PASS: Account A can update its own personal emergency contact',
	);


	/* ======================================================================
	 * Ownership immutability
	 * ====================================================================== */

	const {
		error: ownershipChangeError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.update({
				user_id:
					accountBId,
			})
			.eq(
				'id',
				accountATestContactId,
			);

	assert.ok(
		ownershipChangeError,
		'Authenticated clients must not reassign contact ownership',
	);

	assert.equal(
		ownershipChangeError.code,
		'42501',
		'user_id UPDATE should be rejected by column permissions',
	);

	console.log(
		'PASS: Hosted clients cannot reassign personal contact ownership',
	);


	/* ======================================================================
	 * Cross-account UPDATE and DELETE isolation
	 * ====================================================================== */

	const {
		data: accountBUpdatesA,
		error: accountBUpdatesAError,
	} =
		await accountBClient
			.from(
				'personal_emergency_contacts',
			)
			.update({
				name:
					'Unauthorised Change',
			})
			.eq(
				'id',
				accountATestContactId,
			)
			.select('id');

	assert.equal(
		accountBUpdatesAError,
		null,
		'RLS-filtered foreign UPDATE should not raise an API error',
	);

	assert.deepEqual(
		accountBUpdatesA,
		[],
		'Account B must update zero Account A contact rows',
	);


	const {
		data: accountBDeletesA,
		error: accountBDeletesAError,
	} =
		await accountBClient
			.from(
				'personal_emergency_contacts',
			)
			.delete()
			.eq(
				'id',
				accountATestContactId,
			)
			.select('id');

	assert.equal(
		accountBDeletesAError,
		null,
		'RLS-filtered foreign DELETE should not raise an API error',
	);

	assert.deepEqual(
		accountBDeletesA,
		[],
		'Account B must delete zero Account A contact rows',
	);


	const {
		data: accountAAfterAttack,
		error: accountAAfterAttackError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.select(
				'id, name',
			)
			.eq(
				'id',
				accountATestContactId,
			)
			.single();

	assert.equal(
		accountAAfterAttackError,
		null,
		'Account A should still read its contact after foreign operations',
	);

	assert.equal(
		accountAAfterAttack.name,
		'Ihtiyat Integration Contact A Updated',
		'Account A contact must remain unchanged by Account B',
	);

	console.log(
		'PASS: Account B cannot update or delete Account A contacts',
	);


	/* ======================================================================
	 * Representative deployed phone validation
	 * ====================================================================== */

	const {
		error: invalidPhoneError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.insert({
				user_id:
					accountAId,

				name:
					'Invalid Phone Integration Contact',

				relationship_label:
					'Test contact',

				phone_number:
					'0551234567',

				is_primary:
					false,
			});

	assert.ok(
		invalidPhoneError,
		'Hosted database must reject non-canonical phone storage',
	);

	assert.equal(
		invalidPhoneError.code,
		'23514',
		'Invalid stored phone format should violate the CHECK constraint',
	);

	console.log(
		'PASS: Hosted contact phone constraint requires canonical Saudi format',
	);


	/* ======================================================================
	 * Anonymous access boundary
	 * ====================================================================== */

	const {
		error: anonymousReadError,
	} =
		await anonymousClient
			.from(
				'personal_emergency_contacts',
			)
			.select('id')
			.limit(1);

	assert.ok(
		anonymousReadError,
		'Anonymous users must not read personal emergency contacts',
	);

	assert.equal(
		anonymousReadError.code,
		'42501',
		'Anonymous contact access should be rejected by database permissions',
	);

	console.log(
		'PASS: Anonymous users cannot access personal emergency contacts',
	);


	/* ======================================================================
	 * Normal owner deletion
	 * ====================================================================== */

	const {
		data: deletedAccountAContact,
		error: accountADeleteError,
	} =
		await accountAClient
			.from(
				'personal_emergency_contacts',
			)
			.delete()
			.eq(
				'id',
				accountATestContactId,
			)
			.select('id')
			.single();

	assert.equal(
		accountADeleteError,
		null,
		'Account A should delete its own personal contact',
	);

	assert.equal(
		deletedAccountAContact.id,
		accountATestContactId,
		'Account A should delete the intended contact',
	);

	accountATestContactId =
		null;

	console.log(
		'PASS: Account A can delete its own personal emergency contact',
	);


	const {
		data: deletedAccountBContact,
		error: accountBDeleteError,
	} =
		await accountBClient
			.from(
				'personal_emergency_contacts',
			)
			.delete()
			.eq(
				'id',
				accountBTestContactId,
			)
			.select('id')
			.single();

	assert.equal(
		accountBDeleteError,
		null,
		'Account B should delete its own personal contact',
	);

	assert.equal(
		deletedAccountBContact.id,
		accountBTestContactId,
		'Account B should delete the intended contact',
	);

	accountBTestContactId =
		null;

	console.log(
		'PASS: Account B can delete its own personal emergency contact',
	);


	console.log(
		'PASS: Hosted personal-emergency-contacts integration test completed',
	);
};


let testError = null;

try {
	await run();
} catch (error) {
	testError =
		error;
} finally {
	/*
	 * Attempt to remove temporary rows before signing the users out.
	 *
	 * This makes the script safe to rerun even when an assertion fails
	 * after one or both temporary contacts have already been created.
	 */
	await cleanupTestContacts();

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