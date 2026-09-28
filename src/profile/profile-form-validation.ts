import type {
	ProfilePreferencesUpdate,
} from './profile-types';


export type HouseholdInputValues = {
	children: string;
	adults: string;
	olderAdults: string;
	pets: string;
};


export type HouseholdInputField =
	| 'children'
	| 'adults'
	| 'olderAdults'
	| 'pets';

export type HouseholdValidationErrorCode =
	| 'required'
	| 'invalidWholeNumber'
	| 'range25'
	| 'range10'
	| 'atLeastOnePerson'
	| 'peopleTotal25';


export type HouseholdValidationErrors =
	Partial<
		Record<
			HouseholdInputField | 'household',
			HouseholdValidationErrorCode
		>
	>;


export type HouseholdValidationResult =
	| {
			isValid: true;
			values: Pick<
				ProfilePreferencesUpdate,
				| 'children_count'
				| 'adults_count'
				| 'older_adults_count'
				| 'pets_count'
			>;
			errors: {};
	  }
	| {
			isValid: false;
			values: null;
			errors: HouseholdValidationErrors;
	  };


/**
 * Converts one household text field to a non-negative integer.
 *
 * Blank values are handled separately because an entirely blank household
 * form deliberately represents "not supplied".
 */
const parseHouseholdCount = (
	value: string,
): number | null => {
	const trimmedValue =
		value.trim();

	if (trimmedValue === '') {
		return null;
	}

	if (!/^\d+$/.test(trimmedValue)) {
		return Number.NaN;
	}

	return Number(
		trimmedValue,
	);
};


/**
 * Validates household composition before it is sent to Supabase.
 *
 * The rules intentionally mirror the database constraints:
 *
 * - all four fields blank = household information not supplied;
 * - otherwise all four fields must be supplied;
 * - people categories must each be between 0 and 25;
 * - pets must be between 0 and 10;
 * - completed household information must contain at least one person;
 * - the combined human household size may not exceed 25.
 *
 * Database constraints remain the final integrity boundary. This function
 * exists to give users immediate, understandable validation feedback.
 */
export function validateHouseholdInputs(
	inputs: HouseholdInputValues,
): HouseholdValidationResult {
	const parsed = {
		children:
			parseHouseholdCount(
				inputs.children,
			),

		adults:
			parseHouseholdCount(
				inputs.adults,
			),

		olderAdults:
			parseHouseholdCount(
				inputs.olderAdults,
			),

		pets:
			parseHouseholdCount(
				inputs.pets,
			),
	};


	const allBlank =
		Object.values(
			parsed,
		).every(
			(value) =>
				value === null,
		);


	if (allBlank) {
		return {
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
		};
	}


	const errors:
		HouseholdValidationErrors = {};


	const fieldDefinitions: Array<{
		field: HouseholdInputField;
		value: number | null;
		maximum: number;
	}> = [
		{
			field: 'children',
			value: parsed.children,
			maximum: 25,
		},
		{
			field: 'adults',
			value: parsed.adults,
			maximum: 25,
		},
		{
			field: 'olderAdults',
			value: parsed.olderAdults,
			maximum: 25,
		},
		{
			field: 'pets',
			value: parsed.pets,
			maximum: 10,
		},
	];


	for (
		const {
			field,
			value,
			maximum,
		}
		of fieldDefinitions
	) {
		if (value === null) {
			errors[field] =
				'required';

			continue;
		}

		if (
			Number.isNaN(
				value,
			)
		) {
			errors[field] =
				'invalidWholeNumber';

			continue;
		}

		if (
			value < 0
			|| value > maximum
		) {
			errors[field] =
                maximum === 10
				    ? `range10`
                    : 'range25';
		}
	}


	if (
		Object.keys(
			errors,
		).length > 0
	) {
		return {
			isValid: false,
			values: null,
			errors,
		};
	}


	/*
	 * All values are known to be present and numeric after the field-level
	 * checks above.
	 */
	const children =
		parsed.children as number;

	const adults =
		parsed.adults as number;

	const olderAdults =
		parsed.olderAdults as number;

	const pets =
		parsed.pets as number;


	const humanTotal =
		children
		+ adults
		+ olderAdults;


	if (humanTotal < 1) {
		return {
			isValid: false,

			values: null,

			errors: {
				household:
					'atLeastOnePerson',
			},
		};
	}


	if (humanTotal > 25) {
		return {
			isValid: false,

			values: null,

			errors: {
				household:
					'peopleTotal25',
			},
		};
	}


	return {
		isValid: true,

		values: {
			children_count:
				children,

			adults_count:
				adults,

			older_adults_count:
				olderAdults,

			pets_count:
				pets,
		},

		errors: {},
	};
}