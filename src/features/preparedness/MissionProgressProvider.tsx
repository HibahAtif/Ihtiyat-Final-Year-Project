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
    loadResilientMissionTaskProgress,
} from './mission-progress-loader';

import {
    setResilientMissionTaskCompletion,
} from './mission-progress-sync-service';

import type {
    ResilientMissionTaskProgress,
} from './mission-progress-loader';

import type {
    LocalMissionTaskProgress,
} from './mission-progress-local-repository';


export type MissionProgressStatus =
    | 'loading'
    | 'idle'
    | 'ready'
    | 'error';


type MissionProgressContextValue = {
    progress:
        LocalMissionTaskProgress[];

    pendingTaskIds:
        number[];

    status:
        MissionProgressStatus;

    isLoading:
        boolean;

    refresh:
        () => Promise<void>;

    setTaskCompletion:
        (
            taskId: number,
            isCompleted: boolean,
        ) => Promise<boolean>;
};


type MissionProgressProviderProps = {
    children:
        ReactNode;
};


type AccountProgressSnapshot = {
    userId: string;

    data:
        ResilientMissionTaskProgress;
};


const MissionProgressContext =
    createContext<
        MissionProgressContextValue
        | null
    >(
        null,
    );


/**
 * WHAT:
 * Provides authenticated mission/checklist progress to Ihtiyat's React
 * application layer.
 *
 * WHY:
 * Public preparedness content is available to guests, but persistent task
 * progress belongs only to authenticated accounts. Mission screens therefore
 * need a separate private state boundary rather than mixing account progress
 * into PreparednessDataProvider.
 *
 * HOW:
 * The provider:
 * - waits for authentication restoration before loading private state;
 * - exposes no persistent progress for guests;
 * - loads authenticated progress through the resilient mission-progress
 *   loader;
 * - persists task changes through the local-first synchronisation service;
 * - reloads progress after a successful local task mutation;
 * - clears account-owned state when the authenticated user changes or signs
 *   out;
 * - rejects stale asynchronous results from an older account.
 */
export function MissionProgressProvider({
    children,
}: MissionProgressProviderProps) {
    const {
        user,
        isLoading:
            isAuthenticationLoading,
    } = useAuth();


    const authenticatedUserId =
        user?.id
        ?? null;


    const [
        snapshot,
        setSnapshot,
    ] = useState<
        AccountProgressSnapshot
        | null
    >(
        null,
    );


    const [
        status,
        setStatus,
    ] = useState<MissionProgressStatus>(
        'loading',
    );


    /**
     * Tracks the latest load request so progress from an old account cannot
     * overwrite state belonging to a newer authenticated account.
     */
    const loadRequestRef =
        useRef(
            0,
        );


    /**
     * Tracks the account from the latest render.
     *
     * This is also checked after asynchronous task mutations so a mutation
     * started for one account cannot trigger a later reload for another
     * account after sign-out or account switching.
     */
    const authenticatedUserIdRef =
        useRef<
            string
            | null
        >(
            authenticatedUserId,
        );

    authenticatedUserIdRef.current =
        authenticatedUserId;


    /**
     * WHAT:
     * Loads one coherent mission-progress snapshot for the current
     * authenticated account.
     *
     * WHY:
     * The resilient loader already owns remote loading, pending-outbox replay,
     * SQLite fallback and local-intent protection. React state should not
     * duplicate those persistence rules.
     *
     * HOW:
     * A clean load removes state belonging to the previous account. Refreshes
     * may preserve current same-account data while loading. Each request is
     * assigned an ID so a late result cannot replace newer account state.
     */
    const loadCurrentMissionProgress =
        useCallback(
            async (
                clearExistingData:
                    boolean,
            ): Promise<void> => {
                const requestId =
                    loadRequestRef.current
                    + 1;

                loadRequestRef.current =
                    requestId;


                if (
                    clearExistingData
                ) {
                    setSnapshot(
                        null,
                    );
                }


                if (
                    isAuthenticationLoading
                ) {
                    setStatus(
                        'loading',
                    );

                    return;
                }


                if (
                    authenticatedUserId
                    === null
                ) {
                    setSnapshot(
                        null,
                    );

                    setStatus(
                        'idle',
                    );

                    return;
                }


                const requestedUserId =
                    authenticatedUserId;


                setStatus(
                    'loading',
                );


                try {
                    const nextProgress =
                        await loadResilientMissionTaskProgress(
                            requestedUserId,
                        );


                    if (
                        loadRequestRef.current
                        !== requestId
                    ) {
                        return;
                    }


                    if (
                        authenticatedUserIdRef.current
                        !== requestedUserId
                    ) {
                        return;
                    }


                    setSnapshot({
                        userId:
                            requestedUserId,

                        data:
                            nextProgress,
                    });

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


                    if (
                        authenticatedUserIdRef.current
                        !== requestedUserId
                    ) {
                        return;
                    }


                    /*
                     * A rejected resilient load means neither the supported
                     * remote path nor its valid local fallback produced usable
                     * progress, or an integrity failure occurred.
                     *
                     * Do not retain private progress whose current validity can
                     * no longer be established.
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
                authenticatedUserId,
                isAuthenticationLoading,
            ],
        );


    /**
     * WHAT:
     * Reloads mission progress for the currently authenticated account.
     *
     * WHY:
     * Screens need one supported refresh boundary rather than calling the
     * resilient loader directly.
     *
     * HOW:
     * Existing same-account progress may remain visible while the resilient
     * loader obtains the replacement state.
     */
    const refresh =
        useCallback(
            async (): Promise<void> => {
                await loadCurrentMissionProgress(
                    false,
                );
            },
            [
                loadCurrentMissionProgress,
            ],
        );


    /**
     * WHAT:
     * Persists one mission-task completion change for the authenticated user.
     *
     * WHY:
     * Guests may consume preparedness content but do not receive persistent
     * mission/checklist progress. Authenticated mutations must use the
     * local-first synchronisation service so changes remain durable during
     * temporary connectivity failure.
     *
     * HOW:
     * The current account identity is captured, the resilient mutation is
     * performed with a precise queue timestamp, and progress is then reloaded
     * only if the same account is still active.
     *
     * The returned boolean retains the sync-service meaning:
     * true means this exact change was canonicalised by Supabase;
     * false means it is durable locally but still pending synchronisation.
     */
    const setTaskCompletion =
        useCallback(
            async (
                taskId: number,
                isCompleted: boolean,
            ): Promise<boolean> => {
                if (
                    authenticatedUserId
                    === null
                ) {
                    throw new Error(
                        'Mission progress can only be saved for an authenticated user.',
                    );
                }


                const mutationUserId =
                    authenticatedUserId;

                const queuedAt =
                    new Date()
                        .toISOString();


                const synced =
                    await setResilientMissionTaskCompletion(
                        mutationUserId,
                        taskId,
                        isCompleted,
                        queuedAt,
                    );


                /*
                 * The account may have changed while the asynchronous
                 * persistence operation was running. Do not start an old-user
                 * reload after a sign-out or account switch.
                 */
                if (
                    authenticatedUserIdRef.current
                    !== mutationUserId
                ) {
                    return synced;
                }


                await loadCurrentMissionProgress(
                    false,
                );


                return synced;
            },
            [
                authenticatedUserId,
                loadCurrentMissionProgress,
            ],
        );


    /**
     * WHAT:
     * Keeps private mission progress aligned with authentication state.
     *
     * WHY:
     * Progress belongs to one account. Signing out or switching accounts must
     * invalidate the previous account's in-memory data immediately and prevent
     * late requests from restoring it.
     *
     * HOW:
     * Authentication changes trigger a clean load. Cleanup advances the
     * request ID so any request started by the previous render becomes stale.
     */
    useEffect(() => {
        void loadCurrentMissionProgress(
            true,
        );


        return () => {
            loadRequestRef.current += 1;
        };
    }, [
        loadCurrentMissionProgress,
    ]);


    /*
     * Even before the authentication-change effect has executed, never expose
     * a snapshot unless it belongs to the account from the current render.
     *
     * This provides an additional privacy boundary during sign-out and account
     * switching.
     */
    const currentSnapshot =
        snapshot?.userId
            === authenticatedUserId
            ? snapshot.data
            : null;


    const contextValue =
        useMemo<MissionProgressContextValue>(
            () => ({
                progress:
                    currentSnapshot
                        ?.progress
                    ?? [],

                pendingTaskIds:
                    currentSnapshot
                        ?.pendingTaskIds
                    ?? [],

                status,

                isLoading:
                    status
                    === 'loading',

                refresh,

                setTaskCompletion,
            }),
            [
                currentSnapshot,
                status,
                refresh,
                setTaskCompletion,
            ],
        );


    return (
        <MissionProgressContext.Provider
            value={contextValue}
        >
            {children}
        </MissionProgressContext.Provider>
    );
}


/**
 * WHAT:
 * Provides access to the current authenticated mission-progress state.
 *
 * WHY:
 * Mission screens should not know how Supabase, SQLite, the progress outbox or
 * account-switch protection are coordinated.
 *
 * HOW:
 * The hook reads MissionProgressContext and guards against use outside the
 * provider hierarchy.
 */
export function useMissionProgress():
    MissionProgressContextValue {
    const context =
        useContext(
            MissionProgressContext,
        );


    if (!context) {
        throw new Error(
            'useMissionProgress must be used within a MissionProgressProvider.',
        );
    }


    return context;
}