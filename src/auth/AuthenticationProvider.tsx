import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {
	AppState,
	AppStateStatus,
	Platform,
} from 'react-native';
import {
	Session,
	User,
} from '@supabase/supabase-js';

import { supabaseClient } from '../lib/supabase-config';

type AuthContextValue = {
	session: Session | null;
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
};

type AuthenticationProviderProps = {
	children: ReactNode;
};

const AuthContext =
	createContext<AuthContextValue | null>(null);

/**
 * Provides the current Supabase authentication state to the application.
 *
 * A null session represents either a signed-out user or a guest.
 * Guest access is therefore handled without creating a Supabase user.
 */
export function AuthenticationProvider({
	children,
}: AuthenticationProviderProps) {
	const [session, setSession] =
		useState<Session | null>(null);

	const [isLoading, setIsLoading] =
		useState(true);

	useEffect(() => {
		let isMounted = true;

		const initialiseSession = async () => {
			const {
				data,
				error,
			} = await supabaseClient.auth.getSession();

			if (!isMounted) {
				return;
			}

			if (error) {
				console.error(
					'[Ihtiyat auth] Failed to restore session:',
					error.message,
				);
			}

			setSession(data.session);

			setIsLoading(false);
		};

		void initialiseSession();

		const {
			data: {
				subscription,
			},
		} = supabaseClient.auth.onAuthStateChange(
			(_event, nextSession) => {
				if (!isMounted) {
					return;
				}

				setSession(nextSession);
				setIsLoading(false);
			},
		);

		return () => {
			isMounted = false;
			subscription.unsubscribe();
		};
	}, []);

	useEffect(() => {
		if (Platform.OS === 'web') {
			return;
		}

		const handleAppStateChange = (
			state: AppStateStatus,
		) => {
			if (state === 'active') {
				supabaseClient.auth.startAutoRefresh();
			} else {
				supabaseClient.auth.stopAutoRefresh();
			}
		};

		handleAppStateChange(AppState.currentState);

		const subscription =
			AppState.addEventListener(
				'change',
				handleAppStateChange,
			);

		return () => {
			subscription.remove();
			supabaseClient.auth.stopAutoRefresh();
		};
	}, []);

	const contextValue =
		useMemo<AuthContextValue>(
			() => ({
				session,
				user: session?.user ?? null,
				isAuthenticated: session !== null,
				isLoading,
			}),
			[
				session,
				isLoading,
			],
		);

	return (
		<AuthContext.Provider value={contextValue}>
			{children}
		</AuthContext.Provider>
	);
}

/**
 * Central hook for reading Ihtiyat's authentication state.
 */
export function useAuth(): AuthContextValue {
	const context =
		useContext(AuthContext);

	if (!context) {
		throw new Error(
			'useAuth must be used within an AuthenticationProvider.',
		);
	}

	return context;
}