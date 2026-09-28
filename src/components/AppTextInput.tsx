import { useMemo } from 'react';
import {
	StyleSheet,
	TextInput,
	useWindowDimensions,
	View,
} from 'react-native';
import type { TextInputProps } from 'react-native';

import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';
import { AppText } from './AppText';
import { useAppTextSize } from '@/accessibility/AppTextSizeProvider';

type AppTextInputProps = Omit<TextInputProps, 'style'> & {
	label: string;
	errorMessage?: string;
};

/**
 * Shared text-input component for Ihtiyat.
 *
 * It provides consistent labels, validation feedback, responsive sizing,
 * accessibility semantics, and language-aware text direction.
 */
export function AppTextInput({
	label,
	errorMessage,
	...textInputProps
}: AppTextInputProps) {
	const { width, height } = useWindowDimensions();
	const { direction } = useAppLanguage();
	const { textSizePreference, } = useAppTextSize();

	const styles = useMemo(
		() => createStyles(
			width,
			height,
			direction,
			textSizePreference,
		),
		[width, height, direction, textSizePreference],
	);

	return (
		<View style={styles.container}>
			<AppText variant="caption">
				{label}
			</AppText>

			<TextInput
				{...textInputProps}
				accessibilityLabel={
					textInputProps.accessibilityLabel ?? label
				}
				allowFontScaling
                disableFullscreenUI
				placeholderTextColor="#6B7280"
				style={styles.input}
			/>

			{errorMessage ? (
				<AppText
					variant="caption"
					tone="error"
				>
					{errorMessage}
				</AppText>
			) : null}
		</View>
	);
}

const createStyles = (
	width: number,
	height: number,
	direction: 'ltr' | 'rtl',
	textSizePreference: 'system' | 'large',
) =>
	{
		const textScale =
			textSizePreference === 'large'
				? 1.15
				: 1;

		return StyleSheet.create({

			container: {
				gap: responsiveSize(
					width,
					height,
					0.015,
				),
			},

			input: {
				minHeight: responsiveSize(
					width,
					height,
					0.13,
				),
				borderWidth: responsiveSize(
					width,
					height,
					0.0025,
				),
				borderColor: '#CBD5E1',
				borderRadius: responsiveSize(
					width,
					height,
					0.03,
				),
				paddingHorizontal: responsiveSize(
					width,
					height,
					0.04,
				),
				paddingVertical: responsiveSize(
					width,
					height,
					0.025,
				),

				backgroundColor: '#FFFFFF',
				color: '#1F2937',

				fontSize: responsiveSize(
					width,
					height,
					0.043,
				) * textScale,

				textAlign:
					direction === 'rtl'
						? 'right'
						: 'left',
				writingDirection: direction,
			},
		});
	};