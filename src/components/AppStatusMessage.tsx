import {
	useMemo,
} from 'react';

import {
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';

import { AppText } from './AppText';
import { responsiveSize } from '@/utils/responsive-sizing';


type AppStatusMessageTone =
	| 'info'
	| 'success'
	| 'error';


type AppStatusMessageProps = {
	message: string;
	tone?: AppStatusMessageTone;
};


/**
 * Shared non-colour-only status message.
 *
 * The message text always communicates the state directly. Colour is only a
 * secondary visual cue, so meaning is not dependent on colour perception.
 */
export function AppStatusMessage({
	message,
	tone = 'info',
}: AppStatusMessageProps) {
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

	const toneStyle =
		styles[tone];

	return (
		<View
			accessibilityLiveRegion="polite"
			style={[
				styles.container,
				toneStyle,
			]}
		>
			<AppText
				variant="caption"
				tone={
					tone === 'error'
						? 'error'
						: 'default'
				}
			>
				{message}
			</AppText>
		</View>
	);
}


const createStyles = (
	width: number,
	height: number,
) =>
	StyleSheet.create({
		container: {
			paddingHorizontal:
				responsiveSize(
					width,
					height,
					0.035,
				),

			paddingVertical:
				responsiveSize(
					width,
					height,
					0.025,
				),

			borderWidth:
				responsiveSize(
					width,
					height,
					0.0025,
				),

			borderRadius:
				responsiveSize(
					width,
					height,
					0.025,
				),
		},

		info: {
			backgroundColor:
				'#EFF6FF',
			borderColor:
				'#93C5FD',
		},

		success: {
			backgroundColor:
				'#ECFDF3',
			borderColor:
				'#86EFAC',
		},

		error: {
			backgroundColor:
				'#FEF3F2',
			borderColor:
				'#FDA29B',
		},
	});