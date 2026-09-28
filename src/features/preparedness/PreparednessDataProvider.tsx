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
    useActiveLocation,
} from '@/location/ActiveLocationProvider';

import type {
    LocationRecord,
} from '@/profile/profile-types';

import {
    loadPreparednessFeatureSnapshot,
} from './preparedness-feature-loader';

import type {
    PreparednessFeatureSnapshot,
} from './preparedness-feature-loader';

import type {
    PreparednessMissionResolution,
    PreparednessResolvedHazard,
} from './preparedness-types';


export type PreparednessDataStatus =
    | 'loading'
    | 'ready'
    | 'error';


type PreparednessDataContextValue = {
    activeLocation: LocationRecord | null;
    missions: PreparednessMissionResolution[];
    resolvedHazards: PreparednessResolvedHazard[] | null;
    status: PreparednessDataStatus;
    isLoading: boolean;
    refresh: () => Promise<void>;
};


type PreparednessDataProviderProps = {
    children: ReactNode;
};


const PreparednessDataContext =
    createContext<PreparednessDataContextValue | null>(
        null,
    );


/**
 * WHAT:
 * Provides the current location-aware preparedness catalogue to the Ihtiyat
 * application.
 *
 * WHY:
 * Preparedness screens should consume one shared React data source rather than
 * independently loading missions, tasks and location hazards. The underlying
 * feature loader coordinates the canonical online services and SQLite fallback,
 * while this provider owns only their current in-memory React state.
 *
 * HOW:
 * The provider:
 * - consumes the confirmed curated location from ActiveLocationProvider;
 * - waits for active-location restoration to finish before loading;
 * - calls loadPreparednessFeatureSnapshot() for that location;
 * - exposes missions, resolved hazards, loading/error state and refresh();
 * - reloads automatically whenever the shared active location changes;
 * - rejects stale asynchronous results so an older location request cannot
 *   overwrite newer preparedness state.
 *
 * SQLite preparedness caching is deliberately owned by the feature-loader and
 * repository layers rather than React state. Personal progress synchronisation,
 * quiz progress and achievement state also remain separate concerns and will be
 * handled by their own authenticated feature layers.
*/
export function PreparednessDataProvider({
    children,
}: PreparednessDataProviderProps) {
    const {
        activeLocation,
        isLoading:
            isActiveLocationLoading,
    } = useActiveLocation();


    const [
        snapshot,
        setSnapshot,
    ] = useState<PreparednessFeatureSnapshot | null>(
        null,
    );


    const [
        status,
        setStatus,
    ] = useState<PreparednessDataStatus>(
        'loading',
    );


    /*
     * WHAT:
     * Identifies the latest preparedness-data load request.
     *
     * WHY:
     * A user can change their active location while an earlier catalogue or
     * hazard request is still running. Without a stale-request guard, the older
     * result could arrive last and replace data belonging to the new location.
     *
     * HOW:
     * Every load receives a monotonically increasing request ID. A completed
     * request may update React state only while its ID is still current.
     */
    const loadRequestRef =
        useRef(
            0,
        );


    /**
     * WHAT:
     * Loads one coherent preparedness snapshot for the current shared location.
     *
     * WHY:
     * The feature loader is the single coordination boundary for online catalogue
     * data, location hazards, SQLite fallback and adaptive mission resolution.
     * Keeping that work out of the provider prevents React state code from
     * reimplementing domain or persistence rules.
     *
     * HOW:
     * Automatic location changes request a clean load so content from the previous
     * location disappears immediately. An explicit refresh may temporarily
     * preserve the current same-location snapshot while the request runs.
     *
     * The shared feature loader performs its own online-first, cache-fallback
     * strategy. Therefore a rejected request means that it could not produce a
     * coherent preparedness snapshot from the available sources.
    */
    const loadCurrentPreparednessData =
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


                /*
                 * ActiveLocationProvider may still be restoring guest SQLite
                 * state or reconciling an authenticated profile. Loading with
                 * a temporary null location here would cause an unnecessary
                 * national-only snapshot followed immediately by another load.
                 */
                if (isActiveLocationLoading) {
                    setStatus(
                        'loading',
                    );

                    return;
                }


                setStatus(
                    'loading',
                );


                try {
                    const nextSnapshot =
                        await loadPreparednessFeatureSnapshot(
                            activeLocation,
                        );


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
                     * WHAT:
                     * Removes preparedness data when the shared loader cannot produce a coherent
                     * snapshot for the current request.
                     *
                     * WHY:
                     * The feature loader has already attempted its supported SQLite fallback before
                     * rejecting. Retaining an older in-memory snapshot here could therefore present
                     * stale or location-mismatched content as though it were current.
                     *
                     * HOW:
                     * The provider clears the snapshot and exposes error state. If a sufficient
                     * cached preparedness payload had existed, the feature loader would already
                     * have returned it successfully and this branch would not run.
                    */
                    setSnapshot(
                        null,
                    );

                    setStatus(
                        'error',
                    );
                }
            },
            [
                activeLocation,
                isActiveLocationLoading,
            ],
        );


    /**
     * WHAT:
     * Re-fetches preparedness data for the currently active location.
     *
     * WHY:
     * Screens need one supported retry/refresh entry point instead of calling
     * the feature loader directly and bypassing provider state.
     *
     * HOW:
     * Existing same-location data remains visible while the request starts.
     * The shared loader still produces the complete replacement snapshot.
     */
    const refresh =
        useCallback(
            async (): Promise<void> => {
                await loadCurrentPreparednessData(
                    false,
                );
            },
            [
                loadCurrentPreparednessData,
            ],
        );


    /**
     * WHAT:
     * Keeps preparedness data aligned with the shared active location.
     *
     * WHY:
     * ActiveLocationProvider is the application's single location source of
     * truth. A confirmed location change must therefore invalidate the old
     * preparedness snapshot and resolve the missions again.
     *
     * HOW:
     * The effect performs a clean load whenever the active-location dependency
     * changes. Cleanup advances the request ID so an in-flight request cannot
     * update state after a location change or provider unmount.
     */
    useEffect(() => {
        void loadCurrentPreparednessData(
            true,
        );


        return () => {
            loadRequestRef.current += 1;
        };
    }, [
        loadCurrentPreparednessData,
    ]);


    const contextValue =
        useMemo<PreparednessDataContextValue>(
            () => ({
                activeLocation,
                missions:
                    snapshot?.missions
                    ?? [],
                resolvedHazards:
                    snapshot?.resolvedHazards
                    ?? null,
                status,
                isLoading:
                    status === 'loading',
                refresh,
            }),
            [
                activeLocation,
                snapshot,
                status,
                refresh,
            ],
        );


    return (
        <PreparednessDataContext.Provider
            value={contextValue}
        >
            {children}
        </PreparednessDataContext.Provider>
    );
}


/**
 * WHAT:
 * Provides access to the current preparedness data state.
 *
 * WHY:
 * Feature screens should not know how catalogue loading, location hazards or
 * adaptive mission resolution are orchestrated.
 *
 * HOW:
 * The hook reads PreparednessDataContext and guards against use outside the
 * provider hierarchy.
 */
export function usePreparednessData():
    PreparednessDataContextValue {
    const context =
        useContext(
            PreparednessDataContext,
        );


    if (!context) {
        throw new Error(
            'usePreparednessData must be used within a PreparednessDataProvider.',
        );
    }


    return context;
}
