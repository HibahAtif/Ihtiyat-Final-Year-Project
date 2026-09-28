/// <reference types="jest" />

import {
	createSessionFromAuthUrl,
	getAuthCallbackParameters,
} from '../../src/auth/auth-deep-link';
import { supabaseClient } from '../../src/lib/supabase-config';

jest.mock('../../src/lib/supabase-config', () => ({
	supabaseClient: {
		auth: {
			setSession: jest.fn(),
		},
	},
}));

const setSessionMock =
	supabaseClient.auth.setSession as jest.Mock;

describe('auth deep-link handling', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		setSessionMock.mockResolvedValue({
			error: null,
		});
	});

	test(
		'reads session values from a URL fragment',
		() => {
			const parameters =
				getAuthCallbackParameters(
					'ihtiyat://auth/callback'
					+ '#access_token=access-token'
					+ '&refresh_token=refresh-token'
					+ '&type=signup',
				);

			expect(parameters).toEqual({
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
				authType: 'signup',
				errorCode: null,
				errorDescription: null,
			});
		},
	);

	test(
		'reads session values from query parameters',
		() => {
			const parameters =
				getAuthCallbackParameters(
					'ihtiyat://auth/reset-password'
					+ '?access_token=access-token'
					+ '&refresh_token=refresh-token'
					+ '&type=recovery',
				);

			expect(parameters).toEqual({
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
				authType: 'recovery',
				errorCode: null,
				errorDescription: null,
			});
		},
	);

	test(
		'creates a session for the expected recovery auth type',
		async () => {
			await createSessionFromAuthUrl(
				'ihtiyat://auth/reset-password'
				+ '#access_token=access-token'
				+ '&refresh_token=refresh-token'
				+ '&type=recovery',
				'recovery',
			);

			expect(
				setSessionMock,
			).toHaveBeenCalledTimes(1);

			expect(
				setSessionMock,
			).toHaveBeenCalledWith({
				access_token:
					'access-token',
				refresh_token:
					'refresh-token',
			});
		},
	);

	test(
		'rejects an unexpected authentication type',
		async () => {
			await expect(
				createSessionFromAuthUrl(
					'ihtiyat://auth/reset-password'
						+ '#access_token=access-token'
						+ '&refresh_token=refresh-token'
						+ '&type=signup',
					'recovery',
				),
			).rejects.toThrow(
				'unexpected authentication type',
			);

			expect(
				setSessionMock,
			).not.toHaveBeenCalled();
		},
	);

	test(
		'rejects a callback with missing session tokens',
		async () => {
			await expect(
				createSessionFromAuthUrl(
					'ihtiyat://auth/reset-password'
						+ '#type=recovery',
					'recovery',
				),
			).rejects.toThrow(
				'did not contain a complete session',
			);

			expect(
				setSessionMock,
			).not.toHaveBeenCalled();
		},
	);

	test(
		'rejects an authentication provider error',
		async () => {
			await expect(
				createSessionFromAuthUrl(
					'ihtiyat://auth/reset-password'
						+ '?error=access_denied'
						+ '&error_description=Invalid',
					'recovery',
				),
			).rejects.toThrow(
				'reported an error',
			);

			expect(
				setSessionMock,
			).not.toHaveBeenCalled();
		},
	);
});