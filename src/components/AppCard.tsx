import {
	useMemo,
} from 'react';

import type {
	ReactNode,
} from 'react';

import {
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';

import { responsiveSize } from '@/utils/responsive-sizing';


type AppCardProps = {
	children: ReactNode;
};


/**
 * Shared content card used to group related Ihtiyat information and controls.
 *
 * The card is intentionally a layout component rather than an interactive
 * control. Interactive semantics remain on the buttons, inputs and selectors
 * contained inside it.
 */
export function AppCard({
	children,
}: AppCardProps) {
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

	return (
		<View
			style={styles.card}
		>
			{children}
		</View>
	);
}


const createStyles = (
	width: number,
	height: number,
) =>
	StyleSheet.create({
		card: {
			gap: responsiveSize(
				width,
				height,
				0.025,
			),

			padding: responsiveSize(
				width,
				height,
				0.045,
			),

			borderWidth: responsiveSize(
				width,
				height,
				0.0025,
			),

			borderColor:
				'#E2E8F0',

			borderRadius:
				responsiveSize(
					width,
					height,
					0.035,
				),

			backgroundColor:
				'#FFFFFF',
		},
	});