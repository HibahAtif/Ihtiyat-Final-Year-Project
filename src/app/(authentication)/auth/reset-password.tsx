import { useEffect, useMemo, useRef, useState } from 'react';
import {
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { AppTextInput } from '@/components/AppTextInput';
import { createSessionFromAuthUrl } from '@/auth/auth-deep-link';
import { supabaseClient } from '@/lib/supabase-config';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

type RecoveryStatus = 'processing' | 'ready' | 'error' | 'success';

/**
 * Handles a Supabase password-recovery deep link and only allows a password
 * replacement after the recovery session has been verified successfully.
 */
export default function ResetPasswordScreen() {
	const { width, height } = useWindowDimensions();
	const { isRTL, translate } = useAppLanguage();

	const recoveryUrl = Linking.useLinkingURL();
	const isRecoveryFlow = recoveryUrl !== null;
	const processedUrl = useRef<string | null>(null);

	const [status, setStatus] = useState<RecoveryStatus>('processing');
	const [newPassword, setNewPassword] = useState('');
	const [confirmNewPassword, setConfirmNewPassword] = useState('');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const isLandscape = width > height;
	const keyboardBottomOffset = isLandscape
		? 0
		: responsiveSize(width, height, 0.08);

	const styles = useMemo(
		() => createStyles(width, height, isRTL, isLandscape),
		[width, height, isRTL, isLandscape],
	);

	useEffect(() => {
		const establishPasswordSession = async (): Promise<void> => {
			/*
			* This screen has two valid entry points:
			* a recovery email deep link, or an already signed-in user coming
			* from Profile who wants to change their password directly.
			*/
			if (recoveryUrl) {
				if (processedUrl.current === recoveryUrl) {
					return;
				}

				processedUrl.current = recoveryUrl;

				try {
					await createSessionFromAuthUrl(recoveryUrl, 'recovery');
					setStatus('ready');
				} catch {
					setStatus('error');
				}

				return;
			}

			try {
				const { data, error } = await supabaseClient.auth.getSession();

				if (error || !data.session) {
					setStatus('error');
					return;
				}

				setStatus('ready');
			} catch {
				setStatus('error');
			}
		};

		void establishPasswordSession();
	}, [recoveryUrl]);

	const returnFromPasswordScreen = async (): Promise<void> => {
		/*
		* Recovery links create a temporary Supabase session. I only clear that
		* session when leaving the recovery flow. A signed-in user who opened this
		* screen from Profile should simply return to their profile.
		*/
		if (isRecoveryFlow) {
			if (status === 'ready') {
				await supabaseClient.auth.signOut({ scope: 'local' });
			}

			router.replace('/sign-in');
			return;
		}

		router.replace('/profile-preferences');
	};

	const handleUpdatePassword = async (): Promise<void> => {
		setErrorMessage(null);

		if (!newPassword || !confirmNewPassword) {
			setErrorMessage(translate('authentication.requiredFields'));
			return;
		}

		if (newPassword.length < 8) {
			setErrorMessage(translate('authentication.newPasswordTooShort'));
			return;
		}

		if (newPassword !== confirmNewPassword) {
			setErrorMessage(translate('authentication.newPasswordsDoNotMatch'));
			return;
		}

		setIsSubmitting(true);

		try {
			const { error } = await supabaseClient.auth.updateUser({
				password: newPassword,
			});

			if (error) {
				setErrorMessage(translate('authentication.passwordUpdateError'));
				return;
			}

			/*
			 * A completed reset should return to the ordinary sign-in flow rather
			 * than silently keeping the temporary recovery session authenticated.
			 */
			await supabaseClient.auth.signOut({ scope: 'local' });
			setStatus('success');
		} catch {
			setErrorMessage(translate('authentication.passwordUpdateError'));
		} finally {
			setIsSubmitting(false);
		}
	};

	if (status === 'processing') {
		return (
			<RecoveryState
				icon="hourglass-outline"
				iconColour="#315A7D"
				iconBackground="#E4ECF5"
				cardAccent="#315A7D"
				title={translate('authentication.recoveryProcessingTitle')}
				message={translate('authentication.recoveryProcessingMessage')}
				width={width}
				height={height}
				onBackPress={() => {
					void returnFromPasswordScreen();
				}}
			/>
		);
	}

	if (status === 'error') {
		return (
			<RecoveryState
				icon="alert-circle-outline"
				iconColour="#A84E17"
				iconBackground="#FBE9D8"
				cardAccent="#B96B13"
				title={translate('authentication.recoveryInvalidTitle')}
				message={translate('authentication.recoveryInvalidMessage')}
				buttonLabel={translate('authentication.returnToSignIn')}
				width={width}
				height={height}
				onBackPress={() => {
					void returnFromPasswordScreen();
				}}
				onButtonPress={() => {
					void returnFromPasswordScreen();
				}}
			/>
		);
	}

	if (status === 'success') {
		return (
			<RecoveryState
				icon="checkmark-circle-outline"
				iconColour="#176B66"
				iconBackground="#E7F3F1"
				cardAccent="#176B66"
				title={translate('authentication.passwordUpdatedTitle')}
				message={translate('authentication.passwordUpdatedMessage')}
				buttonLabel={translate('authentication.returnToSignIn')}
				width={width}
				height={height}
				onBackPress={() => router.replace('/sign-in')}
				onButtonPress={() => router.replace('/sign-in')}
			/>
		);
	}

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />

			<AppHeader
				showBackButton
				onBackPress={() => {
					void returnFromPasswordScreen();
				}}
			/>

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
							name="lock-open-outline"
							size={responsiveSize(width, height, 0.062)}
							color="#315A7D"
						/>
					</View>

					<View style={styles.heroText}>
						<AppText variant="title">
							{translate('authentication.newPasswordTitle')}
						</AppText>

						<AppText variant="body" tone="muted">
							{translate('authentication.newPasswordSubtitle')}
						</AppText>
					</View>
				</View>

				<View style={styles.formCard}>
					<View style={styles.infoRow}>
						<Ionicons
							accessible={false}
							name="shield-checkmark-outline"
							size={responsiveSize(width, height, 0.038)}
							color="#176B66"
						/>

						<View style={styles.flexText}>
							<AppText variant="caption" tone="muted">
								{translate('authentication.newPasswordSubtitle')}
							</AppText>
						</View>
					</View>

					<AppTextInput
						label={translate('authentication.newPasswordLabel')}
						placeholder={translate('authentication.newPasswordPlaceholder')}
						value={newPassword}
						onChangeText={setNewPassword}
						autoCapitalize="none"
						autoCorrect={false}
						autoComplete="new-password"
						secureTextEntry
						editable={!isSubmitting}
					/>

					<AppTextInput
						label={translate('authentication.confirmNewPasswordLabel')}
						placeholder={translate('authentication.confirmNewPasswordPlaceholder')}
						value={confirmNewPassword}
						onChangeText={setConfirmNewPassword}
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
						label={translate('authentication.updatePassword')}
						onPress={() => {
							void handleUpdatePassword();
						}}
						disabled={isSubmitting}
					/>
				</View>
			</KeyboardAwareScrollView>
		</AppScreen>
	);
}

type RecoveryStateProps = {
	icon:
		| 'hourglass-outline'
		| 'alert-circle-outline'
		| 'checkmark-circle-outline';
	iconColour: string;
	iconBackground: string;
	cardAccent: string;
	title: string;
	message: string;
	buttonLabel?: string;
	width: number;
	height: number;
	onBackPress: () => void;
	onButtonPress?: () => void;
};

function RecoveryState({
	icon,
	iconColour,
	iconBackground,
	cardAccent,
	title,
	message,
	buttonLabel,
	width,
	height,
	onBackPress,
	onButtonPress,
}: RecoveryStateProps) {
	const styles = useMemo(
		() => createStateStyles(width, height, iconBackground, cardAccent),
		[width, height, iconBackground, cardAccent],
	);

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />
			<AppHeader showBackButton onBackPress={onBackPress} />

			<View style={styles.container}>
				<View style={styles.card}>
					<View style={styles.icon}>
						<Ionicons
							accessible={false}
							name={icon}
							size={responsiveSize(width, height, 0.08)}
							color={iconColour}
						/>
					</View>

					<AppText variant="title" alignment="center">
						{title}
					</AppText>

					<AppText variant="body" tone="muted" alignment="center">
						{message}
					</AppText>

					{buttonLabel && onButtonPress ? (
						<AppButton label={buttonLabel} onPress={onButtonPress} />
					) : null}
				</View>
			</View>
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

		flexText: {
			flex: 1,
		},
	});

const createStateStyles = (
	width: number,
	height: number,
	iconBackground: string,
	cardAccent: string,
) =>
	StyleSheet.create({
		container: {
			flex: 1,
			justifyContent: 'center',
			paddingVertical: responsiveSize(width, height, 0.04),
		},

		card: {
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.025),
			padding: responsiveSize(width, height, 0.04),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: cardAccent,
			borderRadius: responsiveSize(width, height, 0.016),
			shadowColor: '#0F172A',
			shadowOffset: { width: 0, height: responsiveSize(width, height, 0.006) },
			shadowOpacity: 0.07,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		icon: {
			width: responsiveSize(width, height, 0.14),
			height: responsiveSize(width, height, 0.14),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: iconBackground,
			borderRadius: responsiveSize(width, height, 0.018),
		},
	});
