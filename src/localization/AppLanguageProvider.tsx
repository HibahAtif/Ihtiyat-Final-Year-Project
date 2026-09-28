import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	useEffect,
} from 'react';

import type { ReactNode } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { getLocales } from 'expo-localization';

import i18n, {
	getLanguageDirection,
} from './i18n';

import type {
	AppDirection,
	SupportedLanguage,
} from './i18n';

const LANGUAGE_STORAGE_KEY = 'ihtiyat.preferred-language';
const getDeviceLanguage = () : SupportedLanguage => getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';

type AppLanguageContextValue = {
	language: SupportedLanguage;
	direction: AppDirection;
	isRTL: boolean;
	setLanguage: (language: SupportedLanguage) => void;
	toggleLanguage: () => void;
	translate: (key: string) => string;
};

type AppLanguageProviderProps = {
	children: ReactNode;
};

const AppLanguageContext =
	createContext<AppLanguageContextValue | null>(null);

/**
 * Provides apps active language and translation behaviour.
 *
 * React state is the authoritative language state. This ensures that changing
 * language always causes the component tree to rerender.
 *
 * i18n-js remains responsible for resolving translation keys, but React does
 * not depend on mutations inside the i18n-js instance for reactivity.
 */
export function AppLanguageProvider({
	children,
}: AppLanguageProviderProps) {
	/**
	 * Use the locale detected during i18n initialisation as the starting
	 * language while restricting it to languages supported by Ihtiyat.
	 */
	const [language, setLanguageState] =
		useState<SupportedLanguage>(
			() => getDeviceLanguage(),
		);

	const direction = getLanguageDirection(language);

	//Adding a start-up effect for user's language prefernce persistence
	useEffect(() => {
		let isMounted = true;

		const restoreLanguage =
			async (): Promise<void> => {
				const storedLanguage =
					await Storage.getItem(
						LANGUAGE_STORAGE_KEY,
					);

				if (!isMounted) {
					return;
				}

				const restoredLanguage:
					SupportedLanguage =
					storedLanguage === 'ar'
						|| storedLanguage === 'en'
						? storedLanguage
						: getDeviceLanguage();

				i18n.locale = restoredLanguage;
				setLanguageState(
					restoredLanguage,
				);
			};

		void restoreLanguage();

		return () => {
			isMounted = false;
		};
	}, []);

	/**
	 * Updates apps active language and persists the user's explicit
	 * language preference locally.
	*/
	const setLanguage = useCallback(
		(nextLanguage: SupportedLanguage): void => {
			i18n.locale = nextLanguage;
			setLanguageState(nextLanguage);

			void Storage.setItem(
				LANGUAGE_STORAGE_KEY,
				nextLanguage,
			);
		},
		[],
	);

	/**
	 * Switches between apps two supported languages.
	 *
	 * The functional state update avoids relying on a previously captured
	 * language value.
	 */
	const toggleLanguage = useCallback((): void => {
		setLanguage(
			language === 'en' ? 'ar' : 'en',
		);
	}, [
		language,
		setLanguage,
	]);

	/**
	 * Resolves a translation explicitly for React's current language.
	 *
	 * Passing the locale explicitly means translation output depends on the
	 * React state rather than mutable global i18n state.
	 */
	const translate = useCallback(
		(key: string): string =>
			i18n.t(key, {
				locale: language,
			}),
		[language],
	);

	const contextValue = useMemo<AppLanguageContextValue>(() => ({
		language,
		direction,
		isRTL: direction === 'rtl',
		setLanguage,
		toggleLanguage,
		translate,
	}),
		[
			language,
			direction,
			setLanguage,
			toggleLanguage,
			translate,
		],
	);

	return (
		<AppLanguageContext.Provider value={contextValue}>
			{children}
		</AppLanguageContext.Provider>
	);
}

/**
 * Provides safe access to app localisation throughout the component tree.
 *
 * Throwing here exposes incorrect provider placement immediately during
 * development rather than allowing undefined localisation behaviour.
 */
export function useAppLanguage(): AppLanguageContextValue {
	const context = useContext(AppLanguageContext);

	if (!context) {
		throw new Error(
			'useAppLanguage must be used within an AppLanguageProvider.',
		);
	}

	return context;
}