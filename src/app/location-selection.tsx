import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { LocationCatalogueSelector } from '@/components/LocationCatalogueSelector';
import { AppScreen } from '@/components/AppScreen';
import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';
import { useActiveLocation } from '@/location/ActiveLocationProvider';
import { resolveCurrentLocationHazards } from '@/location/automatic-location-resolution';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { loadActiveLocations } from '@/profile/profile-service';
import type { LocationRecord } from '@/profile/profile-types';
import { responsiveSize } from '@/utils/responsive-sizing';

type ManualCatalogueStatus = 'idle' | 'loading' | 'ready' | 'error';
type AutomaticLocationStatus = 'idle' | 'loading' | 'fallback' | 'error';
type SaveStatus = 'idle' | 'saving' | 'success' | 'partial' | 'error';

type AutomaticFallbackReason =
	| 'services-disabled'
	| 'permission-denied'
	| 'position-unavailable'
	| 'reverse-geocoding-failed'
	| 'unsupported-location';

/**
 * Shared location-selection route for guests and authenticated accounts.
 * Automatic GPS resolution and manual catalogue selection still meet at the
 * same confirmation boundary, so persistence behaviour is unchanged.
 */
export default function LocationSelectionScreen() {
	const { width, height } = useWindowDimensions();
	const { language, isRTL, translate } = useAppLanguage();
	const { activeLocation, isLoading: isActiveLocationLoading, confirmLocation } =
		useActiveLocation();

	const [candidateLocation, setCandidateLocation] = useState<LocationRecord | null>(null);
	const [candidateSource, setCandidateSource] = useState<'automatic' | 'manual' | null>(null);
	const [manualMode, setManualMode] = useState(false);
	const [locations, setLocations] = useState<LocationRecord[]>([]);
	const [catalogueStatus, setCatalogueStatus] = useState<ManualCatalogueStatus>('idle');
	const [automaticStatus, setAutomaticStatus] = useState<AutomaticLocationStatus>('idle');
	const [fallbackReason, setFallbackReason] = useState<AutomaticFallbackReason | null>(null);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);

	const LTR_ISOLATE = '\u2066';
	const POP_DIRECTIONAL_ISOLATE = '\u2069';

	const getLocationName = (location: LocationRecord): string =>
		language === 'ar' ? location.name_ar : location.name_en;

	const formatLocationCode = (code: string): string =>
		language === 'ar' ? `${LTR_ISOLATE}${code}${POP_DIRECTIONAL_ISOLATE}` : code;

	const getLocationDescription = (location: LocationRecord): string => {
		if (location.official_code === '0124') {
			return translate('location.jeddahPilot');
		}

		return `${translate('location.locationCode')}: ${formatLocationCode(location.official_code)}`;
	};

	const getFallbackMessage = (reason: AutomaticFallbackReason): string => {
		const translationKeys: Record<AutomaticFallbackReason, string> = {
			'services-disabled': 'location.servicesDisabled',
			'permission-denied': 'location.permissionDenied',
			'position-unavailable': 'location.positionUnavailable',
			'reverse-geocoding-failed': 'location.reverseGeocodingFailed',
			'unsupported-location': 'location.unsupportedLocation',
		};

		return translate(translationKeys[reason]);
	};

	/**
	 * The manual catalogue is public and intentionally independent from the
	 * authenticated profile provider. It is loaded only when manual selection
	 * is requested and then reused for the remainder of the screen session.
	*/
	const loadManualCatalogue = async (): Promise<void> => {
		if (catalogueStatus === 'ready') {
			return;
		}

		setCatalogueStatus('loading');

		try {
			const loadedLocations = await loadActiveLocations();
			setLocations(loadedLocations);
			setCatalogueStatus('ready');
		} catch {
			setCatalogueStatus('error');
		}
	};

	const handleChooseManually = (): void => {
		setManualMode(true);
		setAutomaticStatus('idle');
		setFallbackReason(null);
		setSaveStatus('idle');
		void loadManualCatalogue();
	};

	/**
	 * Automatic selection continues to use the tested GPS → Geoapify → curated
	 * catalogue pipeline. Expected permission/location failures fall back to the
	 * same manual selector rather than being treated as application errors.
	 */
	const handleUseCurrentLocation = async (): Promise<void> => {
		setAutomaticStatus('loading');
		setFallbackReason(null);
		setCandidateLocation(null);
		setCandidateSource(null);
		setSaveStatus('idle');

		try {
			const result = await resolveCurrentLocationHazards();

			if (result.status === 'manual-selection-required') {
				setAutomaticStatus('fallback');
				setFallbackReason(result.reason);
				setManualMode(true);
				await loadManualCatalogue();
				return;
			}

			setCandidateLocation(result.match.location);
			setCandidateSource('automatic');
			setManualMode(false);
			setAutomaticStatus('idle');
		} catch {
			// Unexpected service failures remain distinct from normal manual fallbacks.
			setAutomaticStatus('error');
			setFallbackReason(null);
		}
	};

	const handleManualLocationPress = (location: LocationRecord): void => {
		setCandidateLocation(location);
		setCandidateSource('manual');
		setSaveStatus('idle');
	};

	/**
	 * Both automatic and manual proposals are confirmed through
	 * ActiveLocationProvider so guest/account persistence remains identical.
	 */
	const handleConfirmLocation = async (): Promise<void> => {
		if (!candidateLocation) {
			return;
		}

		setSaveStatus('saving');

		try {
			const result = await confirmLocation(candidateLocation);
			setSaveStatus(result.localPersisted ? 'success' : 'partial');
		} catch {
			setSaveStatus('error');
		}
	};

	const manualSelectedLocationId =
		candidateSource === 'manual'
			? candidateLocation?.id ?? null
			: activeLocation?.id ?? null;

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />
			<AppHeader showBackButton />

			<KeyboardAvoidingView
				style={styles.keyboardAvoidingView}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={0}
			>
				<ScrollView
					contentContainerStyle={styles.container}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.pageHeader}>
						<View style={styles.pageHeaderIcon}>
							<Ionicons
								accessible={false}
								name="location-outline"
								size={responsiveSize(width, height, 0.06)}
								color="#315A7D"
							/>
						</View>

						<View style={styles.pageHeaderText}>
							<AppText variant="title">{translate('location.title')}</AppText>
							<AppText variant="body" tone="muted">
								{translate('location.subtitle')}
							</AppText>
						</View>
					</View>

					<View style={styles.currentLocationCard}>
						<View style={styles.sectionHeading}>
							<View style={styles.sectionIconBlue}>
								<Ionicons
									accessible={false}
									name="navigate-outline"
									size={responsiveSize(width, height, 0.042)}
									color="#315A7D"
								/>
							</View>
							<AppText variant="subtitle">{translate('location.currentLocationTitle')}</AppText>
						</View>

						{isActiveLocationLoading ? (
							<AppStatusMessage message={translate('location.loadingLocations')} />
						) : activeLocation ? (
							<View style={styles.locationSummary}>
								<AppText variant="subtitle">{getLocationName(activeLocation)}</AppText>
								<AppText variant="caption" tone="muted">
									{getLocationDescription(activeLocation)}
								</AppText>
							</View>
						) : (
							<AppStatusMessage message={translate('location.noLocationSelected')} />
						)}
					</View>

					<View style={styles.automaticCard}>
						<View style={styles.sectionHeading}>
							<View style={styles.sectionIconTeal}>
								<Ionicons
									accessible={false}
									name="locate-outline"
									size={responsiveSize(width, height, 0.044)}
									color="#176B66"
								/>
							</View>

							<View style={styles.sectionHeadingText}>
								<AppText variant="subtitle">{translate('location.useCurrentLocation')}</AppText>
								<AppText variant="body" tone="muted">
									{translate('location.useCurrentLocationDescription')}
								</AppText>
							</View>
						</View>

						<AppButton
							label={
								automaticStatus === 'loading'
									? translate('location.detectingLocation')
									: translate('location.useCurrentLocation')
							}
							disabled={automaticStatus === 'loading' || saveStatus === 'saving'}
							onPress={() => void handleUseCurrentLocation()}
						/>

						{fallbackReason ? (
							<AppStatusMessage message={getFallbackMessage(fallbackReason)} />
						) : null}

						{automaticStatus === 'error' ? (
							<AppStatusMessage
								tone="error"
								message={translate('location.automaticLocationError')}
							/>
						) : null}
					</View>

					<View style={styles.manualCard}>
						<View style={styles.sectionHeading}>
							<View style={styles.sectionIconAmber}>
								<Ionicons
									accessible={false}
									name="list-outline"
									size={responsiveSize(width, height, 0.044)}
									color="#8A5A00"
								/>
							</View>

							<View style={styles.sectionHeadingText}>
								<AppText variant="subtitle">{translate('location.chooseManually')}</AppText>
								<AppText variant="body" tone="muted">
									{translate('location.manualDescription')}
								</AppText>
							</View>
						</View>

						{!manualMode ? (
							<AppButton
								label={translate('location.chooseManually')}
								disabled={saveStatus === 'saving'}
								onPress={handleChooseManually}
							/>
						) : null}

						{manualMode ? (
							<View style={styles.manualContent}>
								{catalogueStatus === 'loading' ? (
									<AppStatusMessage message={translate('location.loadingLocations')} />
								) : null}

								{catalogueStatus === 'error' ? (
									<>
										<AppStatusMessage
											tone="error"
											message={translate('location.locationLoadError')}
										/>
										<AppButton
											label={translate('profile.retry')}
											onPress={() => void loadManualCatalogue()}
										/>
									</>
								) : null}

								{catalogueStatus === 'ready' ? (
									<LocationCatalogueSelector
										locations={locations}
										selectedLocationId={manualSelectedLocationId}
										onSelect={handleManualLocationPress}
										disabled={saveStatus === 'saving'}
									/>
								) : null}
							</View>
						) : null}
					</View>

					{candidateLocation ? (
						<View style={styles.confirmationCard}>
							<View style={styles.sectionHeading}>
								<View style={styles.confirmationIcon}>
									<Ionicons
										accessible={false}
										name="checkmark-circle-outline"
										size={responsiveSize(width, height, 0.044)}
										color="#176B66"
									/>
								</View>

								<AppText variant="subtitle">
									{translate(
										candidateSource === 'automatic'
											? 'location.detectedLocationTitle'
											: 'location.selectedLocationTitle',
									)}
								</AppText>
							</View>

							<View style={styles.candidateSummary}>
								<AppText variant="subtitle">{getLocationName(candidateLocation)}</AppText>
								<AppText variant="caption" tone="muted">
									{getLocationDescription(candidateLocation)}
								</AppText>
							</View>

							<AppButton
								label={
									saveStatus === 'saving'
										? translate('location.savingLocation')
										: translate('location.confirmLocation')
								}
								disabled={saveStatus === 'saving'}
								onPress={() => void handleConfirmLocation()}
							/>

							{saveStatus === 'success' ? (
								<AppStatusMessage tone="success" message={translate('location.saveSuccess')} />
							) : null}

							{saveStatus === 'partial' ? (
								<AppStatusMessage message={translate('location.localCacheWarning')} />
							) : null}

							{saveStatus === 'error' ? (
								<AppStatusMessage tone="error" message={translate('location.saveError')} />
							) : null}
						</View>
					) : null}
				</ScrollView>
			</KeyboardAvoidingView>
		</AppScreen>
	);
}

const createStyles = (
		width: number,
		height: number, 
		isRTL: boolean

	) => StyleSheet.create({

		keyboardAvoidingView: {
			flex: 1,
		},

		container: {
			flexGrow: 1,
			gap: responsiveSize(width, height, 0.03),
			paddingBottom: responsiveSize(width, height, 0.08),
		},

		pageHeader: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.02),
		},

		pageHeaderIcon: {
			width: responsiveSize(width, height, 0.1),
			height: responsiveSize(width, height, 0.1),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.011),
		},

		pageHeaderText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.01),
		},

		currentLocationCard: {
			gap: responsiveSize(width, height, 0.018),
			padding: responsiveSize(width, height, 0.026),
			backgroundColor: '#F1F6FA',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#B9CBD8',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		automaticCard: {
			gap: responsiveSize(width, height, 0.022),
			padding: responsiveSize(width, height, 0.03),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#C9D8D5',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#176B66',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		manualCard: {
			gap: responsiveSize(width, height, 0.022),
			padding: responsiveSize(width, height, 0.03),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#E3D7B5',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#B27A00',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		confirmationCard: {
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.03),
			backgroundColor: '#EFF8F5',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#9DCFC5',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		sectionHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
		},

		sectionHeadingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.006),
		},

		sectionIconBlue: {
			width: responsiveSize(width, height, 0.068),
			height: responsiveSize(width, height, 0.068),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		sectionIconTeal: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		sectionIconAmber: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		confirmationIcon: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#DDF0EB',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		locationSummary: {
			gap: responsiveSize(width, height, 0.005),
		},

		manualContent: {
			gap: responsiveSize(width, height, 0.016),
		},

		candidateSummary: {
			gap: responsiveSize(width, height, 0.005),
			paddingHorizontal: responsiveSize(width, height, 0.004),
		},
	});
