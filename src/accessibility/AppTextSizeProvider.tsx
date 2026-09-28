import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';

import type {
	ReactNode,
} from 'react';

import Storage from 'expo-sqlite/kv-store';

import type {
	TextSizePreference,
} from '@/profile/profile-types';


const TEXT_SIZE_STORAGE_KEY =
	'ihtiyat.text-size-preference';


type AppTextSizeContextValue = {
	textSizePreference:
		TextSizePreference;

	setTextSizePreference: (
		preference:
			TextSizePreference,
	) => void;
};


type AppTextSizeProviderProps = {
	children: ReactNode;
};


const AppTextSizeContext =
	createContext<AppTextSizeContextValue | null>(
		null,
	);


/**
 * Provides Ihtiyat's local application-level text-size preference.
 *
 * "system" preserves the normal responsive sizes while allowing the operating
 * system's accessibility font scaling.
 *
 * "large" adds additional Ihtiyat-level sizing while retaining system font
 * scaling on top.
 */
export function AppTextSizeProvider({
	children,
}: AppTextSizeProviderProps) {
	const [
		textSizePreference,
		setTextSizePreferenceState,
	] = useState<TextSizePreference>(
		'system',
	);


	/**
	 * Restore the last locally applied preference during application startup.
	 */
	useEffect(() => {
		let isMounted =
			true;

		const restorePreference =
			async (): Promise<void> => {
				const storedPreference =
					await Storage.getItem(
						TEXT_SIZE_STORAGE_KEY,
					);

				if (!isMounted) {
					return;
				}

				setTextSizePreferenceState(
					storedPreference === 'large'
						? 'large'
						: 'system',
				);
			};

		void restorePreference();

		return () => {
			isMounted =
				false;
		};
	}, []);


	/**
	 * Applies and persists an explicit local text-size preference.
	 */
	const setTextSizePreference =
		useCallback(
			(
				preference:
					TextSizePreference,
			): void => {
				setTextSizePreferenceState(
					preference,
				);

				void Storage.setItem(
					TEXT_SIZE_STORAGE_KEY,
					preference,
				);
			},
			[],
		);


	const contextValue =
		useMemo<AppTextSizeContextValue>(
			() => ({
				textSizePreference,
				setTextSizePreference,
			}),
			[
				textSizePreference,
				setTextSizePreference,
			],
		);


	return (
		<AppTextSizeContext.Provider
			value={contextValue}
		>
			{children}
		</AppTextSizeContext.Provider>
	);
}


/**
 * Provides access to Ihtiyat's current application-level text-size setting.
 */
export function useAppTextSize():
	AppTextSizeContextValue {
	const context =
		useContext(
			AppTextSizeContext,
		);

	if (!context) {
		throw new Error(
			'useAppTextSize must be used within an AppTextSizeProvider.',
		);
	}

	return context;
}