import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import english_translation_dict from './translations/en';
import arabic_translation_dict from './translations/ar';

/**
 * Languages currently supported by Ihtiyat.
 *
 * Keeping this as a union type prevents unsupported locale values from being
 * passed around the application accidentally.
 */
export type SupportedLanguage = 'en' | 'ar';

export type AppDirection = 'ltr' | 'rtl';

/**
 * Detects the device's preferred language for the initial application state.
 *
 * Ihtiyat currently supports English and Arabic only, so unsupported device
 * languages safely fall back to English.
 */
const getInitialLanguage = (): SupportedLanguage => {
	const deviceLanguage = getLocales().at(0)?.languageCode;

	return deviceLanguage === 'ar' ? 'ar' : 'en';
};

/**
 * i18n-js expects standard locale identifiers such as "en" and "ar".
 *
 * The local variable names are intentionally descriptive, while the locale
 * keys remain standard language codes.
 */
const i18n = new I18n({
	en: english_translation_dict,
	ar: arabic_translation_dict,
});

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = getInitialLanguage();


/**
 * Type guard used when language values originate outside trusted TypeScript
 * code, for example from persisted preferences or backend data.
 */
export const isSupportedLanguage = (
	language: string | null | undefined,
): language is SupportedLanguage =>
	language === 'en' || language === 'ar';

/**
 * Returns the expected reading/layout direction for a supported language.
 */
export const getLanguageDirection = (
	language: SupportedLanguage,
): AppDirection => (language === 'ar' ? 'rtl' : 'ltr');

export default i18n;