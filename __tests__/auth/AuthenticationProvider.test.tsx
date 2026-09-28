/// <reference types="jest" />

import {
	act,
	render,
	waitFor,
} from '@testing-library/react-native';
import {
	AppState,
	AppStateStatus,
	Platform,
	Text,
	View,
} from 'react-native';
import type {
	Session,
} from '@supabase/supabase-js';

import {
	AuthenticationProvider,
	useAuth,
} from '../../src/auth/AuthenticationProvider';
import {
	supabaseClient,
} from '../../src/lib/supabase-config';

jest.mock(
	'../../src/lib/supabase-config',
	() => ({
		supabaseClient: {
			auth: {
				getSession: jest.fn(),
				onAuthStateChange: jest.fn(),
				startAutoRefresh: jest.fn(),
				stopAutoRefresh: jest.fn(),
			},
		},
	}),
);

const getSessionMock =
	supabaseClient.auth.getSession as jest.Mock;

const onAuthStateChangeMock =
	supabaseClient.auth.onAuthStateChange as jest.Mock;

const startAutoRefreshMock =
	supabaseClient.auth.startAutoRefresh as jest.Mock;

const stopAutoRefreshMock =
	supabaseClient.auth.stopAutoRefresh as jest.Mock;

const unsubscribeMock =
	jest.fn();

const appStateRemoveMock =
	jest.fn();

let authStateChangeHandler:
	| ((
		event: string,
		session: Session | null,
	) => void)
	| null = null;

let appStateChangeHandler:
	| ((state: AppStateStatus) => void)
	| null = null;

/**
 * Minimal Supabase session fixture used to test authenticated state
 * without requiring a real network request or real credentials.
 */
const createTestSession = (
	userId: string,
): Session =>
	({
		access_token:
			'test-access-token',
		refresh_token:
			'test-refresh-token',
		expires_in: 3600,
		token_type: 'bearer',
		user: {
			id: userId,
			aud: 'authenticated',
			role: 'authenticated',
			email:
				'test-user@example.test',
			app_metadata: {},
			user_metadata: {},
			created_at:
				'2026-09-17T00:00:00.000Z',
		},
	}) as Session;

type TestSessionResult = {
	data: {
		session: Session | null;
	};
	error: {
		message: string;
	} | null;
};

/**
 * Allows a test to control exactly when the mocked Supabase
 * getSession() request completes.
 *
 * Resolving the request from inside act() ensures that React can
 * process the provider's resulting state updates before assertions
 * are made.
 */
const createDeferredSessionResult = () => {
	let resolvePromise:
		| ((value: TestSessionResult) => void)
		| undefined;

	const promise =
		new Promise<TestSessionResult>(
			(resolve) => {
				resolvePromise =
					resolve;
			},
		);

	return {
		promise,
		resolve: (
			value: TestSessionResult,
		) => {
			if (!resolvePromise) {
				throw new Error(
					'Deferred session resolver is unavailable.',
				);
			}

			resolvePromise(value);
		},
	};
};

/**
 * Exposes AuthenticationProvider state as simple text values so that
 * tests can inspect the context without depending on application UI.
 */
function AuthProbe() {
	const {
		session,
		user,
		isAuthenticated,
		isLoading,
	} = useAuth();

	return (
		<View>
			<Text testID="loading">
				{String(isLoading)}
			</Text>

			<Text testID="authenticated">
				{String(isAuthenticated)}
			</Text>

			<Text testID="session">
				{session
					? 'present'
					: 'none'}
			</Text>

			<Text testID="user-id">
				{user?.id ?? 'none'}
			</Text>
		</View>
	);
}

describe(
	'AuthenticationProvider',
	() => {
		let addEventListenerSpy:
			jest.SpyInstance;

		beforeEach(() => {
			jest.clearAllMocks();

			authStateChangeHandler =
				null;

			appStateChangeHandler =
				null;

			Object.defineProperty(
				Platform,
				'OS',
				{
					configurable: true,
					value: 'android',
				},
			);

			Object.defineProperty(
				AppState,
				'currentState',
				{
					configurable: true,
					value: 'active',
				},
			);

			onAuthStateChangeMock
				.mockImplementation(
					(callback) => {
						authStateChangeHandler =
							callback;

						return {
							data: {
								subscription: {
									unsubscribe:
										unsubscribeMock,
								},
							},
						};
					},
				);

			addEventListenerSpy =
				jest.spyOn(
					AppState,
					'addEventListener',
				)
					.mockImplementation(
						(
							_event,
							callback,
						) => {
							appStateChangeHandler =
								callback;

							return {
								remove:
									appStateRemoveMock,
							};
						},
					);
		});

		afterEach(() => {
			addEventListenerSpy
				.mockRestore();
		});

		test(
			'remains loading until session restoration finishes, then exposes guest state',
			async () => {
				const deferredSession =
					createDeferredSessionResult();

				getSessionMock
					.mockReturnValue(
						deferredSession.promise,
					);

				const {
					getByTestId,
				} = await render(
					<AuthenticationProvider>
						<AuthProbe />
					</AuthenticationProvider>,
				);

				expect(
					getByTestId(
						'loading',
					).props.children,
				).toBe('true');

				await act(async () => {
					deferredSession.resolve({
						data: {
							session: null,
						},
						error: null,
					});

					await deferredSession.promise;
				});

				await waitFor(() => {
					expect(
						getByTestId(
							'loading',
						).props.children,
					).toBe('false');
				});

				expect(
					getByTestId(
						'authenticated',
					).props.children,
				).toBe('false');

				expect(
					getByTestId(
						'session',
					).props.children,
				).toBe('none');

				expect(
					getByTestId(
						'user-id',
					).props.children,
				).toBe('none');
			},
		);

		test(
			'restores an existing authenticated session',
			async () => {
				const deferredSession =
					createDeferredSessionResult();

				const session =
					createTestSession(
						'user-a',
					);

				getSessionMock
					.mockReturnValue(
						deferredSession.promise,
					);

				const {
					getByTestId,
				} = await render(
					<AuthenticationProvider>
						<AuthProbe />
					</AuthenticationProvider>,
				);

				await act(async () => {
					deferredSession.resolve({
						data: {
							session,
						},
						error: null,
					});

					await deferredSession.promise;
				});

				await waitFor(() => {
					expect(
						getByTestId(
							'loading',
						).props.children,
					).toBe('false');
				});

				expect(
					getByTestId(
						'authenticated',
					).props.children,
				).toBe('true');

				expect(
					getByTestId(
						'session',
					).props.children,
				).toBe('present');

				expect(
					getByTestId(
						'user-id',
					).props.children,
				).toBe('user-a');
			},
		);

		test(
			'updates authentication state when Supabase emits an auth change',
			async () => {
				const deferredSession =
					createDeferredSessionResult();

				getSessionMock
					.mockReturnValue(
						deferredSession.promise,
					);

				const {
					getByTestId,
				} = await render(
					<AuthenticationProvider>
						<AuthProbe />
					</AuthenticationProvider>,
				);

				await act(async () => {
					deferredSession.resolve({
						data: {
							session: null,
						},
						error: null,
					});

					await deferredSession.promise;
				});

				await waitFor(() => {
					expect(
						getByTestId(
							'loading',
						).props.children,
					).toBe('false');
				});

				const session =
					createTestSession(
						'user-b',
					);

				await act(async () => {
					authStateChangeHandler?.(
						'SIGNED_IN',
						session,
					);
				});

				expect(
					getByTestId(
						'authenticated',
					).props.children,
				).toBe('true');

				expect(
					getByTestId(
						'user-id',
					).props.children,
				).toBe('user-b');

				await act(async () => {
					authStateChangeHandler?.(
						'SIGNED_OUT',
						null,
					);
				});

				expect(
					getByTestId(
						'authenticated',
					).props.children,
				).toBe('false');

				expect(
					getByTestId(
						'user-id',
					).props.children,
				).toBe('none');
			},
		);

		test(
			'finishes loading safely when session restoration fails',
			async () => {
				const consoleErrorSpy =
					jest.spyOn(
						console,
						'error',
					)
						.mockImplementation(
							() => undefined,
						);

				try {
					const deferredSession =
						createDeferredSessionResult();

					getSessionMock
						.mockReturnValue(
							deferredSession.promise,
						);

					const {
						getByTestId,
					} = await render(
						<AuthenticationProvider>
							<AuthProbe />
						</AuthenticationProvider>,
					);

					await act(async () => {
						deferredSession.resolve({
							data: {
								session: null,
							},
							error: {
								message:
									'Test restoration failure',
							},
						});

						await deferredSession.promise;
					});

					await waitFor(() => {
						expect(
							getByTestId(
								'loading',
							).props.children,
						).toBe('false');
					});

					expect(
						getByTestId(
							'authenticated',
						).props.children,
					).toBe('false');

					expect(
						consoleErrorSpy,
					).toHaveBeenCalledWith(
						'[Ihtiyat auth] Failed to restore session:',
						'Test restoration failure',
					);
				} finally {
					consoleErrorSpy
						.mockRestore();
				}
			},
		);

		test(
			'starts and stops token auto-refresh as Android app state changes',
			async () => {
				const deferredSession =
					createDeferredSessionResult();

				getSessionMock
					.mockReturnValue(
						deferredSession.promise,
					);

				await render(
					<AuthenticationProvider>
						<AuthProbe />
					</AuthenticationProvider>,
				);

				await act(async () => {
					deferredSession.resolve({
						data: {
							session: null,
						},
						error: null,
					});

					await deferredSession.promise;
				});

				await waitFor(() => {
					expect(
						startAutoRefreshMock,
					).toHaveBeenCalledTimes(
						1,
					);
				});

				await act(async () => {
					appStateChangeHandler?.(
						'background',
					);
				});

				expect(
					stopAutoRefreshMock,
				).toHaveBeenCalledTimes(
					1,
				);

				await act(async () => {
					appStateChangeHandler?.(
						'active',
					);
				});

				expect(
					startAutoRefreshMock,
				).toHaveBeenCalledTimes(
					2,
				);
			},
		);

		test(
			'cleans up auth and app-state subscriptions when unmounted',
			async () => {
				const deferredSession =
					createDeferredSessionResult();

				getSessionMock
					.mockReturnValue(
						deferredSession.promise,
					);

				const {
					unmount,
				} = await render(
					<AuthenticationProvider>
						<AuthProbe />
					</AuthenticationProvider>,
				);

				await waitFor(() => {
					expect(
						getSessionMock,
					).toHaveBeenCalledTimes(
						1,
					);
				});

				await unmount();

				/*
				 * Finish the outstanding getSession() request only after
				 * unmounting. AuthenticationProvider should detect that
				 * it is no longer mounted and avoid updating React state.
				 */
				await act(async () => {
					deferredSession.resolve({
						data: {
							session: null,
						},
						error: null,
					});

					await deferredSession.promise;
				});

				expect(
					unsubscribeMock,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					appStateRemoveMock,
				).toHaveBeenCalledTimes(
					1,
				);

				expect(
					stopAutoRefreshMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);
	},
);