import { useMemo } from 'react';
import {
	Pressable,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { useAppLanguage } from '../localization/AppLanguageProvider';
import { responsiveSize } from '../utils/responsive-sizing';

type AppHeaderProps = {
	showBackButton?: boolean;
	title?: string;
	onBackPress?: () => void;
};

/**
 * Shared application header for screens that should not use Expo Router's
 * native Stack header.
 *
 * Keeping this header inside the React Native layout avoids native-header
 * inset conflicts with keyboard-aware scrolling on Android.
 */
export function AppHeader({
	showBackButton = false,
	title,
	onBackPress,
}: AppHeaderProps) {
	const {
		width,
		height,
	} = useWindowDimensions();

	const {
		isRTL,
		translate,
	} = useAppLanguage();

	const styles = useMemo(
		() => createStyles(
			width,
			height,
			isRTL,
		),
		[
			width,
			height,
			isRTL,
		],
	);

	const handleBackPress = (): void => {
		if (onBackPress) {
			onBackPress();
			return;
		}

		router.back();
	};

	return (
		<View style={styles.container}>
			{showBackButton ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={translate(
						'common.back',
					)}
					onPress={handleBackPress}
					style={({ pressed }) => [
						styles.backButton,
						pressed
							? styles.backButtonPressed
							: null,
					]}
				>
					<Ionicons
						accessible={false}
						name={isRTL ? 'chevron-forward' : 'chevron-back'}
						size={responsiveSize(width, height, 0.052)}
						color="#173F5F"
					/>
				</Pressable>
			) : null}

			{title ? (
				<View style={styles.titleContainer}>
					<AppText
						variant="body"
						alignment="start"
					>
						{title}
					</AppText>
				</View>
			) : null}
		</View>
	);
}

const createStyles = (
	width: number,
	height: number,
	isRTL: boolean,
) => {
	const controlSize = responsiveSize(
		width,
		height,
		0.12,
	);

	return StyleSheet.create({
		container: {
			alignItems: 'center',
			flexDirection: isRTL ? 'row-reverse' : 'row',
			minHeight: controlSize,
			marginBottom: responsiveSize( width, height, 0.025,),
		},

		backButton: {
			alignItems: 'center',
			justifyContent: 'center',
			width: responsiveSize(width, height, 0.095),
			height: responsiveSize(width, height, 0.095),
			backgroundColor: '#F7F9FB',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#C7D6E1',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		backButtonPressed: {
			backgroundColor: '#E4ECF5',
			opacity: 0.8,
		},

		titleContainer: {
			flex: 1,
		},
	});
};