import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import type {
	ReactNode,
} from 'react';

import { useAuth } from '@/auth/AuthenticationProvider';

import {
	loadActiveLocations,
	loadProfilePreferences,
	loadSupportedLanguages,
	updateProfilePreferences,
} from './profile-service';

import type {
	LocationRecord,
	ProfilePreferences,
	ProfilePreferencesUpdate,
	SupportedLanguageRecord,
} from './profile-types';


export type ProfilePreferencesStatus =
	| 'idle'
	| 'loading'
	| 'ready'
	| 'error';


type ProfilePreferencesContextValue = {
	profile: ProfilePreferences | null;
	locations: LocationRecord[];
	supportedLanguages: SupportedLanguageRecord[];
	status: ProfilePreferencesStatus;
	isLoading: boolean;
	refresh: () => Promise<void>;
	savePreferences: (
		updates: ProfilePreferencesUpdate,
	) => Promise<ProfilePreferences>;
};


type ProfilePreferencesProviderProps = {
	children: ReactNode;
};


const ProfilePreferencesContext =
	createContext<ProfilePreferencesContextValue | null>(
		null,
	);


/**
 * Provides authenticated profile/preferences state to Ihtiyat.
 *
 * Supabase remains the canonical persistent store. This provider owns only the
 * application's current in-memory representation of that authenticated data.
 */
export function ProfilePreferencesProvider({
	children,
}: ProfilePreferencesProviderProps) {
	const {
		user,
	} = useAuth();

	const [
		profile,
		setProfile,
	] = useState<ProfilePreferences | null>(
		null,
	);

	const [
		locations,
		setLocations,
	] = useState<LocationRecord[]>(
		[],
	);

	const [
		supportedLanguages,
		setSupportedLanguages,
	] = useState<SupportedLanguageRecord[]>(
		[],
	);

	const [
		status,
		setStatus,
	] = useState<ProfilePreferencesStatus>(
		'idle',
	);


	/*
	 * Tracks the account that is currently active in React.
	 *
	 * Async requests may finish after an account switch. Checking this value
	 * before applying results prevents data from a previous account being
	 * written into the new account's in-memory state.
	 */
	const activeUserIdRef =
		useRef<string | null>(
			user?.id ?? null,
	);

	useEffect(() => {
		activeUserIdRef.current =
			user?.id ?? null;
	}, [
		user?.id,
	]);


	/**
	 * Clears all account-specific profile state.
	 *
	 * This is used when the user signs out and immediately when the active
	 * account changes, so data from one account is never displayed for another.
	 */
	const clearProfileState =
		useCallback((): void => {
			setProfile(null);
			setLocations([]);
			setSupportedLanguages([]);
		}, []);


	/**
	 * Refreshes the current account's profile and public reference catalogues.
	 */
	const refresh =
		useCallback(
			async (): Promise<void> => {
				const userId =
					user?.id;

				if (!userId) {
					clearProfileState();
					setStatus('idle');
					return;
				}

				setStatus('loading');

				try {
					const [
						nextProfile,
						nextLocations,
						nextSupportedLanguages,
					] = await Promise.all([
						loadProfilePreferences(
							userId,
						),
						loadActiveLocations(),
						loadSupportedLanguages(),
					]);

					/*
					 * Ignore a completed request if the authenticated account
					 * changed while it was running.
					 */
					if (
						activeUserIdRef.current
						!== userId
					) {
						return;
					}

					setProfile(
						nextProfile,
					);

					setLocations(
						nextLocations,
					);

					setSupportedLanguages(
						nextSupportedLanguages,
					);

					setStatus(
						'ready',
					);
				} catch {
					if (
						activeUserIdRef.current
						!== userId
					) {
						return;
					}

					setStatus(
						'error',
					);
				}
			},
			[
				user?.id,
				clearProfileState,
			],
		);


	/**
	 * A session/account change invalidates all previously loaded private
	 * profile state before data for the new account is requested.
	 */
	useEffect(() => {
		clearProfileState();

		if (!user?.id) {
			setStatus('idle');
			return;
		}

		void refresh();
	}, [
		user?.id,
		clearProfileState,
		refresh,
	]);


	/**
	 * Saves the supplied preferences for the authenticated account.
	 *
	 * The canonical row returned by Supabase replaces the local profile state
	 * only if the same account is still active when the request completes.
	 */
	const savePreferences =
		useCallback(
			async (
				updates: ProfilePreferencesUpdate,
			): Promise<ProfilePreferences> => {
				const userId =
					user?.id;

				if (!userId) {
					throw new Error(
						'An authenticated user is required to save profile preferences.',
					);
				}

				const savedProfile =
					await updateProfilePreferences(
						userId,
						updates,
					);

				if (
					activeUserIdRef.current
					=== userId
				) {
					setProfile(
						savedProfile,
					);

					setStatus(
						'ready',
					);
				}

				return savedProfile;
			},
			[
				user?.id,
			],
		);


	const contextValue =
		useMemo<ProfilePreferencesContextValue>(
			() => ({
				profile,
				locations,
				supportedLanguages,
				status,
				isLoading:
					status === 'loading',
				refresh,
				savePreferences,
			}),
			[
				profile,
				locations,
				supportedLanguages,
				status,
				refresh,
				savePreferences,
			],
		);


	return (
		<ProfilePreferencesContext.Provider
			value={contextValue}
		>
			{children}
		</ProfilePreferencesContext.Provider>
	);
}


/**
 * Provides access to authenticated profile/preferences state.
 */
export function useProfilePreferences():
	ProfilePreferencesContextValue {
	const context =
		useContext(
			ProfilePreferencesContext,
		);

	if (!context) {
		throw new Error(
			'useProfilePreferences must be used within a ProfilePreferencesProvider.',
		);
	}

	return context;
}