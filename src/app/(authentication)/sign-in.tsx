import { useMemo, useState } from 'react';
import {
	Pressable,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
 * Signs an existing confirmed Ihtiyat account in with Supabase email/password
 * authentication. This screen only owns form state and presentation.
 */
export default function SignInScreen() {
	const { width, height } = useWindowDimensions();
	const { isRTL, translate } = useAppLanguage();

	const isLandscape = width > height;
	const keyboardBottomOffset = isLandscape
		? 0
		: responsiveSize(width, height, 0.08);

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const styles = useMemo(
		() => createStyles(width, height, isRTL, isLandscape),
		[width, height, isRTL, isLandscape],
	);

	const handleSignIn = async (): Promise<void> => {
		setErrorMessage(null);

		const trimmedEmail = email.trim();

		if (!trimmedEmail || !password) {
			setErrorMessage(translate('authentication.requiredFields'));
			return;
		}

		setIsSubmitting(true);

		try {
			const { error } = await supabaseClient.auth.signInWithPassword({
				email: trimmedEmail,
				password,
			});

			if (error) {
				setErrorMessage(translate('authentication.invalidCredentials'));
				return;
			}

			router.replace('/');
		} catch {
			setErrorMessage(translate('authentication.signInError'));
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />
			<AppHeader showBackButton />

			<KeyboardAwareScrollView
				style={styles.scrollView}
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
							name="log-in-outline"
							size={responsiveSize(width, height, 0.065)}
							color="#173F5F"
						/>
					</View>

					<View style={styles.heroText}>
						<AppText variant="title">
							{translate('authentication.signInTitle')}
						</AppText>

						<AppText variant="body" tone="muted">
							{translate('authentication.signInSubtitle')}
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
						autoComplete="current-password"
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

					<Pressable
						accessibilityRole="button"
						accessibilityLabel={translate('authentication.forgotPassword')}
						onPress={() => router.push('/forgot-password')}
						style={({ pressed }) => [
							styles.forgotPasswordAction,
							pressed ? styles.actionPressed : null,
						]}
					>
						<Ionicons
							accessible={false}
							name="key-outline"
							size={responsiveSize(width, height, 0.036)}
							color="#315A7D"
						/>

						<AppText variant="caption">
							{translate('authentication.forgotPassword')}
						</AppText>
					</Pressable>

					<AppButton
						label={translate('authentication.signIn')}
						onPress={() => {
							void handleSignIn();
						}}
						disabled={isSubmitting}
					/>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel={translate('authentication.createAccount')}
						onPress={() => router.push('/register')}
						style={({ pressed }) => [
							styles.registrationAction,
							pressed ? styles.actionPressed : null,
						]}
					>
						<AppText variant="caption" tone="muted">
							{translate('authentication.noAccountYet')}
						</AppText>

						<AppText variant="caption">
							{translate('authentication.createAccount')}
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
		scrollView: {
			flex: 1,
		},

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
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		heroText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.009),
		},

		formCard: {
			position: 'relative',
			gap: responsiveSize(width, height, 0.028),
			padding: responsiveSize(width, height, 0.035),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#315A7D',
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

		forgotPasswordAction: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			gap: responsiveSize(width, height, 0.008),
			paddingVertical: responsiveSize(width, height, 0.006),
		},

		registrationAction: {
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

		flexText: {
			flex: 1,
		},
	});
