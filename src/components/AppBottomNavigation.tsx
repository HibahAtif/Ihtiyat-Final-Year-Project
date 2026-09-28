import { useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { AppText } from '@/components/AppText';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

export type AppBottomNavigationKey =
	| 'home'
	| 'missions'
	| 'alerts'
	| 'resources';

type AppBottomNavigationProps = {
	activeKey: AppBottomNavigationKey;
};

const items = [
	{
		key: 'home',
		icon: 'home-outline',
		activeIcon: 'home',
		labelKey: 'navigation.home',
		route: '/',
	},
	{
		key: 'missions',
		icon: 'checkbox-outline',
		activeIcon: 'checkbox',
		labelKey: 'navigation.missions',
		route: '/missions-checklists',
	},
	{
		key: 'alerts',
		icon: 'warning-outline',
		activeIcon: 'warning',
		labelKey: 'navigation.alerts',
		route: '/alerts',
	},
	{
		key: 'resources',
		icon: 'book-outline',
		activeIcon: 'book',
		labelKey: 'navigation.resources',
		route: '/resource-hub-discovery',
	},
] as const;

export function AppBottomNavigation({
	activeKey,
}: AppBottomNavigationProps) {
	const { width, height } = useWindowDimensions();
	const { isRTL, translate } = useAppLanguage();

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);

	return (
		<View
			accessibilityRole="tablist"
			style={styles.container}
		>
			{items.map((item) => {
				const selected = item.key === activeKey;

				return (
					<Pressable
						key={item.key}
						accessibilityRole="tab"
						accessibilityLabel={translate(item.labelKey)}
						accessibilityState={{ selected }}
						onPress={() => router.replace(item.route)}
						style={({ pressed }) => [
							styles.item,
							selected ? styles.selectedItem : undefined,
							pressed ? styles.pressedItem : undefined,
						]}
					>
						<Ionicons
							accessible={false}
							name={selected ? item.activeIcon : item.icon}
							size={responsiveSize(width, height, 0.058)}
							color={selected ? '#173F5F' : '#667085'}
						/>

						<AppText
                            variant="caption"
							tone={selected ? 'default' : 'muted'}
							alignment="center"
							numberOfLines={2}
						>
							{translate(item.labelKey)}
						</AppText>
					</Pressable>
				);
			})}
		</View>
	);
}

const createStyles = (
	width: number,
	height: number,
	isRTL: boolean,
) =>
	StyleSheet.create({
		container: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			backgroundColor: '#FFFFFF',
			borderTopWidth: responsiveSize(width, height, 0.0025),
			borderTopColor: '#D8DEE3',
		},

		item: {
			flex: 1,
			minHeight: responsiveSize(width, height, 0.15),
			alignItems: 'center',
			justifyContent: 'center',
			gap: responsiveSize(width, height, 0.008),
			paddingHorizontal: responsiveSize(width, height, 0.008),
			borderTopWidth: responsiveSize(width, height, 0.007),
			borderTopColor: 'transparent',
		},

		selectedItem: {
			borderTopColor: '#173F5F',
		},

		pressedItem: {
			backgroundColor: '#EEF3F7',
		},
	});