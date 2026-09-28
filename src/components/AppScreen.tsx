// common screen container / layout

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';
import {
	SafeAreaView,
} from 'react-native-safe-area-context';

import { responsiveSize } from '../utils/responsive-sizing';

type AppScreenProps = {
	children: ReactNode;
};

/**
 * Shared top-level screen container.
 *
 * It provides safe-area handling, responsive spacing, and language-aware
 * layout direction so feature screens can focus on their own content.
 */
export function AppScreen({
	children,
}: AppScreenProps) {
	const { width, height } = useWindowDimensions();

	const styles = useMemo(
		() => createStyles(
			width,
			height,
		),
		[width, height],
	);

	return (
		<SafeAreaView
			edges={['top', 'right', 'bottom', 'left']}
			style={styles.safeArea}
		>
			<View style={styles.content}>
				{children}
			</View>
		</SafeAreaView>
	);
}

const createStyles = (
	width: number,
	height: number,
) =>
	StyleSheet.create({
		safeArea: {
			flex: 1,
			backgroundColor: '#F8FAFC',
		},

		content: {
			flex: 1,
			alignItems: 'stretch',
			paddingHorizontal: responsiveSize(
				width,
				height,
				0.052,
			),
			paddingVertical: responsiveSize(
				width,
				height,
				0.034,
			),
		},
	});