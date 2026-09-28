/// <reference types="jest" />

import {
	validateHouseholdInputs,
} from '../../src/profile/profile-form-validation';


describe(
	'validateHouseholdInputs',
	() => {
		test(
			'treats an entirely blank household form as not supplied',
			() => {
				const result =
					validateHouseholdInputs({
						children: '',
						adults: '',
						olderAdults: '',
						pets: '',
					});

				expect(
					result,
				).toEqual({
					isValid: true,

					values: {
						children_count:
							null,

						adults_count:
							null,

						older_adults_count:
							null,

						pets_count:
							null,
					},

					errors: {},
				});
			},
		);


		test(
			'accepts explicit zero values when at least one human is present',
			() => {
				const result =
					validateHouseholdInputs({
						children: '0',
						adults: '1',
						olderAdults: '0',
						pets: '0',
					});

				expect(
					result,
				).toEqual({
					isValid: true,

					values: {
						children_count:
							0,

						adults_count:
							1,

						older_adults_count:
							0,

						pets_count:
							0,
					},

					errors: {},
				});
			},
		);


		test(
			'rejects a partially completed household form',
			() => {
				const result =
					validateHouseholdInputs({
						children: '2',
						adults: '2',
						olderAdults: '',
						pets: '0',
					});

				expect(
					result.isValid,
				).toBe(false);

				if (
					result.isValid
				) {
					throw new Error(
						'Expected invalid household result.',
					);
				}

				expect(
					result.errors
						.olderAdults,
				).toBe(
					'required',
				);
			},
		);


		test(
			'rejects negative counts',
			() => {
				const result =
					validateHouseholdInputs({
						children: '-1',
						adults: '2',
						olderAdults: '0',
						pets: '0',
					});

				expect(
					result.isValid,
				).toBe(false);

				if (
					result.isValid
				) {
					throw new Error(
						'Expected invalid household result.',
					);
				}

				expect(
					result.errors.children,
				).toBe(
					'invalidWholeNumber',
				);
			},
		);


		test(
			'rejects non-numeric counts',
			() => {
				const result =
					validateHouseholdInputs({
						children: 'two',
						adults: '2',
						olderAdults: '0',
						pets: '0',
					});

				expect(
					result.isValid,
				).toBe(false);

				if (
					result.isValid
				) {
					throw new Error(
						'Expected invalid household result.',
					);
				}

				expect(
					result.errors.children,
				).toBe(
					'invalidWholeNumber',
				);
			},
		);


		test(
			'rejects decimal counts',
			() => {
				const result =
					validateHouseholdInputs({
						children: '1.5',
						adults: '2',
						olderAdults: '0',
						pets: '0',
					});

				expect(
					result.isValid,
				).toBe(false);
			},
		);


		test(
			'rejects human category values above 25',
			() => {
				const result =
					validateHouseholdInputs({
						children: '26',
						adults: '1',
						olderAdults: '0',
						pets: '0',
					});

				expect(
					result.isValid,
				).toBe(false);

				if (
					result.isValid
				) {
					throw new Error(
						'Expected invalid household result.',
					);
				}

				expect(
					result.errors.children,
				).toBe(
					'range25',
				);
			},
		);


		test(
			'rejects pet counts above 10',
			() => {
				const result =
					validateHouseholdInputs({
						children: '0',
						adults: '1',
						olderAdults: '0',
						pets: '11',
					});

				expect(
					result.isValid,
				).toBe(false);

				if (
					result.isValid
				) {
					throw new Error(
						'Expected invalid household result.',
					);
				}

				expect(
					result.errors.pets,
				).toBe(
					'range10',
				);
			},
		);


		test(
			'rejects a completed household containing zero humans',
			() => {
				const result =
					validateHouseholdInputs({
						children: '0',
						adults: '0',
						olderAdults: '0',
						pets: '2',
					});

				expect(
					result.isValid,
				).toBe(false);

				if (
					result.isValid
				) {
					throw new Error(
						'Expected invalid household result.',
					);
				}

				expect(
					result.errors.household,
				).toBe(
					'atLeastOnePerson',
				);
			},
		);


		test(
			'rejects a combined human household size above 25',
			() => {
				const result =
					validateHouseholdInputs({
						children: '10',
						adults: '10',
						olderAdults: '6',
						pets: '0',
					});

				expect(
					result.isValid,
				).toBe(false);

				if (
					result.isValid
				) {
					throw new Error(
						'Expected invalid household result.',
					);
				}

				expect(
					result.errors.household,
				).toBe(
					'peopleTotal25',
				);
			},
		);


		test(
			'trims surrounding whitespace around valid whole numbers',
			() => {
				const result =
					validateHouseholdInputs({
						children: ' 1 ',
						adults: ' 2 ',
						olderAdults: ' 0 ',
						pets: ' 1 ',
					});

				expect(
					result,
				).toEqual({
					isValid: true,

					values: {
						children_count:
							1,

						adults_count:
							2,

						older_adults_count:
							0,

						pets_count:
							1,
					},

					errors: {},
				});
			},
		);
	},
);