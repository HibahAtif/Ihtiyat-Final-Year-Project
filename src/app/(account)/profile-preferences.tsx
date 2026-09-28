import { useEffect, useMemo, useState } from 'react';

import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthenticationProvider';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { LocationCatalogueSelector } from '@/components/LocationCatalogueSelector';
import { AppScreen } from '@/components/AppScreen';
import { AppSelectionOption } from '@/components/AppSelectionOption';
import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';
import { AppTextInput } from '@/components/AppTextInput';
import { supabaseClient } from '@/lib/supabase-config';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { isSupportedLanguage } from '@/localization/i18n';
import type { SupportedLanguage } from '@/localization/i18n';
import { useProfilePreferences } from '@/profile/ProfilePreferencesProvider';
import { validateHouseholdInputs } from '@/profile/profile-form-validation';

import type {
	HouseholdValidationErrorCode,
	HouseholdValidationErrors,
} from '@/profile/profile-form-validation';

import type { LocationRecord, TextSizePreference } from '@/profile/profile-types';
import { responsiveSize } from '@/utils/responsive-sizing';

/**
 * Authenticated account preferences.
 *
 * Supabase profile persistence and validation remain unchanged. This screen
 * only presents those settings more clearly and reuses the shared searchable
 * location selector instead of rendering the entire catalogue at once.
 */
export default function ProfilePreferencesScreen() {
	const { width, height } = useWindowDimensions();
	const { language, isRTL, translate } = useAppLanguage();
	const { user } = useAuth();
	const { profile, locations, supportedLanguages, status, refresh, savePreferences } =
		useProfilePreferences();

	const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
	const [childrenInput, setChildrenInput] = useState('');
	const [adultsInput, setAdultsInput] = useState('');
	const [olderAdultsInput, setOlderAdultsInput] = useState('');
	const [petsInput, setPetsInput] = useState('');
	const [householdErrors, setHouseholdErrors] = useState<HouseholdValidationErrors>({});
	const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language);
	const [selectedTextSizePreference, setSelectedTextSizePreference] =
		useState<TextSizePreference>('system');
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
	const [locationError, setLocationError] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);

	const displayName = useMemo(() => {
		const metadataName = user?.user_metadata?.display_name;
		return typeof metadataName === 'string' && metadataName.trim()
			? metadataName.trim()
			: null;
	}, [user?.user_metadata]);

	const accountEmail = user?.email ?? '';
	const LTR_ISOLATE = '\u2066';
	const POP_DIRECTIONAL_ISOLATE = '\u2069';
	const displayedEmail = isRTL && accountEmail
		? `${LTR_ISOLATE}${accountEmail}${POP_DIRECTIONAL_ISOLATE}`
		: accountEmail;

	const clearSaveFeedback = (): void => {
		setSaveStatus('idle');
	};

	const handleSignOut = async (): Promise<void> => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);

		try {
			//sign out only this, current device so another active Ihtiyat session is left alone.
			const { error } = await supabaseClient.auth.signOut({ scope: 'local' });

			if (error) {
				console.error('[Ihtiyat auth] Sign out failed:', error.message);
				return;
			}

			router.replace('/');
		} catch (error) {
			console.error('[Ihtiyat auth] Unexpected sign out failure:', error);
		} finally {
			setIsSigningOut(false);
		}
	};

	useEffect(() => {
		setSelectedLocationId(profile?.active_location_id ?? null);
	}, [profile?.active_location_id]);

	/**
	 * Null household values mean the user has not supplied household details;
	 * explicit zero still needs to remain visible as "0" in the form.
	 */
	useEffect(() => {
		if (!profile) {
			setChildrenInput('');
			setAdultsInput('');
			setOlderAdultsInput('');
			setPetsInput('');
			setHouseholdErrors({});
			return;
		}

		setChildrenInput(profile.children_count === null ? '' : String(profile.children_count));
		setAdultsInput(profile.adults_count === null ? '' : String(profile.adults_count));

		setOlderAdultsInput(
			profile.older_adults_count === null ? '' : String(profile.older_adults_count),
		);

		setPetsInput(profile.pets_count === null ? '' : String(profile.pets_count));
		setHouseholdErrors({});
	}, [
		profile?.id,
		profile?.children_count,
		profile?.adults_count,
		profile?.older_adults_count,
		profile?.pets_count,
	]);

	/**
	 * Saved presentation preferences are restored only when the installed build
	 * actually supports the stored language code.
	 */
	useEffect(() => {
		const savedLanguage = profile?.preferred_language_code;
		setSelectedLanguage(isSupportedLanguage(savedLanguage) ? savedLanguage : language);
		setSelectedTextSizePreference(
			profile?.text_size_preference === 'large' ? 'large' : 'system',
		);
	}, [
		profile?.id,
		profile?.preferred_language_code,
		profile?.text_size_preference,
		language,
	]);

	const getLocationName = (nameEnglish: string, nameArabic: string): string =>
		language === 'ar' ? nameArabic : nameEnglish;

	const formatLocationCode = (code: string): string =>
		language === 'ar' ? `${LTR_ISOLATE}${code}${POP_DIRECTIONAL_ISOLATE}` : code;

	const getLocationDescription = (location: LocationRecord): string => {
		const context =
			location.official_code === '0124'
				? translate('profile.jeddahPilot')
				: location.location_type === 'region'
					? translate('profile.regionLocation')
					: `${translate('location.locationCode')}: ${formatLocationCode(location.official_code)}`;

		return location.location_type === 'region'
			? `${context} · ${translate('location.locationCode')}: ${formatLocationCode(location.official_code)}`
			: context;
	};

	const getHouseholdErrorMessage = (
		errorCode: HouseholdValidationErrorCode | undefined,
	): string | undefined => {
		if (!errorCode) {
			return undefined;
		}

		const translationKeys: Record<HouseholdValidationErrorCode, string> = {
			required: 'profile.householdRequired',
			invalidWholeNumber: 'profile.householdWholeNumber',
			range25: 'profile.householdRange25',
			range10: 'profile.householdRange10',
			atLeastOnePerson: 'profile.householdAtLeastOnePerson',
			peopleTotal25: 'profile.householdTotal25',
		};

		return translate(translationKeys[errorCode]);
	};

	/**
	 * Existing validation and persistence rules are retained. Location and
	 * household values are checked locally before any Supabase update is made.
	 */
	const handleSavePreferences = async (): Promise<void> => {
		const householdResult = validateHouseholdInputs({
			children: childrenInput,
			adults: adultsInput,
			olderAdults: olderAdultsInput,
			pets: petsInput,
		});

		if (selectedLocationId === null) {
			setLocationError(true);

			if (!householdResult.isValid) {
				setHouseholdErrors(householdResult.errors);
			}

			setSaveStatus('idle');
			return;
		}

		setLocationError(false);

		if (!householdResult.isValid) {
			setHouseholdErrors(householdResult.errors);
			setSaveStatus('idle');
			return;
		}

		setHouseholdErrors({});
		setSaveStatus('saving');

		try {
			await savePreferences({
				active_location_id: selectedLocationId,
				preferred_language_code: selectedLanguage,
				text_size_preference: selectedTextSizePreference,
				...householdResult.values,
			});

			// Local presentation changes are applied only after the profile save succeeds.
			setSaveStatus('success');
		} catch {
			setSaveStatus('error');
		}
	};

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />
			<AppHeader showBackButton />

			<KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.pageHeader}>
                        <View style={styles.pageHeaderIcon}>
                            <Ionicons
                                accessible={false}
                                name="person-outline"
                                size={responsiveSize(width, height, 0.06)}
                                color="#65507C"
                            />
                        </View>

                        <View style={styles.pageHeaderText}>
                            <AppText variant="title">{translate('profile.title')}</AppText>
                            <AppText variant="body" tone="muted">
                                {translate('profile.subtitle')}
                            </AppText>
                        </View>
                    </View>

					<View style={styles.accountCard}>
						<View style={styles.sectionHeading}>
							<View style={styles.sectionIconPurple}>
								<Ionicons
									accessible={false}
									name="person-circle-outline"
									size={responsiveSize(width, height, 0.045)}
									color="#65507C"
								/>
							</View>

							<AppText variant="subtitle">
								{translate('profile.accountTitle')}
							</AppText>
						</View>

						<View style={styles.accountIdentity}>
							<View style={styles.avatar}>
								<Ionicons
									accessible={false}
									name="person"
									size={responsiveSize(width, height, 0.06)}
									color="#65507C"
								/>
							</View>

							<View style={styles.accountText}>
								{displayName ? (
									<AppText variant="subtitle">{displayName}</AppText>
								) : null}

								<AppText variant="caption" tone="muted">
									{translate('profile.emailLabel')}
								</AppText>

								<AppText variant="body">{displayedEmail}</AppText>
							</View>
						</View>

						<View style={styles.accountActions}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={translate('authentication.resetPasswordTitle')}
								onPress={() => router.push('/auth/reset-password')}
								style={({ pressed }) => [
									styles.accountAction,
									pressed ? styles.accountActionPressed : undefined,
								]}
							>
								<Ionicons
									accessible={false}
									name="key-outline"
									size={responsiveSize(width, height, 0.04)}
									color="#315A7D"
								/>

								<AppText variant="caption">
									{translate('authentication.resetPasswordTitle')}
								</AppText>
							</Pressable>

							<Pressable
								accessibilityRole="button"
								accessibilityLabel={translate('authentication.signOut')}
								disabled={isSigningOut}
								onPress={() => {
									void handleSignOut();
								}}
								style={({ pressed }) => [
									styles.accountAction,
									styles.signOutAction,
									pressed ? styles.accountActionPressed : undefined,
									isSigningOut ? styles.accountActionDisabled : undefined,
								]}
							>
								<Ionicons
									accessible={false}
									name="log-out-outline"
									size={responsiveSize(width, height, 0.04)}
									color="#8A3C18"
								/>

								<AppText variant="caption">
									{translate('authentication.signOut')}
								</AppText>
							</Pressable>
						</View>
					</View>

                    {status === 'loading' ? (
                        <AppStatusMessage message={translate('profile.loading')} />
                    ) : null}

                    {status === 'error' ? (
                        <View style={styles.statusGroup}>
                            <AppStatusMessage 
                                tone="error" 
                                message={translate('profile.loadError')} 
                            />
                            <AppButton label={translate('profile.retry')} onPress={() => void refresh()} />
                        </View>
                    ) : null}

                    {status === 'ready' ? (
                        <>
                            <View style={styles.locationCard}>
                                <View style={styles.sectionHeading}>
                                    <View style={styles.sectionIconBlue}>
                                        <Ionicons
                                            accessible={false}
                                            name="location-outline"
                                            size={responsiveSize(width, height, 0.044)}
                                            color="#315A7D"
                                        />
                                    </View>

                                    <View style={styles.sectionHeadingText}>

                                        <AppText variant="subtitle">
                                            {translate('profile.locationTitle')}
                                        </AppText>

                                        <AppText variant="body" tone="muted">
                                            {translate('profile.locationDescription')}
                                        </AppText>

                                    </View>
                                </View>

                                <AppStatusMessage message={translate('profile.locationCoverageNotice')} />

                                <LocationCatalogueSelector
                                    locations={locations}
                                    selectedLocationId={selectedLocationId}
                                    onSelect={(location) => {
                                        setSelectedLocationId(location.id);
                                        setLocationError(false);
                                        clearSaveFeedback();
                                    }}
                                    disabled={saveStatus === 'saving'}
                                />

                                {locationError ? (
                                    <AppStatusMessage
                                        tone="error"
                                        message={translate('profile.locationRequired')}
                                    />
                                ) : null}
                            </View>

                            <View style={styles.householdCard}>
                                <View style={styles.sectionHeading}>
                                    <View style={styles.sectionIconTeal}>
                                        <Ionicons
                                            accessible={false}
                                            name="people-outline"
                                            size={responsiveSize(width, height, 0.044)}
                                            color="#176B66"
                                        />
                                    </View>

                                    <View style={styles.sectionHeadingText}>

                                        <AppText variant="subtitle">
                                            {translate('profile.householdTitle')}
                                        </AppText>

                                        <AppText variant="body" tone="muted">
                                            {translate('profile.householdDescription')}
                                        </AppText>

                                    </View>
                                </View>

                                <AppStatusMessage message={translate('profile.householdPrivacyNotice')} />

                                <View style={styles.inputGroup}>
                                    <AppTextInput
                                        label={translate('profile.childrenLabel')}
                                        value={childrenInput}
                                        onChangeText={(value) => {
                                            setChildrenInput(value);
                                            setHouseholdErrors({});
                                            clearSaveFeedback();
                                        }}
                                        keyboardType="number-pad"
                                        inputMode="numeric"
                                        errorMessage={getHouseholdErrorMessage(householdErrors.children)}
                                    />

                                    <AppTextInput
                                        label={translate('profile.adultsLabel')}
                                        value={adultsInput}
                                        onChangeText={(value) => {
                                            setAdultsInput(value);
                                            setHouseholdErrors({});
                                            clearSaveFeedback();
                                        }}
                                        keyboardType="number-pad"
                                        inputMode="numeric"
                                        errorMessage={getHouseholdErrorMessage(householdErrors.adults)}
                                    />

                                    <AppTextInput
                                        label={translate('profile.olderAdultsLabel')}
                                        value={olderAdultsInput}
                                        onChangeText={(value) => {
                                            setOlderAdultsInput(value);
                                            setHouseholdErrors({});
                                            clearSaveFeedback();
                                        }}
                                        keyboardType="number-pad"
                                        inputMode="numeric"
                                        errorMessage={getHouseholdErrorMessage(householdErrors.olderAdults)}
                                    />

                                    <AppTextInput
                                        label={translate('profile.petsLabel')}
                                        value={petsInput}
                                        onChangeText={(value) => {
                                            setPetsInput(value);
                                            setHouseholdErrors({});
                                            clearSaveFeedback();
                                        }}
                                        keyboardType="number-pad"
                                        inputMode="numeric"
                                        errorMessage={getHouseholdErrorMessage(householdErrors.pets)}
                                    />
                                </View>

                                {householdErrors.household ? (
                                    <AppStatusMessage
                                        tone="error"
                                        message={getHouseholdErrorMessage(householdErrors.household) ?? ''}
                                    />
                                ) : null}
                            </View>

                            <View style={styles.languageCard}>
                                <View style={styles.sectionHeading}>
                                    <View style={styles.sectionIconAmber}>
                                        <Ionicons
                                            accessible={false}
                                            name="language-outline"
                                            size={responsiveSize(width, height, 0.044)}
                                            color="#8A5A00"
                                        />
                                    </View>

                                    <View style={styles.sectionHeadingText}>
                                        <AppText variant="subtitle">{translate('profile.languageTitle')}</AppText>
                                        <AppText variant="body" tone="muted">
                                            {translate('profile.languageDescription')}
                                        </AppText>
                                    </View>
                                </View>

                                <View style={styles.optionGroup}>
                                    {supportedLanguages.map((supportedLanguage) => {
                                        const { code } = supportedLanguage;

                                        // A backend row is shown only when this installed build has translations for it.
                                        if (!isSupportedLanguage(code)) {
                                            return null;
                                        }

                                        return (
                                            <AppSelectionOption
                                                key={code}
                                                label={supportedLanguage.native_name}
                                                selected={selectedLanguage === code}
                                                onPress={() => {
                                                    setSelectedLanguage(code);
                                                    clearSaveFeedback();
                                                }}
                                            />
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={styles.accessibilityCard}>
                                <View style={styles.sectionHeading}>
                                    <View style={styles.sectionIconBlue}>
                                        <Ionicons
                                            accessible={false}
                                            name="text-outline"
                                            size={responsiveSize(width, height, 0.044)}
                                            color="#315A7D"
                                        />
                                    </View>

                                    <View style={styles.sectionHeadingText}>

                                        <AppText variant="subtitle">
                                            {translate('profile.textSizeTitle')}
                                        </AppText>
                                        
                                        <AppText variant="body" tone="muted">
                                            {translate('profile.textSizeDescription')}
                                        </AppText>

                                    </View>
                                </View>

                                <View style={styles.optionGroup}>

                                    <AppSelectionOption
                                    
                                        label={translate('profile.textSizeSystem')}
                                        description={translate('profile.textSizeSystemDescription')}
                                        selected={selectedTextSizePreference === 'system'}
                                        onPress={() => {
                                            setSelectedTextSizePreference('system');
                                            clearSaveFeedback();
                                        }}
                                    />

                                    <AppSelectionOption
                                        label={translate('profile.textSizeLarge')}
                                        description={translate('profile.textSizeLargeDescription')}
                                        selected={selectedTextSizePreference === 'large'}
                                        onPress={() => {
                                            setSelectedTextSizePreference('large');
                                            clearSaveFeedback();
                                        }}
                                    />
                                </View>
                            </View>

                            <View style={styles.saveGroup}>

                                <AppButton
                                    label={
                                        saveStatus === 'saving'
                                            ? translate('profile.savingPreferences')
                                            : translate('profile.savePreferences')
                                    }
                                    disabled={saveStatus === 'saving'}
                                    onPress={() => void handleSavePreferences()}
                                />

                                {saveStatus === 'success' ? (
                                    <AppStatusMessage 
                                        tone="success" 
                                        message={translate('profile.saveSuccess')} 
                                    />
                                ) : null}

                                {saveStatus === 'error' ? (
                                    <AppStatusMessage 
                                        tone="error" 
                                        message={translate('profile.saveError')} 
                                    />
                                ) : null}
                            </View>
                        </>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
		</AppScreen>
	);
}

const createStyles = (
        width: number, 
        height: number, 
        isRTL: boolean) => {

	const sectionCard = {
		gap: responsiveSize(width, height, 0.022),
		padding: responsiveSize(width, height, 0.03),
		backgroundColor: '#FFFFFF',
		borderWidth: responsiveSize(width, height, 0.0025),
		borderRadius: responsiveSize(width, height, 0.012),
		shadowColor: '#0F172A',
		shadowOffset: { width: 0, height: responsiveSize(width, height, 0.004) },
		shadowOpacity: 0.05,
		shadowRadius: responsiveSize(width, height, 0.009),
		elevation: 1,
	};

	return StyleSheet.create({

        keyboardAvoidingView: {
            flex: 1,
        },

		container: {
			flexGrow: 1,
			gap: responsiveSize(width, height, 0.03),
			paddingBottom: responsiveSize(width, height, 0.08),
		},

		pageHeader: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.02),
		},

		pageHeaderIcon: {
			width: responsiveSize(width, height, 0.1),
			height: responsiveSize(width, height, 0.1),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#EEEAF5',
			borderRadius: responsiveSize(width, height, 0.011),
		},

		pageHeaderText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.01),
		},

		statusGroup: {
			gap: responsiveSize(width, height, 0.018),
		},

		accountCard: {
			...sectionCard,
			borderColor: '#CEC4DA',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#65507C',
		},

		locationCard: {
			...sectionCard,
			borderColor: '#C7D6E1',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#315A7D',
		},

		householdCard: {
			...sectionCard,
			borderColor: '#C9D8D5',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#176B66',
		},

		languageCard: {
			...sectionCard,
			borderColor: '#E3D7B5',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#B27A00',
		},

		accessibilityCard: {
			...sectionCard,
			borderColor: '#C7D6E1',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#315A7D',
		},

		sectionHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
		},

		sectionHeadingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.006),
		},

		sectionIconPurple: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#EEEAF5',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		sectionIconBlue: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		sectionIconTeal: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		sectionIconAmber: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		accountIdentity: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.018),
			paddingTop: responsiveSize(width, height, 0.006),
		},

		avatar: {
			width: responsiveSize(width, height, 0.105),
			height: responsiveSize(width, height, 0.105),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#F3F0F7',
			borderRadius: responsiveSize(width, height, 0.0525),
		},
        
		accountText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.004),
		},

		accountActions: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.012),
			paddingTop: responsiveSize(width, height, 0.008),
		},

		accountAction: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.008),
			paddingHorizontal: responsiveSize(width, height, 0.018),
			paddingVertical: responsiveSize(width, height, 0.012),
			backgroundColor: '#EEF5F9',
			borderWidth: responsiveSize(width, height, 0.0015),
			borderColor: '#B8CFDE',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		signOutAction: {
			backgroundColor: '#FFF4EE',
			borderColor: '#E8C6AA',
		},

		accountActionPressed: {
			opacity: 0.65,
		},

		accountActionDisabled: {
			opacity: 0.5,
		},

		inputGroup: {
			gap: responsiveSize(width, height, 0.018),
		},

		optionGroup: {
			gap: responsiveSize(width, height, 0.016),
		},
        
		saveGroup: {
			gap: responsiveSize(width, height, 0.018),
			paddingTop: responsiveSize(width, height, 0.006),
		},
	});
};