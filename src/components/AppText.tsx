// Consistent text + Arabic alignment 
import { useMemo } from 'react';
import {
	StyleSheet,
	Text,
	useWindowDimensions,
} from 'react-native';

import type {
	TextProps,
	TextStyle,
} from 'react-native';

import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';
import { useAppTextSize } from '@/accessibility/AppTextSizeProvider';

type AppTextAlignment =
	| 'start'
	| 'center'
	| 'end';

type AppTextVariant =
	| 'body'
	| 'title'
	| 'subtitle'
	| 'caption';

type AppTextTone =
	| 'default'
	| 'onPrimary'
	| 'muted'
	| 'error';

type AppTextProps = Omit<TextProps, 'style'> & {
	alignment?: AppTextAlignment;
	variant?: AppTextVariant;
	tone?: AppTextTone
};

/**
 * Shared text component for Ihtiyat.
 *
 * It centralises responsive typography, system font scaling, and
 * language-aware text direction so individual screens do not need to repeat
 * those concerns.
 */
export function AppText({
	alignment = 'start',
	variant = 'body',
	tone = 'default',
	children,
	...textProps
}: AppTextProps) {
	const { width, height } = useWindowDimensions();
	const { direction } = useAppLanguage();
	const { textSizePreference, } = useAppTextSize();

	/**
	 * Styles are regenerated only when dimensions or language direction change.
	 *
	 * This keeps sizing responsive without using inline style objects.
	 * allowFontScaling remains enabled so Android/iOS accessibility text preferences still work on top of the responsive base size.
	 */
	const styles = useMemo(
		() => createStyles(width, height, direction, alignment, textSizePreference),
		[width, height, direction, alignment, textSizePreference],
	);

	const variantStyle: TextStyle = styles[variant];
	const toneStyle: TextStyle = styles[tone];

	return (
		<Text
			{...textProps}
			allowFontScaling
			style={[
				styles.base,
				variantStyle,
				toneStyle,
			]}
		>
			{children}
		</Text>
	);
}

const createStyles = (
	width: number,
	height: number,
	direction: 'ltr' | 'rtl',
	alignment: AppTextAlignment,
	textSizePreference: 'system' | 'large',
) => {
		const textScale =
			textSizePreference === 'large'
			? 1.15
			: 1;

		return StyleSheet.create({
			base: {
				alignSelf: 'stretch',
				textAlign:
					alignment === 'center'
						? 'center'
						: alignment === 'end'
							? direction === 'rtl'
								? 'left'
								: 'right'
							: direction === 'rtl'
								? 'right'
								: 'left',
				writingDirection: direction,
			},

			body: {
				fontSize: responsiveSize(width, height, 0.043) * textScale,
				lineHeight: responsiveSize(width, height, 0.065) * textScale,
			},

			title: {
				fontSize: responsiveSize(width, height, 0.073) * textScale,
				lineHeight: responsiveSize(width, height, 0.09) * textScale,
				fontWeight: '700',
			},

			subtitle: {
				fontSize: responsiveSize(width, height, 0.051) * textScale,
				lineHeight: responsiveSize(width, height, 0.072) * textScale,
				fontWeight: '600',
			},

			caption: {
				fontSize: responsiveSize(width, height, 0.034) * textScale,
				lineHeight: responsiveSize(width, height, 0.052) * textScale,
			},

			default: {
				color: '#1F2937',
			},

			onPrimary: {
				color: '#FFFFFF',
			},

			muted: {
				color: '#6B7280',
			},
			error:
			{
				color: '#B42318',
			}
		});
	};