import { useEffect, useMemo, useRef, useState } from 'react';
import {
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, Stack } from 'expo-router';

import { AppButton } from '../../../components/AppButton';
import { AppHeader } from '../../../components/AppHeader';
import { AppScreen } from '../../../components/AppScreen';
import { AppText } from '../../../components/AppText';
import { createSessionFromAuthUrl } from '../../../auth/auth-deep-link';
import { useAppLanguage } from '../../../localization/AppLanguageProvider';
import { responsiveSize } from '../../../utils/responsive-sizing';

type ConfirmationStatus = 'processing' | 'success' | 'error';

/**
 * Completes the existing Supabase confirmation deep-link flow. The only state
 * owned here is presentation state for processing, success and failure.
 */
export default function AuthCallbackScreen() {
	const { width, height } = useWindowDimensions();
	const { translate } = useAppLanguage();

	const linkingUrl = Linking.useLinkingURL();
	const [status, setStatus] = useState<ConfirmationStatus>('processing');
	const handledUrl = useRef<string | null>(null);

	const styles = useMemo(
		() => createStyles(width, height),
		[width, height],
	);

	useEffect(() => {
		if (!linkingUrl || handledUrl.current === linkingUrl) {
			return;
		}

		handledUrl.current = linkingUrl;

		const completeConfirmation = async (): Promise<void> => {
			try {
				await createSessionFromAuthUrl(linkingUrl);
				setStatus('success');
			} catch {
				setStatus('error');
			}
		};

		void completeConfirmation();
	}, [linkingUrl]);

	const title =
		status === 'processing'
			? translate('authentication.confirmationProcessingTitle')
			: status === 'success'
				? translate('authentication.confirmationSuccessTitle')
				: translate('authentication.confirmationErrorTitle');

	const message =
		status === 'processing'
			? translate('authentication.confirmationProcessingMessage')
			: status === 'success'
				? translate('authentication.confirmationSuccessMessage')
				: translate('authentication.confirmationErrorMessage');

	const iconName =
		status === 'processing'
			? 'hourglass-outline'
			: status === 'success'
				? 'checkmark-circle-outline'
				: 'alert-circle-outline';

	const iconColor =
		status === 'processing'
			? '#315A7D'
			: status === 'success'
				? '#176B66'
				: '#A84E17';

	const iconStyle =
		status === 'processing'
			? styles.processingIcon
			: status === 'success'
				? styles.successIcon
				: styles.errorIcon;

	const cardStyle =
		status === 'processing'
			? styles.processingCard
			: status === 'success'
				? styles.successCard
				: styles.errorCard;

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />

			<AppHeader
				showBackButton
				onBackPress={() => router.replace('/')}
			/>

			<View style={styles.container}>
				<View style={[styles.statusCard, cardStyle]}>
					<View style={[styles.statusIcon, iconStyle]}>
						<Ionicons
							accessible={false}
							name={iconName}
							size={responsiveSize(width, height, 0.08)}
							color={iconColor}
						/>
					</View>

					<AppText variant="title" alignment="center">
						{title}
					</AppText>

					<AppText variant="body" tone="muted" alignment="center">
						{message}
					</AppText>

					{status !== 'processing' ? (
						<AppButton
							label={translate('authentication.returnToApp')}
							onPress={() => router.replace('/')}
						/>
					) : null}
				</View>
			</View>
		</AppScreen>
	);
}

const createStyles = (width: number, height: number) =>
	StyleSheet.create({
		container: {
			flex: 1,
			justifyContent: 'center',
			paddingVertical: responsiveSize(width, height, 0.04),
		},

		statusCard: {
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.025),
			padding: responsiveSize(width, height, 0.04),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderRadius: responsiveSize(width, height, 0.016),
			shadowColor: '#0F172A',
			shadowOffset: { width: 0, height: responsiveSize(width, height, 0.006) },
			shadowOpacity: 0.07,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		processingCard: {
			borderColor: '#B8CFDE',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#315A7D',
		},

		successCard: {
			borderColor: '#B7D8CF',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#176B66',
		},

		errorCard: {
			borderColor: '#E8C6AA',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#B96B13',
		},

		statusIcon: {
			width: responsiveSize(width, height, 0.14),
			height: responsiveSize(width, height, 0.14),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: responsiveSize(width, height, 0.018),
		},

		processingIcon: {
			backgroundColor: '#E4ECF5',
		},

		successIcon: {
			backgroundColor: '#E7F3F1',
		},

		errorIcon: {
			backgroundColor: '#FBE9D8',
		},
	});
