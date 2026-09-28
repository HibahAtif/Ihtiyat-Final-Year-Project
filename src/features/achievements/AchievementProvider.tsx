import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import type { ReactNode } from 'react';

import { useAuth } from '@/auth/AuthenticationProvider';

import {
	loadActiveAchievements,
	loadUserAchievements,
} from './achievement-service';

import type {
	AchievementDefinition,
	EarnedAchievement,
	UserAchievement,
} from './achievement-types';


export type AchievementCatalogueStatus =
	| 'loading'
	| 'ready'
	| 'error';


export type EarnedAchievementStatus =
	| 'loading'
	| 'idle'
	| 'ready'
	| 'error';


export type AchievementContextValue = {
	definitions: AchievementDefinition[];
	earnedAchievements: EarnedAchievement[];

	catalogueStatus: AchievementCatalogueStatus;
	earnedStatus: EarnedAchievementStatus;

	isCatalogueLoading: boolean;
	isEarnedLoading: boolean;

	refresh: () => Promise<void>;
};


type AchievementProviderProps = {
	children: ReactNode;
};


const AchievementContext =
	createContext<AchievementContextValue | null>(null);


/**
 * WHAT:
 * Coordinates public achievement definitions and private earned-achievement
 * state for the currently authenticated account.
 *
 * WHY:
 * Achievement definitions are public catalogue data, while earned achievements
 * are private account-owned progress. Keeping those concerns independent means
 * public achievement information remains usable even if authentication is still
 * restoring or a private achievement request fails.
 *
 * HOW:
 * The provider:
 * - loads the active public achievement catalogue independently of auth;
 * - waits for auth restoration before requesting private awards;
 * - never requests private awards for guests;
 * - combines private award rows with their corresponding public definitions;
 * - hides stale private data immediately when the account changes;
 * - ignores late responses belonging to an older account/request;
 * - exposes read-only state because achievement awarding belongs entirely to
 *   trusted PostgreSQL logic.
 */
export function AchievementProvider({
	children,
}: AchievementProviderProps): ReactNode {
	const { user, isLoading: isAuthLoading } = useAuth();

	const currentUserId = user?.id ?? null;

	const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
	const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);

	const [catalogueStatus, setCatalogueStatus] =
		useState<AchievementCatalogueStatus>('loading');

	const [privateStatus, setPrivateStatus] =
		useState<EarnedAchievementStatus>('loading');

	/*
	 * Records which account owns the currently stored private rows.
	 *
	 * This is deliberately separate from currentUserId. If React renders after
	 * an account switch but before the new request effect runs, awards belonging
	 * to the previous account are still hidden immediately.
	 */
	const [privateOwnerId, setPrivateOwnerId] = useState<string | null>(null);

	/*
	 * Request counters invalidate stale asynchronous responses.
	 *
	 * This protects against cases such as:
	 * User A request starts → account changes to User B → B finishes first →
	 * delayed A response arrives afterwards.
	 */
	const catalogueRequestIdRef = useRef(0);
	const privateRequestIdRef = useRef(0);

	/*
	 * Keep the latest account ID available to asynchronous callbacks without
	 * making those callbacks dependent on a captured, potentially stale render.
	 */
	const currentUserIdRef = useRef<string | null>(currentUserId);
	currentUserIdRef.current = currentUserId;


	/**
	 * Loads the public achievement catalogue.
	 *
	 * Existing catalogue content is retained if a later refresh fails. This is
	 * preferable to replacing already usable public content with an empty list
	 * merely because a refresh encountered a transient network error.
	 */
	const loadCatalogue = useCallback(async (): Promise<void> => {
		const requestId = ++catalogueRequestIdRef.current;

		setCatalogueStatus('loading');

		try {
			const nextDefinitions = await loadActiveAchievements();

			if (requestId !== catalogueRequestIdRef.current) {
				return;
			}

			setDefinitions(nextDefinitions);
			setCatalogueStatus('ready');
		} catch {
			if (requestId !== catalogueRequestIdRef.current) {
				return;
			}

			setCatalogueStatus('error');
		}
	}, []);


	/**
	 * Loads private achievement rows for one specific authenticated account.
	 *
	 * The account ID is captured deliberately and checked again when the request
	 * finishes. A result is accepted only when both the request and account are
	 * still current.
	 */
	const loadPrivateAchievements = useCallback(
		async (userId: string): Promise<void> => {
			const requestId = ++privateRequestIdRef.current;

			setPrivateOwnerId(userId);
			setUserAchievements([]);
			setPrivateStatus('loading');

			try {
				const nextUserAchievements =
					await loadUserAchievements(userId);

				const isCurrentRequest =
					requestId === privateRequestIdRef.current;

				const isCurrentAccount =
					currentUserIdRef.current === userId;

				if (!isCurrentRequest || !isCurrentAccount) {
					return;
				}

				setUserAchievements(nextUserAchievements);
				setPrivateStatus('ready');
			} catch {
				const isCurrentRequest =
					requestId === privateRequestIdRef.current;

				const isCurrentAccount =
					currentUserIdRef.current === userId;

				if (!isCurrentRequest || !isCurrentAccount) {
					return;
				}

				setUserAchievements([]);
				setPrivateStatus('error');
			}
		},
		[],
	);


	/**
	 * Public catalogue loading is independent of authentication.
	 *
	 * A guest, or an app still restoring its session, should not have to wait
	 * before public achievement definitions can be retrieved.
	 */
	useEffect(() => {
		void loadCatalogue();
	}, [loadCatalogue]);


	/**
	 * Synchronises private award state with authentication.
	 *
	 * Authentication restoration:
	 * - invalidate any previous request;
	 * - expose loading private state;
	 * - do not query Supabase yet.
	 *
	 * Guest:
	 * - invalidate old account requests;
	 * - clear private rows;
	 * - expose an idle private state.
	 *
	 * Authenticated:
	 * - load only that account's private award rows.
	 */
	useEffect(() => {
		if (isAuthLoading) {
			privateRequestIdRef.current += 1;
			setPrivateOwnerId(null);
			setUserAchievements([]);
			setPrivateStatus('loading');
			return;
		}

		if (!currentUserId) {
			privateRequestIdRef.current += 1;
			setPrivateOwnerId(null);
			setUserAchievements([]);
			setPrivateStatus('idle');
			return;
		}

		void loadPrivateAchievements(currentUserId);
	}, [
		currentUserId,
		isAuthLoading,
		loadPrivateAchievements,
	]);


	/**
	 * Converts private award rows into UI-ready achievement records.
	 *
	 * A private row is exposed only when:
	 * 1. it belongs to the currently authenticated account; and
	 * 2. its achievement still has an active public definition.
	 *
	 * The second rule prevents a historical award referencing an inactive
	 * catalogue item from creating an incomplete/broken UI card.
	 */
	const earnedAchievements = useMemo<EarnedAchievement[]>(() => {
		if (!currentUserId || privateOwnerId !== currentUserId) {
			return [];
		}

		const definitionsById =
			new Map(
				definitions.map((definition) => [
					definition.id,
					definition,
				]),
			);

		const earned: EarnedAchievement[] = [];

		for (const userAchievement of userAchievements) {
			const achievement =
				definitionsById.get(userAchievement.achievement_id);

			if (!achievement) {
				continue;
			}

			earned.push({
				achievement,
				earned_at: userAchievement.earned_at,
			});
		}

		return earned;
	}, [
		currentUserId,
		definitions,
		privateOwnerId,
		userAchievements,
	]);


	/*
	 * Derive the visible private status from the current authentication state,
	 * rather than blindly exposing the status stored for the previous account.
	 *
	 * This prevents even a single render from advertising old-account progress
	 * during sign-out or account switching.
	 */
	const earnedStatus: EarnedAchievementStatus =
		isAuthLoading
			? 'loading'
			: !currentUserId
				? 'idle'
				: privateOwnerId !== currentUserId
					? 'loading'
					: privateStatus;


	/**
	 * Refreshes the public catalogue and, when authenticated, the current
	 * account's private achievement rows.
	 *
	 * Guests refresh only public data. Authentication restoration also avoids a
	 * premature private query.
	 */
	const refresh = useCallback(async (): Promise<void> => {
		const requests: Promise<void>[] = [
			loadCatalogue(),
		];

		if (!isAuthLoading && currentUserId) {
			requests.push(
				loadPrivateAchievements(currentUserId),
			);
		}

		await Promise.all(requests);
	}, [
		currentUserId,
		isAuthLoading,
		loadCatalogue,
		loadPrivateAchievements,
	]);


	const value = useMemo<AchievementContextValue>(
		() => ({
			definitions,
			earnedAchievements,

			catalogueStatus,
			earnedStatus,

			isCatalogueLoading: catalogueStatus === 'loading',
			isEarnedLoading: earnedStatus === 'loading',

			refresh,
		}),
		[
			catalogueStatus,
			definitions,
			earnedAchievements,
			earnedStatus,
			refresh,
		],
	);


	return (
		<AchievementContext.Provider value={value}>
			{children}
		</AchievementContext.Provider>
	);
}


/**
 * WHAT:
 * Provides access to achievement catalogue and earned-progress state.
 *
 * WHY:
 * Keeping consumers behind one hook avoids direct service calls from screens
 * and preserves the provider's authentication and stale-request protections.
 *
 * HOW:
 * Consumers must be descendants of AchievementProvider.
 */
export function useAchievements(): AchievementContextValue {
	const context = useContext(AchievementContext);

	if (!context) {
		throw new Error(
			'useAchievements must be used within an AchievementProvider.',
		);
	}

	return context;
}