// reusable accessible pressable
import { useMemo } from 'react';

import type {
	ReactNode,
} from 'react';

import {
	Pressable,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';

import { responsiveSize } from '../utils/responsive-sizing';
import { AppText } from './AppText';


export type AppButtonVariant =
	| 'primary'
	| 'severity1'
	| 'severity2'
	| 'severity3';


type AppButtonProps = {
	label: string;
	onPress: () => void;
	disabled?: boolean;

	/*
	 * Controls presentation only.
	 *
	 * The feature using AppButton still owns the domain meaning of the selected
	 * severity and the state transition that occurs when it is pressed.
	 */
	variant?: AppButtonVariant;

	/*
	 * Selector-style buttons can expose their current state both visually and
	 * through accessibilityState.
	 */
	selected?: boolean;

	/*
	 * Feature-owned visual content such as the alert-severity icons can be
	 * supplied without coupling this shared component to a particular domain.
	 */
	icon?: ReactNode;

	/*
	 * Optional extra screen-reader guidance for specialised actions.
	 */
	accessibilityHint?: string;
	accessibilityLabel?: string;
};


/**
 * Shared accessible action button.
 *
 * WHAT:
 * Provides Ihtiyat's common button interaction boundary while supporting
 * presentation variants for primary actions and simulated alert severity.
 *
 * WHY:
 * Press handling, minimum touch size, disabled feedback and accessibility
 * semantics should remain consistent across the app. Feature screens should
 * not need to recreate those mechanics just because a button has a different
 * visual meaning.
 *
 * HOW:
 * - primary remains the existing teal action button;
 * - severity1 / severity2 / severity3 apply distinct yellow, orange and red
 *   presentations;
 * - icons are caller supplied so AppButton remains domain independent;
 * - selected controls expose accessibilityState.selected and a visible
 *   checkmark so selection does not rely on colour alone.
*/
export function AppButton({
	label,
	onPress,
	disabled = false,
	variant = 'primary',
	selected = false,
	icon,
	accessibilityHint,
	accessibilityLabel,
}: AppButtonProps) {
	const {
		width,
		height,
	} = useWindowDimensions();


	const styles =
		useMemo(
			() =>
				createStyles(
					width,
					height,
				),
			[
				width,
				height,
			],
		);


	const isSeverityVariant =
		variant !== 'primary';


	const variantStyle =
		variant === 'severity1'
			? styles.severity1
			: variant === 'severity2'
				? styles.severity2
				: variant === 'severity3'
					? styles.severity3
					: styles.primary;


	/*
	 * Yellow needs dark foreground content for contrast. Orange, red and the
	 * standard teal primary button use light foreground content.
	 */
	const textTone =
		variant === 'severity1'
			? 'default'
			: 'onPrimary';

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={
				accessibilityLabel
				?? label
			}
			accessibilityHint={accessibilityHint}
			accessibilityState={{
				disabled,
				selected:
					isSeverityVariant
						? selected
						: undefined,
			}}
			disabled={disabled}
			onPress={onPress}
			style={({
				pressed,
			}) => [
				styles.button,
				variantStyle,

				isSeverityVariant
				? styles.severityButton
				: undefined,

				selected
				&& isSeverityVariant
					? styles.selectedButton
					: undefined,

				pressed
				&& !disabled
					? styles.buttonPressed
					: undefined,

				disabled
					? styles.buttonDisabled
					: undefined,
			]}
		>
			<View
				style={
					styles.content
				}
			>
				{icon
					? (
						<View
							style={
								styles.iconContainer
							}
						>
							{icon}
						</View>
					)
					: null
				}

				<AppText
					variant="body"
					tone={textTone}
					alignment="center"
				>
					{label}
				</AppText>

				{selected
					&& isSeverityVariant
					? (
						<AppText
							variant="body"
							tone={textTone}
							alignment="center"
						>
							✓
						</AppText>
					)
					: null
				}
			</View>
		</Pressable>
	);
}


const createStyles = (
	width: number,
	height: number,
) =>
	StyleSheet.create({
		button: {
			minHeight:
				responsiveSize(
					width,
					height,
					0.13,
				),

			borderRadius:
				responsiveSize(
					width,
					height,
					0.03,
				),

			paddingHorizontal:
				responsiveSize(
					width,
					height,
					0.052,
				),

			paddingVertical:
				responsiveSize(
					width,
					height,
					0.03,
				),

			alignItems:
				'center',

			justifyContent:
				'center',
		},


		/*
		 * Existing AppButton visual contract.
		 */
		primary: {
			backgroundColor:
				'#176B66',
		},


		/*
		 * Ihtiyat simulation-severity palette.
		 *
		 * These colours communicate increasing severity but do not claim to be
		 * official warning-system brand colours.
		 */
		severity1: {
			backgroundColor:
				'#FACC15',
		},

		severity2: {
			backgroundColor:
				'#C2410C',
		},

		severity3: {
			backgroundColor:
				'#B91C1C',
		},


		/*
		 * Severity buttons form a selector rather than a conventional full-width
		 * primary action, so their content can accommodate an icon, label and
		 * selected-state cue together.
		 */
		severityButton: {
			flexGrow:
				1,

			flexBasis:
				0,

			paddingHorizontal:
				responsiveSize(
					width,
					height,
					0.025,
				),

			paddingVertical:
				responsiveSize(
					width,
					height,
					0.02,
				),
		},


		/*
		 * Border thickness is a second visible selection cue in addition to the
		 * checkmark, avoiding reliance on colour alone.
		 */
		selectedButton: {
			borderWidth:
				responsiveSize(
					width,
					height,
					0.005,
				),

			borderColor:
				'#111827',
		},


		content: {
			width: '100%',
			alignItems:
				'center',

			justifyContent:
				'center',

			gap:
				responsiveSize(
					width,
					height,
					0.012,
				),
		},


		iconContainer: {
			alignItems:
				'center',

			justifyContent:
				'center',
		},


		buttonPressed: {
			opacity:
				0.8,
		},


		buttonDisabled: {
			opacity:
				0.5,
		},
	});