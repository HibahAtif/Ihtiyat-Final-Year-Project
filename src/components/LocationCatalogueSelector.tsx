import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';
import { AppTextInput } from '@/components/AppTextInput';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import type { LocationRecord } from '@/profile/profile-types';
import { responsiveSize } from '@/utils/responsive-sizing';

type LocationCatalogueSelectorProps = {
	locations: LocationRecord[];
	selectedLocationId: number | null;
	onSelect: (location: LocationRecord) => void;
	disabled?: boolean;
};

/**
 * Reusable searchable selector for Ihtiyat's curated Saudi location catalogue.
 *
 * Search stays local to this presentation component. The parent screen still
 * owns the selected LocationRecord and any persistence or profile behaviour.
 */
export function LocationCatalogueSelector({
	locations,
	selectedLocationId,
	onSelect,
	disabled = false,
}: LocationCatalogueSelectorProps) {

	const { width, height } = useWindowDimensions();
	const { language, isRTL, translate } = useAppLanguage();
	const [isExpanded, setIsExpanded] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);

	const selectedLocation = useMemo(
		() => locations.find((location) => location.id === selectedLocationId) ?? null,
		[locations, selectedLocationId],
	);

	const filteredLocations = useMemo(() => {
		const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

		if (!normalizedQuery) {
			return locations;
		}

		return locations.filter(
			(location) =>
				location.name_en.toLocaleLowerCase().includes(normalizedQuery) ||
				location.name_ar.includes(normalizedQuery)
		);
	}, [locations, searchQuery]);

	const getLocationName = (location: LocationRecord): string =>
		language === 'ar' ? location.name_ar : location.name_en;

	const handleSelect = (location: LocationRecord): void => {
		onSelect(location);
		setSearchQuery('');
		setIsExpanded(false);
	};

	return (
		<View style={styles.container}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={translate('location.chooseManually')}
				accessibilityState={{ disabled, expanded: isExpanded }}
				disabled={disabled}
				onPress={() => setIsExpanded((current) => !current)}
				style={({ pressed }) => [
					styles.trigger,
					isExpanded ? styles.triggerExpanded : undefined,
					pressed && !disabled ? styles.triggerPressed : undefined,
					disabled ? styles.disabled : undefined,
				]}
			>
				<View style={styles.triggerIcon}>
					<Ionicons
						accessible={false}
						name="location-outline"
						size={responsiveSize(width, height, 0.046)}
						color="#315A7D"
					/>
				</View>

				<View style={styles.triggerText}>
					<AppText variant="caption" tone="muted">
						{selectedLocation
							? translate('location.selectedLocationTitle')
							: translate('location.chooseManually')}
					</AppText>

					<AppText variant="body">
						{selectedLocation
							? getLocationName(selectedLocation)
							: translate('location.manualDescription')}
					</AppText>
				</View>

				<Ionicons
					accessible={false}
					name={isExpanded ? 'chevron-up' : 'chevron-down'}
					size={responsiveSize(width, height, 0.04)}
					color="#64748B"
				/>
			</Pressable>

			{isExpanded ? (
				<View style={styles.dropdown}>
					<AppTextInput
						label={translate('location.searchLabel')}
						placeholder={translate('location.searchPlaceholder')}
						value={searchQuery}
						onChangeText={setSearchQuery}
						autoCorrect={false}
						returnKeyType="search"
					/>

					{filteredLocations.length === 0 ? (
						<AppStatusMessage message={translate('location.noSearchResults')} />
					) : (
						<ScrollView
							style={styles.optionsScroll}
							contentContainerStyle={styles.optionsContent}
							keyboardShouldPersistTaps="handled"
							keyboardDismissMode={
								Platform.OS === 'ios' 
									? 'interactive' 
									: 'on-drag'
							}
							nestedScrollEnabled
							showsVerticalScrollIndicator
						>
							{filteredLocations.map((location) => {
								const selected = selectedLocationId === location.id;

								return (
									<Pressable
										key={location.id}
										accessibilityRole="radio"
										accessibilityLabel={getLocationName(location)}
										accessibilityState={{ selected }}
										onPress={() => handleSelect(location)}
										style={({ pressed }) => [
											styles.option,
											selected ? styles.optionSelected : undefined,
											pressed ? styles.optionPressed : undefined,
										]}
									>
										<View style={styles.optionText}>
											<AppText variant="body">
												{getLocationName(location)}
											</AppText>
										</View>

										<Ionicons
											accessible={false}
											name={selected ? 'checkmark-circle' : 'ellipse-outline'}
											size={responsiveSize(width, height, 0.045)}
											color={selected ? '#176B66' : '#718096'}
										/>
									</Pressable>
								);
							})}
						</ScrollView>
					)}
				</View>
			) : null}
		</View>
	);
}

const createStyles = (width: number, height: number, isRTL: boolean) =>
	StyleSheet.create({

		container: {
			gap: responsiveSize(width, height, 0.014),
		},

		trigger: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.016),
			minHeight: responsiveSize(width, height, 0.12),
			paddingHorizontal: responsiveSize(width, height, 0.024),
			paddingVertical: responsiveSize(width, height, 0.018),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#B9C7D2',
			borderRadius: responsiveSize(width, height, 0.01),
		},

		triggerExpanded: {
			borderColor: '#315A7D',
			backgroundColor: '#F7FAFC',
		},

		triggerPressed: {
			backgroundColor: '#EEF3F7',
		},

		disabled: {
			opacity: 0.55,
		},

		triggerIcon: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		triggerText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.003),
		},

		dropdown: {
			gap: responsiveSize(width, height, 0.016),
			padding: responsiveSize(width, height, 0.02),
			backgroundColor: '#F7F9FB',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#C7D3DC',
			borderRadius: responsiveSize(width, height, 0.01),
		},

		optionsScroll: {
			maxHeight: responsiveSize(width, height, 0.72),
		},

		optionsContent: {
			gap: responsiveSize(width, height, 0.01),
			paddingBottom: responsiveSize(width, height, 0.008),
		},

		option: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.014),
			paddingHorizontal: responsiveSize(width, height, 0.02),
			paddingVertical: responsiveSize(width, height, 0.014),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#D5DEE5',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		optionSelected: {
			backgroundColor: '#EAF5F3',
			borderColor: '#72B7AE',
		},

		optionPressed: {
			opacity: 0.7,
		},

		optionText: {
			flex: 1,
		},
	});
