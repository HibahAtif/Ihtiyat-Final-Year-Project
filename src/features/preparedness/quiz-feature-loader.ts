import {
    loadQuizCatalogue,
} from './quiz-service';

import {
    loadQuizCatalogueCache,
    saveQuizCatalogueCache,
} from './quiz-cache-repository';

import type {
    QuizCatalogue,
} from './quiz-types';


/**
 * WHAT:
 * Lists the external operations required by the Quiz feature loader.
 *
 * WHY:
 * The online-first/offline-fallback policy should be testable without making
 * real Supabase requests or opening the device SQLite database.
 *
 * HOW:
 * Production uses the real Quiz service and cache repository. Focused tests
 * can inject deterministic replacements for each dependency.
 */
export type QuizFeatureDependencies = {
    loadQuizCatalogue:
        typeof loadQuizCatalogue;

    saveQuizCatalogueCache:
        typeof saveQuizCatalogueCache;

    loadQuizCatalogueCache:
        typeof loadQuizCatalogueCache;
};


const defaultDependencies:
    QuizFeatureDependencies = {
        loadQuizCatalogue,
        saveQuizCatalogueCache,
        loadQuizCatalogueCache,
    };


/**
 * WHAT:
 * Loads the public Quiz catalogue using Supabase first and SQLite as a durable
 * fallback.
 *
 * WHY:
 * Supabase remains the canonical source of published quiz content, but users
 * should still be able to read previously downloaded questions and options
 * during temporary network or backend failure.
 *
 * A successful remote response must always take priority over cached content.
 * Conversely, a local cache-write problem must not make freshly downloaded
 * canonical data unavailable to the user.
 *
 * HOW:
 * 1. Attempt to load the current catalogue from Supabase.
 * 2. If successful, best-effort refresh the SQLite cache and return the remote
 *    catalogue regardless of whether that cache write succeeds.
 * 3. If the remote load fails, attempt to read the previous SQLite snapshot.
 * 4. Return the cached snapshot when one exists, including an explicitly empty
 *    cached catalogue.
 * 5. If no usable cache exists, rethrow the original remote error.
 *
 * The original remote failure is preserved even if the fallback cache itself
 * cannot be read because it represents the primary feature operation that
 * failed.
 */
export async function loadQuizFeatureCatalogue(
    dependencies:
        QuizFeatureDependencies =
            defaultDependencies,
): Promise<QuizCatalogue> {
    try {
        const remoteCatalogue =
            await dependencies
                .loadQuizCatalogue();


        /*
         * WHAT:
         * Refreshes the durable public Quiz snapshot after a successful
         * canonical read.
         *
         * WHY:
         * The current remote data should be available on a later offline
         * launch. A SQLite write failure is secondary, however, and must not
         * discard data that Supabase has already returned successfully.
         *
         * HOW:
         * The cache write is awaited so the refresh completes predictably, but
         * any write failure is intentionally swallowed before returning the
         * fresh remote catalogue.
         */
        try {
            await dependencies
                .saveQuizCatalogueCache(
                    remoteCatalogue,
                );
        } catch {
            /*
             * Best-effort cache persistence only.
             *
             * The caller still receives the successfully loaded canonical
             * catalogue.
             */
        }


        return remoteCatalogue;
    } catch (
        remoteError: unknown
    ) {
        /*
         * WHAT:
         * Attempts to recover the last successfully cached public Quiz
         * catalogue after the canonical remote read fails.
         *
         * WHY:
         * Temporary connectivity failure should not make previously downloaded
         * safety-learning content unreadable.
         *
         * HOW:
         * null means that no successful Quiz catalogue has ever been cached.
         * An object containing empty arrays is different and remains a valid
         * cached snapshot.
         */
        try {
            const cachedCatalogue =
                await dependencies
                    .loadQuizCatalogueCache();


            if (
                cachedCatalogue
                !== null
            ) {
                return cachedCatalogue;
            }
        } catch {
            /*
             * The cache is a resilience mechanism rather than a replacement
             * source of truth. If it also fails, preserve the original remote
             * error instead of hiding it behind a secondary SQLite failure.
             */
        }


        throw remoteError;
    }
}