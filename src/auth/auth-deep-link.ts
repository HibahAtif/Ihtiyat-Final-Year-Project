import { supabaseClient } from '../lib/supabase-config';

type AuthCallbackParameters = {
	accessToken: string | null;
	refreshToken: string | null;
	authType: string | null;
	errorCode: string | null;
	errorDescription: string | null;
};

/**
 * Reads Supabase Auth values from either the query string or URL fragment.
 *
 * Supabase's implicit mobile auth flow can return session information after
 * the # character, while authentication failures can also be returned through
 * redirect parameters.
 */
export function getAuthCallbackParameters(
	url: string,
): AuthCallbackParameters {
	const parsedUrl = new URL(url);

	const fragmentParameters = new URLSearchParams(
		parsedUrl.hash.startsWith('#')
			? parsedUrl.hash.slice(1)
			: parsedUrl.hash,
	);

	const getParameter = (
		name: string,
	): string | null =>
		fragmentParameters.get(name)
		?? parsedUrl.searchParams.get(name);

	return {
		accessToken: getParameter('access_token'),
		refreshToken: getParameter('refresh_token'),
		authType: getParameter('type'),
		errorCode:
			getParameter('error_code')
			?? getParameter('error'),
		errorDescription:
			getParameter('error_description'),
	};
}

/**
 * Converts a successful Supabase authentication deep link into a persisted
 * application session.
 *
 * The raw URL and authentication tokens are deliberately never logged.
 */
export async function createSessionFromAuthUrl(
	url: string,
	expectedAuthType?: string,
): Promise<void> {
	const {
		accessToken,
		refreshToken,
		authType,
		errorCode,
	} = getAuthCallbackParameters(url);

	if (errorCode) {
		throw new Error(
			'The authentication callback reported an error.',
		);
	}

	if (
		expectedAuthType && authType!== expectedAuthType
	)
	{
		throw new Error('The authentication callback has an unexpected authentication type.',);
	}

	if (
		!accessToken
		|| !refreshToken
	) {
		throw new Error(
			'The authentication callback did not contain a complete session.',
		);
	}

	const {
		error,
	} = await supabaseClient.auth.setSession({
		access_token: accessToken,
		refresh_token: refreshToken,
	});

	if (error) {
		throw error;
	}
}