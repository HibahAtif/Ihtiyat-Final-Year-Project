import {
	useEffect,
} from 'react';

import type {
	ReactNode,
} from 'react';

import {
	useAppTextSize,
} from '@/accessibility/AppTextSizeProvider';

import {
	useAppLanguage,
} from '@/localization/AppLanguageProvider';

import {
	isSupportedLanguage,
} from '@/localization/i18n';

import {
	useProfilePreferences,
} from './ProfilePreferencesProvider';


type ProfilePreferencesSynchronizerProps = {
	children: ReactNode;
};


/**
 * Applies persisted account presentation preferences after the authenticated
 * profile has been loaded.
 *
 * Supabase remains the canonical account-level store. The language and
 * text-size providers remain responsible for the currently applied local
 * presentation state and its device persistence.
 *
 * Keeping this bridge outside the profile screen. Just to ensure that preferences are
 * restored on application restart and when the authenticated account changes.
 */
export function ProfilePreferencesSynchronizer({
	children,
}: ProfilePreferencesSynchronizerProps) {
	const {
		profile,
	} = useProfilePreferences();

	const {
		setLanguage,
	} = useAppLanguage();

	const {
		setTextSizePreference,
	} = useAppTextSize();


	useEffect(() => {
		const preferredLanguage =
			profile?.preferred_language_code;

		if (
			isSupportedLanguage(
				preferredLanguage,
			)
		) {
			setLanguage(
				preferredLanguage,
			);
		}


		const preferredTextSize =
			profile?.text_size_preference;

		if (
			preferredTextSize
				=== 'system'
			|| preferredTextSize
				=== 'large'
		) {
			setTextSizePreference(
				preferredTextSize,
			);
		}
	}, [
		profile?.id,
		profile?.preferred_language_code,
		profile?.text_size_preference,
		setLanguage,
		setTextSizePreference,
	]);


	return children;
}