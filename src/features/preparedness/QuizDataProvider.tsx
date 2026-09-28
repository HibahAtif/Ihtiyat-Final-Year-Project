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
    loadQuizFeatureCatalogue,
} from './quiz-feature-loader';

import {
    loadUserQuizProgress,
    submitQuizAnswer,
} from './quiz-service';

import type {
    QuizCatalogue,
    QuizOption,
    QuizQuestion,
    QuizSubmissionResult,
    UserQuizProgress,
} from './quiz-types';


export type QuizCatalogueStatus =
    | 'loading'
    | 'ready'
    | 'error';


export type QuizProgressStatus =
    | 'loading'
    | 'idle'
    | 'ready'
    | 'error';


export type QuizDataContextValue = {
    questions:
        QuizQuestion[];

    options:
        QuizOption[];

    progress:
        UserQuizProgress[];

    catalogueStatus:
        QuizCatalogueStatus;

    progressStatus:
        QuizProgressStatus;

    isCatalogueLoading:
        boolean;

    isProgressLoading:
        boolean;

    refresh:
        () => Promise<void>;

    submitAnswer:
        (
            questionId: number,
            optionIds: number[],
        ) => Promise<QuizSubmissionResult>;
};


type QuizDataProviderProps = {
    children:
        ReactNode;
};


type AccountQuizProgressSnapshot = {
    userId:
        string;

    progress:
        UserQuizProgress[];
};


const QuizDataContext =
    createContext<
        QuizDataContextValue
        | null
    >(
        null,
    );


/**
 * WHAT:
 * Provides the public Quiz catalogue and optional authenticated Quiz progress
 * to Ihtiyat's React application layer.
 *
 * WHY:
 * Quiz content and Quiz progress have deliberately different access rules.
 *
 * Public questions and answer options belong to the preparedness experience
 * and must remain available to guests. Their loader already owns the
 * online-first Supabase read and SQLite fallback policy.
 *
 * Quiz progress, however, belongs to a specific authenticated account and must
 * never leak between users or become a requirement for reading public
 * learning content.
 *
 * HOW:
 * The provider therefore maintains two independent state flows:
 *
 * - public catalogue state loads immediately and does not wait for
 *   AuthenticationProvider;
 * - private progress state waits for authentication restoration and is loaded
 *   only for the current authenticated account.
 *
 * Separate request counters prevent stale public or private requests from
 * overwriting newer state. Private snapshots also retain the owning user ID so
 * account switching and sign-out cannot expose progress from a previous user.
 */
export function QuizDataProvider({
    children,
}: QuizDataProviderProps):
    ReactNode {
    const {
        user,
        isLoading:
            isAuthenticationLoading,
    } = useAuth();


    const authenticatedUserId =
        user?.id
        ?? null;


    const [
        catalogue,
        setCatalogue,
    ] = useState<QuizCatalogue | null>(
        null,
    );


    const [
        catalogueStatus,
        setCatalogueStatus,
    ] = useState<QuizCatalogueStatus>(
        'loading',
    );


    const [
        progressSnapshot,
        setProgressSnapshot,
    ] = useState<
        AccountQuizProgressSnapshot
        | null
    >(
        null,
    );


    const [
        progressStatus,
        setProgressStatus,
    ] = useState<QuizProgressStatus>(
        'loading',
    );


    /*
     * WHAT:
     * Identifies the latest public Quiz catalogue request.
     *
     * WHY:
     * A manual refresh could finish after a newer request. Without a guard, an
     * older result could overwrite the most recent catalogue state.
     *
     * HOW:
     * Every public load receives a monotonically increasing request ID. Only
     * the latest request may update React state.
     */
    const catalogueRequestRef =
        useRef(
            0,
        );


    /*
     * WHAT:
     * Identifies the latest private Quiz progress request.
     *
     * WHY:
     * Authentication can change while a progress request is running. Private
     * state requires its own stale-request guard independently from the public
     * catalogue.
     */
    const progressRequestRef =
        useRef(
            0,
        );


    /*
     * WHAT:
     * Tracks the authenticated account from the latest render.
     *
     * WHY:
     * Promise callbacks capture values from the render in which they started.
     * A user can sign out or switch accounts before a Quiz progress request or
     * answer submission finishes.
     *
     * HOW:
     * Async completions compare their captured account with this current ref
     * before starting account-owned follow-up work.
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
     * Loads the public Quiz catalogue.
     *
     * WHY:
     * Public questions and answer options are guest-safe preparedness content
     * and therefore must not depend on authentication restoration.
     *
     * HOW:
     * quiz-feature-loader.ts performs the canonical Supabase read and supported
     * SQLite fallback. A rejected loader call therefore means neither source
     * produced a usable catalogue.
     */
    const loadCurrentCatalogue =
        useCallback(
            async (
                clearExistingData:
                    boolean,
            ): Promise<void> => {
                const requestId =
                    catalogueRequestRef.current
                    + 1;


                catalogueRequestRef.current =
                    requestId;


                if (
                    clearExistingData
                ) {
                    setCatalogue(
                        null,
                    );
                }


                setCatalogueStatus(
                    'loading',
                );


                try {
                    const nextCatalogue =
                        await loadQuizFeatureCatalogue();


                    if (
                        catalogueRequestRef.current
                        !== requestId
                    ) {
                        return;
                    }


                    setCatalogue(
                        nextCatalogue,
                    );


                    setCatalogueStatus(
                        'ready',
                    );
                } catch {
                    if (
                        catalogueRequestRef.current
                        !== requestId
                    ) {
                        return;
                    }


                    /*
                     * The Quiz feature loader has already attempted its SQLite
                     * fallback. If it still rejects, retaining an older
                     * in-memory snapshot could make unavailable or obsolete
                     * content appear current.
                     */
                    setCatalogue(
                        null,
                    );


                    setCatalogueStatus(
                        'error',
                    );
                }
            },
            [],
        );


    /**
     * WHAT:
     * Loads private Quiz progress for the current authenticated account.
     *
     * WHY:
     * Quiz history is account-owned data. Guests should see no persistent
     * progress, while authenticated users should see only their own rows.
     *
     * HOW:
     * Authentication restoration is allowed to continue independently from the
     * public Quiz catalogue. Once restoration finishes:
     *
     * - guests receive empty idle state without a private database request;
     * - authenticated users load their own progress;
     * - stale results are discarded if the account changes before completion.
     */
    const loadCurrentProgress =
        useCallback(
            async (
                clearExistingData:
                    boolean,
            ): Promise<void> => {
                const requestId =
                    progressRequestRef.current
                    + 1;


                progressRequestRef.current =
                    requestId;


                if (
                    clearExistingData
                ) {
                    setProgressSnapshot(
                        null,
                    );
                }


                if (
                    isAuthenticationLoading
                ) {
                    setProgressStatus(
                        'loading',
                    );

                    return;
                }


                if (
                    authenticatedUserId
                    === null
                ) {
                    setProgressSnapshot(
                        null,
                    );


                    setProgressStatus(
                        'idle',
                    );

                    return;
                }


                const requestedUserId =
                    authenticatedUserId;


                setProgressStatus(
                    'loading',
                );


                try {
                    const nextProgress =
                        await loadUserQuizProgress(
                            requestedUserId,
                        );


                    if (
                        progressRequestRef.current
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


                    setProgressSnapshot({
                        userId:
                            requestedUserId,

                        progress:
                            nextProgress,
                    });


                    setProgressStatus(
                        'ready',
                    );
                } catch {
                    if (
                        progressRequestRef.current
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
                     * Do not retain private progress whose current validity
                     * could not be established.
                     *
                     * Public Quiz content remains completely independent and
                     * may continue to be ready.
                     */
                    setProgressSnapshot(
                        null,
                    );


                    setProgressStatus(
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
     * Refreshes both halves of the Quiz feature.
     *
     * WHY:
     * Screens should use one supported refresh entry point rather than calling
     * public and private services independently.
     *
     * HOW:
     * Public catalogue and current-account progress are refreshed concurrently.
     * For a guest, the private branch resolves to idle without issuing a
     * user-progress query.
     */
    const refresh =
        useCallback(
            async (): Promise<void> => {
                await Promise.all([
                    loadCurrentCatalogue(
                        false,
                    ),

                    loadCurrentProgress(
                        false,
                    ),
                ]);
            },
            [
                loadCurrentCatalogue,
                loadCurrentProgress,
            ],
        );


    /**
     * WHAT:
     * Submits one Quiz answer through the server-authoritative Quiz RPC.
     *
     * WHY:
     * Correctness, protected explanations and correct option IDs must continue
     * to come from Supabase. The React layer must never calculate correctness
     * locally or queue a fabricated Quiz attempt.
     *
     * Guests are still allowed to receive immediate learning feedback, while
     * authenticated users additionally receive persisted progress.
     *
     * HOW:
     * The answer is submitted unchanged to quiz-service.ts. If the RPC reports
     * that authenticated progress was recorded, the provider reloads private
     * progress only when the same account is still active.
     *
     * Submission failures deliberately propagate to the screen so it can
     * explain that a connection is required to check the answer.
     */
    const submitAnswer =
        useCallback(
            async (
                questionId:
                    number,
                optionIds:
                    number[],
            ): Promise<QuizSubmissionResult> => {
                const submissionUserId =
                    authenticatedUserId;


                const result =
                    await submitQuizAnswer(
                        questionId,
                        optionIds,
                    );


                if (
                    result.progress_recorded
                    && submissionUserId
                    !== null
                    && authenticatedUserIdRef.current
                    === submissionUserId
                ) {
                    await loadCurrentProgress(
                        false,
                    );
                }


                return result;
            },
            [
                authenticatedUserId,
                loadCurrentProgress,
            ],
        );


    /**
     * WHAT:
     * Loads public Quiz content when this provider mounts.
     *
     * WHY:
     * Public content must not wait for AuthenticationProvider to finish session
     * restoration.
     *
     * HOW:
     * This effect depends only on the public catalogue loader. Cleanup advances
     * its request ID so an unmounted provider cannot accept a late result.
     */
    useEffect(() => {
        void loadCurrentCatalogue(
            true,
        );


        return () => {
            catalogueRequestRef.current += 1;
        };
    }, [
        loadCurrentCatalogue,
    ]);


    /**
     * WHAT:
     * Keeps private Quiz progress aligned with authentication state.
     *
     * WHY:
     * Quiz progress belongs to one account. Authentication restoration,
     * sign-out and account switching therefore affect private progress but must
     * not trigger or block public catalogue loading.
     *
     * HOW:
     * Authentication changes perform a clean private-state load. Cleanup makes
     * any request started for the previous authentication state stale.
     */
    useEffect(() => {
        void loadCurrentProgress(
            true,
        );


        return () => {
            progressRequestRef.current += 1;
        };
    }, [
        loadCurrentProgress,
    ]);


    /*
     * Never expose a private snapshot unless it belongs to the account from the
     * current render. This provides an additional privacy boundary before the
     * authentication-change effect has even had an opportunity to run.
     */
    const currentProgress =
        progressSnapshot?.userId
            === authenticatedUserId
            ? progressSnapshot.progress
            : [];


    const contextValue =
        useMemo<QuizDataContextValue>(
            () => ({
                questions:
                    catalogue?.questions
                    ?? [],

                options:
                    catalogue?.options
                    ?? [],

                progress:
                    currentProgress,

                catalogueStatus,

                progressStatus,

                isCatalogueLoading:
                    catalogueStatus
                    === 'loading',

                isProgressLoading:
                    progressStatus
                    === 'loading',

                refresh,

                submitAnswer,
            }),
            [
                catalogue,
                currentProgress,
                catalogueStatus,
                progressStatus,
                refresh,
                submitAnswer,
            ],
        );


    return (
        <QuizDataContext.Provider
            value={contextValue}
        >
            {children}
        </QuizDataContext.Provider>
    );
}


/**
 * WHAT:
 * Provides access to the current Quiz application state.
 *
 * WHY:
 * Quiz screens should not know how Supabase catalogue loading, SQLite fallback,
 * authentication, private progress or answer submission are coordinated.
 *
 * HOW:
 * The hook reads QuizDataContext and guards against accidental use outside the
 * provider hierarchy.
 */
export function useQuizData():
    QuizDataContextValue {
    const context =
        useContext(
            QuizDataContext,
        );


    if (
        !context
    ) {
        throw new Error(
            'useQuizData must be used within a QuizDataProvider.',
        );
    }


    return context;
}