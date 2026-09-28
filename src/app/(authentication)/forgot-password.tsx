import { useMemo, useState } from 'react';
import {
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
import { supabaseClient } from '@/lib/supabase-config';
import { useAppLanguage } from '../../localization/AppLanguageProvider';
import { responsiveSize } from '../../utils/responsive-sizing';

/**
 * Requests Supabase's existing password-recovery email. The recovery URL and
 * account-enumeration-safe success message are also displayed.
 */
export default function ForgotPasswordScreen() {
	const { width, height } = useWindowDimensions();
	const { isRTL, translate } = useAppLanguage();

	const [email, setEmail] = useState('');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [requestComplete, setRequestComplete] = useState(false);

	const isLandscape = width > height;
	const keyboardBottomOffset = isLandscape
		? 0
		: responsiveSize(width, height, 0.08);

	const styles = useMemo(
		() => createStyles(width, height, isRTL, isLandscape),
		[width, height, isRTL, isLandscape],
	);

	const handlePasswordResetRequest = async (): Promise<void> => {
		setErrorMessage(null);

		const trimmedEmail = email.trim();

		if (!trimmedEmail) {
			setErrorMessage(translate('authentication.requiredFields'));
			return;
		}

		setIsSubmitting(true);

		try {
			const { error } = await supabaseClient.auth.resetPasswordForEmail(
				trimmedEmail,
				{
					redirectTo: 'ihtiyat://auth/reset-password',
				},
			);

			if (error) {
				setErrorMessage(translate('authentication.resetRequestError'));
				return;
			}

			setRequestComplete(true);
		} catch {
			setErrorMessage(translate('authentication.resetRequestError'));
		} finally {
			setIsSubmitting(false);
		}
	};

	if (requestComplete) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				<AppHeader
					showBackButton
					onBackPress={() => router.replace('/sign-in')}
				/>

				<View style={styles.successContainer}>
					<View style={styles.successCard}>
						<View style={styles.successIcon}>
							<Ionicons
								accessible={false}
								name="mail-open-outline"
								size={responsiveSize(width, height, 0.075)}
								color="#315A7D"
							/>
						</View>

						<AppText variant="title" alignment="center">
							{translate('authentication.resetEmailSentTitle')}
						</AppText>

						<AppText variant="body" tone="muted" alignment="center">
							{translate('authentication.resetEmailSentMessage')}
						</AppText>

						<AppButton
							label={translate('authentication.returnToSignIn')}
							onPress={() => router.replace('/sign-in')}
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
							name="key-outline"
							size={responsiveSize(width, height, 0.062)}
							color="#315A7D"
						/>
					</View>

					<View style={styles.heroText}>
						<AppText variant="title">
							{translate('authentication.resetPasswordTitle')}
						</AppText>

						<AppText variant="body" tone="muted">
							{translate('authentication.resetPasswordSubtitle')}
						</AppText>
					</View>
				</View>

				<View style={styles.formCard}>
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
						label={translate('authentication.sendResetLink')}
						onPress={() => {
							void handlePasswordResetRequest();
						}}
						disabled={isSubmitting}
					/>
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
			borderColor: '#B8CFDE',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#315A7D',
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
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.016),
		},

		flexText: {
			flex: 1,
		},
	});

