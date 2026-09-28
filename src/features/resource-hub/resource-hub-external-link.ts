import {
	Linking,
} from 'react-native';


export type ResourceSourceOpenResult =
	| 'opened'
	| 'invalid-url'
	| 'open-failed';


/**
 * Resource Hub provenance links must use HTTPS.
 *
 * Although source URLs are curated backend content, validating them again at
 * the device boundary prevents another URI scheme from becoming executable if
 * malformed or unexpected data ever reaches the catalogue.
*/
export function isSafeResourceSourceUrl(
	value: string,
): boolean {
	const trimmedValue =
		value.trim();

	try {
		const parsedUrl =
			new URL(
				trimmedValue,
			);

		return (
			parsedUrl.protocol === 'https:'
			&& parsedUrl.hostname.length > 0
			&& parsedUrl.username.length === 0
			&& parsedUrl.password.length === 0
		);
	} catch {
		return false;
	}
}


/**
 * Opens one reviewed Resource Hub source outside Ihtiyat.
 *
 * The caller receives an explicit result so the UI can distinguish malformed
 * catalogue data from a normal operating-system/browser failure.
*/
export async function openResourceSourceUrl(
	value: string,
): Promise<ResourceSourceOpenResult> {
	const trimmedValue =
		value.trim();

	if (
		!isSafeResourceSourceUrl(
			trimmedValue,
		)
	) {
		return 'invalid-url';
	}

	try {
		await Linking.openURL(
			trimmedValue,
		);

		return 'opened';
	} catch {
		return 'open-failed';
	}
}