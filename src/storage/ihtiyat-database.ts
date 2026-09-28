import * as SQLite from 'expo-sqlite';

import {
    IHTIYAT_DATABASE_SCHEMA_V1_SQL,
    IHTIYAT_DATABASE_SCHEMA_V2_SQL,
    IHTIYAT_DATABASE_SCHEMA_V3_SQL,
    IHTIYAT_DATABASE_SCHEMA_V4_SQL,
    IHTIYAT_DATABASE_SCHEMA_V5_SQL,
    IHTIYAT_DATABASE_VERSION,
} from './ihtiyat-database-schema';


const IHTIYAT_DATABASE_NAME =
    'ihtiyat.db';


type DatabaseVersionRow = {
    user_version: number;
};


let databasePromise:
    Promise<SQLite.SQLiteDatabase> | null =
        null;


/**
 * Initialises Ihtiyat's structured device-side SQLite database.
 *
 * Preparedness content and authenticated offline progress need durable
 * relational storage that is separate from the existing SQLite key-value
 * storage. Supabase remains canonical; 
 * this database is the local resilience layer.
 *
 * WAL and foreign-key enforcement are enabled first. SQLite user_version then
 * determines which ordered schema migrations must run before the shared
 * database connection is returned.
 */
async function initialiseIhtiyatDatabase(
    database: SQLite.SQLiteDatabase,
): Promise<void> {
    await database.execAsync(
        'PRAGMA journal_mode = WAL;',
    );

    await database.execAsync(
        'PRAGMA foreign_keys = ON;',
    );

    const versionRow =
        await database.getFirstAsync<DatabaseVersionRow>(
            'PRAGMA user_version;',
        );

    const currentVersion =
        versionRow?.user_version
        ?? 0;


    if (
        currentVersion
        > IHTIYAT_DATABASE_VERSION
    ) {
        throw new Error(
            `Ihtiyat SQLite database version ${currentVersion} is newer than supported version ${IHTIYAT_DATABASE_VERSION}.`,
        );
    }


    if (
        currentVersion
        === IHTIYAT_DATABASE_VERSION
    ) {
        return;
    }


    await database.withExclusiveTransactionAsync(
        async (
            transaction,
        ): Promise<void> => {
            let migratedVersion =
                currentVersion;


            if (
                migratedVersion < 1
            ) {
                await transaction.execAsync(
                    IHTIYAT_DATABASE_SCHEMA_V1_SQL,
                );

                migratedVersion = 1;
            }

            if(
                migratedVersion < 2
            ){
                await transaction.execAsync(
                    IHTIYAT_DATABASE_SCHEMA_V2_SQL,
                );

                migratedVersion = 2;
            }

            if (
                migratedVersion < 3
            ) {
                await transaction.execAsync(
                    IHTIYAT_DATABASE_SCHEMA_V3_SQL,
                );

                migratedVersion = 3;
            }

            if (
                migratedVersion < 4
            ) {
                await transaction.execAsync(
                    IHTIYAT_DATABASE_SCHEMA_V4_SQL,
                );

                migratedVersion = 4;
            }

            if (migratedVersion < 5) {
                await transaction.execAsync(
                    IHTIYAT_DATABASE_SCHEMA_V5_SQL,
                );

                migratedVersion = 5;
            }

            if (
                migratedVersion
                !== IHTIYAT_DATABASE_VERSION
            ) {
                throw new Error(
                    `No Ihtiyat SQLite migration path exists from version ${currentVersion} to version ${IHTIYAT_DATABASE_VERSION}.`,
                );
            }

            await transaction.execAsync(
                `PRAGMA user_version = ${migratedVersion};`,
            );
        },
    );
}


/**
 * Opens and returns Ihtiyat's shared structured SQLite database.
 *
 * Feature repositories should reuse one initialised database connection rather
 * than independently opening databases or duplicating schema setup.
 *
 * The first caller creates one shared initialisation promise. Concurrent callers
 * await that same promise. If opening or migration fails, the cached promise is
 * cleared so a later request can retry instead of retaining a rejected promise.
 */
export async function getIhtiyatDatabase():
    Promise<SQLite.SQLiteDatabase> {
    if (!databasePromise) {
        databasePromise =
            (
                async (): Promise<SQLite.SQLiteDatabase> => {
                    const database =
                        await SQLite.openDatabaseAsync(
                            IHTIYAT_DATABASE_NAME,
                        );

                    await initialiseIhtiyatDatabase(
                        database,
                    );

                    return database;
                }
            )().catch(
                (
                    error: unknown,
                ) => {
                    databasePromise =
                        null;

                    throw error;
                },
            );
    }


    return databasePromise;
}