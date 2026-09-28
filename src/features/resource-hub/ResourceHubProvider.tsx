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
	loadResourceHubFeature,
} from './resource-hub-feature-loader';

import type {
	ResourceHubLoadResult,
	ResourceHubLoadSource,
} from './resource-hub-feature-loader';

import type {
	ResourceHubCatalogue,
} from './resource-hub-types';


export type ResourceHubStatus =
	| 'loading'
	| 'ready'
	| 'error';


export type ResourceHubContextValue = {
	catalogue: ResourceHubCatalogue | null;

	source: ResourceHubLoadSource | null;

	status: ResourceHubStatus;

	isLoading: boolean;

	refresh: () => Promise<void>;
};


type ResourceHubProviderProps = {
	children: ReactNode;
};


const ResourceHubContext =
	createContext<ResourceHubContextValue | null>(
		null,
	);


/**
 * Provides Ihtiyat's public Resource Hub catalogue to the React application.
 *
 * The underlying feature loader owns the online-first Supabase read and V5
 * SQLite fallback. This provider owns only the currently accepted in-memory
 * catalogue, its source and React loading/error state.
 *
 * Resource relevance remains outside this provider. Topic filtering, active
 * hazard/location relevance and mission/quiz relationships will be derived
 * from the catalogue by pure selectors in the next layer.
*/
export function ResourceHubProvider({
	children,
}: ResourceHubProviderProps): ReactNode {
	const [
		snapshot,
		setSnapshot,
	] = useState<ResourceHubLoadResult | null>(
		null,
	);

	const [
		status,
		setStatus,
	] = useState<ResourceHubStatus>(
		'loading',
	);


	/*
	 * Protects React state from stale asynchronous loads.
	 *
	 * A manual refresh can begin while the initial catalogue request is still
	 * running. Only the latest request is allowed to update shared state.
	*/
	const loadRequestRef =
		useRef(
			0,
		);


	const loadCurrentCatalogue =
		useCallback(
			async (
				clearExistingData: boolean,
			): Promise<void> => {
				const requestId =
					loadRequestRef.current + 1;

				loadRequestRef.current =
					requestId;


				if (clearExistingData) {
					setSnapshot(
						null,
					);
				}


				setStatus(
					'loading',
				);


				try {
					const nextSnapshot =
						await loadResourceHubFeature();


					if (
						loadRequestRef.current
						!== requestId
					) {
						return;
					}


					setSnapshot(
						nextSnapshot,
					);

					setStatus(
						'ready',
					);
				} catch {
					if (
						loadRequestRef.current
						!== requestId
					) {
						return;
					}


					/*
					 * loadResourceHubFeature() has already attempted both the
					 * canonical Supabase catalogue and the coherent V5 SQLite
					 * fallback. If both fail, an older in-memory catalogue
					 * should not be represented as the current result.
					*/
					setSnapshot(
						null,
					);

					setStatus(
						'error',
					);
				}
			},
			[],
		);


	/*
	 * Resource Hub guidance is public and guest-safe, so initial catalogue
	 * loading does not wait for authentication, profile or location state.
	*/
	useEffect(() => {
		void loadCurrentCatalogue(
			true,
		);


		return () => {
			/*
			 * Invalidate an in-flight request when the provider unmounts.
			*/
			loadRequestRef.current += 1;
		};
	}, [
		loadCurrentCatalogue,
	]);


	/**
	 * Refreshes the complete public catalogue.
	 *
	 * Existing same-catalogue data can remain mounted while the request begins.
	 * The feature loader still returns one complete replacement snapshot from
	 * either remote or cache.
	*/
	const refresh =
		useCallback(
			async (): Promise<void> => {
				await loadCurrentCatalogue(
					false,
				);
			},
			[
				loadCurrentCatalogue,
			],
		);


	const contextValue =
		useMemo<ResourceHubContextValue>(
			() => ({
				catalogue:
					snapshot?.catalogue
					?? null,

				source:
					snapshot?.source
					?? null,

				status,

				isLoading:
					status === 'loading',

				refresh,
			}),
			[
				snapshot,
				status,
				refresh,
			],
		);


	return (
		<ResourceHubContext.Provider
			value={contextValue}
		>
			{children}
		</ResourceHubContext.Provider>
	);
}


/**
 * Provides access to the shared public Resource Hub catalogue.
 *
 * Consumers must be descendants of ResourceHubProvider so screens cannot
 * silently bypass the established online/offline loading boundary.
*/
export function useResourceHub():
	ResourceHubContextValue {
	const context =
		useContext(
			ResourceHubContext,
		);


	if (context === null) {
		throw new Error(
			'useResourceHub must be used within a ResourceHubProvider.',
		);
	}


	return context;
}