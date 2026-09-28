import { useMemo, useState } from 'react';
import {
	Pressable,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { AppButton } from '../../components/AppButton';
import { AppHeader } from '../../components/AppHeader';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { AppTextInput } from '../../components/AppTextInput';
import { supabaseClient } from '../../lib/supabase-config';
import { useAppLanguage } from '../../localization/AppLanguageProvider';
import { responsiveSize } from '../../utils/responsive-sizing';

/**
 * allows user to creates an Ihtiyat account using the existing Supabase email/password flow.
 * Email confirmation stays enabled, so registration still ends at the same
 * confirmation checkpoint rather than authenticating the account immediately.
 */
export default function AccountRegistrationScreen() {
	const { width, height } = useWindowDimensions();
	const { isRTL, translate } = useAppLanguage();

	const isLandscape = width > height;
	const keyboardBottomOffset = isLandscape
		? 0
		: responsiveSize(width, height, 0.08);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [registrationComplete, setRegistrationComplete] = useState(false);

	const styles = useMemo(
		() => createStyles(width, height, isRTL, isLandscape),
		[width, height, isRTL, isLandscape],
	);

	const emailConfirmationRedirectUrl = Linking.createURL('auth/callback');

	const handleRegister = async (): Promise<void> => {
		setErrorMessage(null);

		const trimmedEmail = email.trim();

		if (!trimmedEmail || !password || !confirmPassword) {
			setErrorMessage(translate('authentication.requiredFields'));
			return;
		}

		if (password.length < 8) {
			setErrorMessage(translate('authentication.passwordTooShort'));
			return;
		}

		if (password !== confirmPassword) {
			setErrorMessage(translate('authentication.passwordMismatch'));
			return;
		}

		setIsSubmitting(true);

		try {
			const { error } = await supabaseClient.auth.signUp({
				email: trimmedEmail,
				password,
				options: {
					emailRedirectTo: emailConfirmationRedirectUrl,
				},
			});

			if (error) {
				console.error('[Ihtiyat auth] Registration failed:', error.message);
				setErrorMessage(translate('authentication.registrationError'));
				return;
			}

			setRegistrationComplete(true);
		} catch (error) {
			console.error('[Ihtiyat auth] Unexpected registration failure:', error);
			setErrorMessage(translate('authentication.registrationError'));
		} finally {
			setIsSubmitting(false);
		}
	};

	if (registrationComplete) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />
				<AppHeader showBackButton />

				<View style={styles.successContainer}>
					<View style={styles.successCard}>
						<View style={styles.successIcon}>
							<Ionicons
								accessible={false}
								name="mail-open-outline"
								size={responsiveSize(width, height, 0.075)}
								color="#176B66"
							/>
						</View>

						<AppText variant="title" alignment="center">
							{translate('authentication.checkEmailTitle')}
						</AppText>

						<AppText variant="body" tone="muted" alignment="center">
							{translate('authentication.checkEmailMessage')}
						</AppText>

						<AppButton
							label={translate('common.back')}
							onPress={() => router.back()}
						/>
					</View>
				</View>
			</AppScreen>
		);
	}

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />
			<AppHeader showBackButton />

			<KeyboardAwareScrollView
				contentContainerStyle={styles.scrollContent}
				bottomOffset={keyboardBottomOffset}
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.hero}>
					<View style={styles.heroIcon}>
						<Ionicons
							accessible={false}
							name="person-add-outline"
							size={responsiveSize(width, height, 0.062)}
							color="#9A6A00"
						/>
					</View>

					<View style={styles.heroText}>
						<AppText variant="title">
							{translate('authentication.registerTitle')}
						</AppText>

						<AppText variant="body" tone="muted">
							{translate('authentication.registerSubtitle')}
						</AppText>
					</View>
				</View>

				<View style={styles.formCard}>
					<View style={styles.formMarker}>
						<Ionicons
							accessible={false}
							name="shield-checkmark-outline"
							size={responsiveSize(width, height, 0.04)}
							color="#176B66"
						/>
					</View>

					<View style={styles.infoRow}>
						<Ionicons
							accessible={false}
							name="mail-outline"
							size={responsiveSize(width, height, 0.038)}
							color="#176B66"
						/>

						<View style={styles.flexText}>
							<AppText variant="caption" tone="muted">
								{translate('authentication.emailConfirmationNotice')}
							</AppText>
						</View>
					</View>

					<AppTextInput
						label={translate('authentication.emailLabel')}
						placeholder={translate('authentication.emailPlaceholder')}
						value={email}
						onChangeText={setEmail}
						inputMode="email"
						autoCapitalize="none"
						autoCorrect={false}
						spellCheck={false}
						autoComplete="email"
						editable={!isSubmitting}
					/>

					<AppTextInput
						label={translate('authentication.passwordLabel')}
						placeholder={translate('authentication.passwordPlaceholder')}
						value={password}
						onChangeText={setPassword}
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="new-password"
						secureTextEntry
						editable={!isSubmitting}
					/>

					<AppTextInput
						label={translate('authentication.confirmPasswordLabel')}
						placeholder={translate('authentication.confirmPasswordPlaceholder')}
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="new-password"
						secureTextEntry
						editable={!isSubmitting}
					/>

					{errorMessage ? (
						<View style={styles.errorMessage}>
							<Ionicons
								accessible={false}
								name="alert-circle-outline"
								size={responsiveSize(width, height, 0.036)}
								color="#B42318"
							/>

							<View style={styles.flexText}>
								<AppText variant="caption" tone="error">
									{errorMessage}
								</AppText>
							</View>
						</View>
					) : null}

					<AppButton
						label={translate('authentication.createAccount')}
						onPress={() => {
							void handleRegister();
						}}
						disabled={isSubmitting}
					/>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel={translate('authentication.signIn')}
						onPress={() => router.push('/sign-in')}
						style={({ pressed }) => [
							styles.existingAccountAction,
							pressed ? styles.actionPressed : null,
						]}
					>
						<AppText variant="caption" tone="muted">
							{translate('authentication.alreadyHaveAccount')}
						</AppText>

						<AppText variant="caption">
							{translate('authentication.signIn')}
						</AppText>
					</Pressable>
				</View>
			</KeyboardAwareScrollView>
		</AppScreen>
	);
}

const createStyles = (
	width: number,
	height: number,
	isRTL: boolean,
	isLandscape: boolean,
) =>
	StyleSheet.create({
		scrollContent: {
			flexGrow: 1,
			gap: responsiveSize(width, height, 0.035),
			paddingTop: responsiveSize(width, height, isLandscape ? 0.01 : 0.025),
			paddingBottom: responsiveSize(width, height, 0.12),
		},

		hero: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.02),
		},

		heroIcon: {
			width: responsiveSize(width, height, 0.105),
			height: responsiveSize(width, height, 0.105),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		heroText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.009),
		},

		formCard: {
			gap: responsiveSize(width, height, 0.028),
			padding: responsiveSize(width, height, 0.035),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#B27A00',
			borderRadius: responsiveSize(width, height, 0.016),
			shadowColor: '#0F172A',
			shadowOffset: { width: 0, height: responsiveSize(width, height, 0.006) },
			shadowOpacity: 0.07,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		formMarker: {
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			width: responsiveSize(width, height, 0.067),
			height: responsiveSize(width, height, 0.067),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		infoRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.009),
			padding: responsiveSize(width, height, 0.016),
			backgroundColor: '#EAF4EF',
			borderWidth: responsiveSize(width, height, 0.0015),
			borderColor: '#B7D8CF',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		errorMessage: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.008),
			padding: responsiveSize(width, height, 0.016),
			backgroundColor: '#FFF1F1',
			borderWidth: responsiveSize(width, height, 0.0015),
			borderColor: '#E4A3A3',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		existingAccountAction: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'center',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.008),
			paddingVertical: responsiveSize(width, height, 0.006),
		},

		actionPressed: {
			opacity: 0.65,
		},

		successContainer: {
			flex: 1,
			justifyContent: 'center',
			paddingVertical: responsiveSize(width, height, 0.04),
		},

		successCard: {
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.025),
			padding: responsiveSize(width, height, 0.04),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#B7D8CF',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#176B66',
			borderRadius: responsiveSize(width, height, 0.016),
			shadowColor: '#0F172A',
			shadowOffset: { width: 0, height: responsiveSize(width, height, 0.006) },
			shadowOpacity: 0.07,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		successIcon: {
			width: responsiveSize(width, height, 0.13),
			height: responsiveSize(width, height, 0.13),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.016),
		},

		flexText: {
			flex: 1,
		},
	});
