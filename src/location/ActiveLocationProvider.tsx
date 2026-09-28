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

import {
	useAuth,
} from '@/auth/AuthenticationProvider';

import {
	useProfilePreferences,
} from '@/profile/ProfilePreferencesProvider';

import type {
	LocationRecord,
} from '@/profile/profile-types';

import {
	loadLocalActiveLocation,
} from './active-location-storage';

import type {
	ActiveLocationStorageScope,
} from './active-location-storage';

import {
	persistConfirmedActiveLocation,
} from './active-location-persistence';

import type {
	ActiveLocationPersistenceResult,
} from './active-location-persistence';


export type ActiveLocationStatus =
	| 'loading'
	| 'ready'
	| 'error';


type ActiveLocationContextValue = {
	activeLocation: LocationRecord | null;
	status: ActiveLocationStatus;
	isLoading: boolean;

	confirmLocation: (
		location: LocationRecord,
	) => Promise<ActiveLocationPersistenceResult>;
};


type ActiveLocationProviderProps = {
	children: ReactNode;
};


const ActiveLocationContext =
	createContext<ActiveLocationContextValue | null>(
		null,
	);


/**
 * WHAT:
 * Provides the currently active curated Saudi location to the Ihtiyat
 * application.
 *
 * WHY:
 * Location is required by multiple features including preparedness missions,
 * hazard prioritisation, alerts and resources. Keeping it in a shared provider
 * prevents individual screens from maintaining conflicting location state.
 *
 * HOW:
 * Guest state is restored from guest-scoped SQLite storage. Authenticated
 * state may initially use its account-scoped local cache, but the loaded
 * Supabase profile remains canonical and replaces that cached value once the
 * profile data becomes available.
 */
export function ActiveLocationProvider({
	children,
}: ActiveLocationProviderProps) {
	const {
		user,
	} = useAuth();

	const {
		profile,
		locations,
		status: profileStatus,
		savePreferences,
	} = useProfilePreferences();


	const [
		activeLocation,
		setActiveLocation,
	] = useState<LocationRecord | null>(
		null,
	);


	const [
		status,
		setStatus,
	] = useState<ActiveLocationStatus>(
		'loading',
	);


	/*
	 * WHAT:
	 * Identifies the latest local-location restoration request.
	 *
	 * WHY:
	 * A user may sign in, sign out or switch account while an asynchronous
	 * SQLite read is still running.
	 *
	 * HOW:
	 * Each identity change increments the value. A completed request updates
	 * React state only when its captured request number is still current.
	 */
	const restoreRequestRef =
		useRef(
			0,
		);


	/**
	 * WHAT:
	 * Restores the location cached for the currently active identity scope.
	 *
	 * WHY:
	 * Guests rely on this value as their persistent location. Authenticated
	 * users can also recover an account-specific cached location while their
	 * canonical Supabase profile is still loading.
	 *
	 * HOW:
	 * The current authentication state determines which isolated SQLite key is
	 * read. Stale asynchronous results are ignored after identity changes.
	 */
	useEffect(() => {
		const requestId =
			restoreRequestRef.current + 1;

		restoreRequestRef.current =
			requestId;


		const scope:
			ActiveLocationStorageScope =
			user?.id
				? {
						type:
							'authenticated',

						userId:
							user.id,
					}
				: {
						type:
							'guest',
					};


		setActiveLocation(
			null,
		);

		setStatus(
			'loading',
		);


		const restoreLocation =
			async (): Promise<void> => {
				try {
					const storedLocation =
						await loadLocalActiveLocation(
							scope,
						);

					if (
						restoreRequestRef.current
						!== requestId
					) {
						return;
					}

					setActiveLocation(
						storedLocation,
					);

					setStatus(
						'ready',
					);
				} catch {
					if (
						restoreRequestRef.current
						!== requestId
					) {
						return;
					}

					setActiveLocation(
						null,
					);

					setStatus(
						'error',
					);
				}
			};


		void restoreLocation();
	}, [
		user?.id,
	]);


	/**
	 * WHAT:
	 * Reconciles authenticated local state with the canonical Supabase profile.
	 *
	 * WHY:
	 * Account-scoped SQLite is an offline/resilience cache only. A successfully
	 * loaded authenticated profile must therefore take precedence over a
	 * possibly older cached location.
	 *
	 * HOW:
	 * Once ProfilePreferencesProvider reports ready, active_location_id is
	 * matched against the already-loaded curated location catalogue. A null
	 * profile location clears the active authenticated location in memory.
	 */
	useEffect(() => {
		if (
			!user?.id
			|| profileStatus !== 'ready'
		) {
			return;
		}

        /*
         * WHAT:
         * Invalidates any account-scoped SQLite restoration that is still running.
         *
         * WHY:
         * Once the authenticated Supabase profile has loaded, it is canonical.
         * A slower local-cache read must not subsequently overwrite that profile
         * location with stale device data.
         *
         * HOW:
         * Advancing the request identifier causes any older restoration request to
         * fail its existing stale-request check before updating React state.
        */
        restoreRequestRef.current += 1;

		const activeLocationId =
			profile?.active_location_id
			?? null;


		if (
			activeLocationId === null
		) {
			setActiveLocation(
				null,
			);

			setStatus(
				'ready',
			);

			return;
		}


		const canonicalLocation =
			locations.find(
				(location) =>
					location.id
					=== activeLocationId,
			)
			?? null;


		setActiveLocation(
			canonicalLocation,
		);

		setStatus(
			canonicalLocation
				? 'ready'
				: 'error',
		);
	}, [
		user?.id,
		profile?.active_location_id,
		profileStatus,
		locations,
	]);


	/**
	 * WHAT:
	 * Confirms and persists a curated location chosen by the user.
	 *
	 * WHY:
	 * Automatic detection and manual selection must use one persistence path
	 * so guest and authenticated behaviour cannot drift apart.
	 *
	 * HOW:
	 * The existing persistence coordinator chooses guest SQLite persistence or
	 * authenticated Supabase-plus-cache persistence. React state changes only
	 * after the canonical persistence operation has completed successfully.
	 */
	const confirmLocation =
		useCallback(
			async (
				location: LocationRecord,
			): Promise<ActiveLocationPersistenceResult> => {

                /** 
                 * WHAT:
                 * Invalidates any location restoration still in progress.
                 *
                 * WHY:
                 * A location explicitly confirmed by the user must not later be replaced by
                 * the result of an older asynchronous cache read.
                 *
                 * HOW:
                 * The outstanding restore request becomes stale before persistence begins.
                */
                restoreRequestRef.current += 1;
				const result =
					await persistConfirmedActiveLocation(
						location,
						user?.id
							? {
									type:
										'authenticated',

									userId:
										user.id,

									savePreferences,
								}
							: {
									type:
										'guest',
								},
					);


				setActiveLocation(
					result.location,
				);

				setStatus(
					'ready',
				);


				return result;
			},
			[
				user?.id,
				savePreferences,
			],
		);


	const contextValue =
		useMemo<ActiveLocationContextValue>(
			() => ({
				activeLocation,
				status,
				isLoading:
					status === 'loading',
				confirmLocation,
			}),
			[
				activeLocation,
				status,
				confirmLocation,
			],
		);


	return (
		<ActiveLocationContext.Provider
			value={contextValue}
		>
			{children}
		</ActiveLocationContext.Provider>
	);
}


/**
 * WHAT:
 * Provides access to Ihtiyat's current active-location state.
 *
 * WHY:
 * Screens and feature services should consume one shared location rather than
 * deriving or restoring their own independent copies.
 *
 * HOW:
 * The hook reads ActiveLocationContext and guards against accidental use
 * outside ActiveLocationProvider.
 */
export function useActiveLocation():
	ActiveLocationContextValue {
	const context =
		useContext(
			ActiveLocationContext,
		);

	if (!context) {
		throw new Error(
			'useActiveLocation must be used within an ActiveLocationProvider.',
		);
	}

	return context;
}