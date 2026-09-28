import { useEffect, useMemo } from 'react';
import {
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';

import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { useAlertsActionPlan } from '@/features/alerts/AlertsActionPlanProvider';
import type { ActionPlanSeverity } from '@/features/alerts/action-plan-types';
import type { DerivedActionPlan } from '@/features/alerts/alerts-action-plan-derivation';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

type SearchParamValue = string | string[] | undefined;

/**
 * Expo Router can supply one parameter in a few shapes. I reject ambiguous
 * arrays here instead of silently choosing a value at the safety boundary.
 */
function getSingleSearchParam(value: SearchParamValue): string | null {
	if (typeof value === 'string') {
		return value;
	}

	if (Array.isArray(value) && value.length === 1) {
		return value[0] ?? null;
	}

	return null;
}

function parseAlertId(value: SearchParamValue): number | null {
	const rawValue = getSingleSearchParam(value);

	if (rawValue === null || !/^\d+$/.test(rawValue)) {
		return null;
	}

	const alertId = Number(rawValue);

	if (!Number.isSafeInteger(alertId) || alertId <= 0) {
		return null;
	}

	return alertId;
}

function parseSeverity(value: SearchParamValue): ActionPlanSeverity | null {
	const rawValue = getSingleSearchParam(value);

	if (rawValue === '1') return 1;
	if (rawValue === '2') return 2;
	if (rawValue === '3') return 3;

	return null;
}

/**
 * Presents the deterministic action plan produced by AlertsActionPlanProvider.
 * The screen only formats and explains the result; ranking stays inside the
 * existing action-plan domain layer.
 */
export default function EmergencyActionPlanScreen() {
	const { width, height, fontScale } = useWindowDimensions();
	const { alertId: alertIdParam, severity: severityParam } = useLocalSearchParams();
	const { language, isRTL, translate } = useAppLanguage();

	const {
		activeLocation,
		applicableAlerts,
		source,
		status,
		isLoading,
		isActionPlanContextLoading,
		simulationSeverity,
		setSimulationSeverity,
		getActionPlan,
	} = useAlertsActionPlan();

	const styles = useMemo(
		() => createStyles(width, height, isRTL, fontScale),
		[width, height, isRTL, fontScale],
	);

	const alertId = parseAlertId(alertIdParam);
	const routeSeverity = parseSeverity(severityParam);

	// I only use this routed alert to decide whether the shared simulation state needs syncing.
	const routedAlert =
		alertId === null
			? null
			: applicableAlerts.find((alert) => alert.id === alertId) ?? null;

	const shouldSynchronizeSimulationSeverity =
		routeSeverity !== null &&
		routedAlert?.origin_type === 'simulated' &&
		routeSeverity !== simulationSeverity;

	useEffect(() => {
		if (!shouldSynchronizeSimulationSeverity || routeSeverity === null) {
			return;
		}

		setSimulationSeverity(routeSeverity);
	}, [
		routeSeverity,
		setSimulationSeverity,
		shouldSynchronizeSimulationSeverity,
	]);

	const isPreparing =
		status === 'loading' ||
		isLoading ||
		isActionPlanContextLoading ||
		shouldSynchronizeSimulationSeverity;

	let plan: DerivedActionPlan | null = null;
	let isUnavailable = false;

	if (!isPreparing) {
		if (alertId === null || routeSeverity === null || status === 'error') {
			isUnavailable = true;
		} else {
			try {
				plan = getActionPlan(alertId);
			} catch {
				// A stale or no-longer-applicable route is safer as a clear unavailable state.
				isUnavailable = true;
			}
		}
	}

	const currentLocationName =
		activeLocation === null
			? translate('alerts.noLocation')
			: language === 'ar'
				? activeLocation.name_ar
				: activeLocation.name_en;

	const sourceLabel =
		source === 'cache'
			? translate('actionPlan.cacheSource')
			: source === 'remote'
				? translate('actionPlan.remoteSource')
				: null;

	const severityStyle =
		plan?.effectiveSeverity === 3
			? styles.severityThree
			: plan?.effectiveSeverity === 2
				? styles.severityTwo
				: styles.severityOne;

	const severityIconColor =
		plan?.effectiveSeverity === 3
			? '#A9191D'
			: plan?.effectiveSeverity === 2
				? '#B74A0A'
				: '#9A6A00';

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />
			<AppHeader showBackButton />

			{isPreparing ? (
				<View style={styles.stateContainer}>
					<View style={styles.stateIcon}>
						<Ionicons
							accessible={false}
							name="hourglass-outline"
							size={responsiveSize(width, height, 0.075)}
							color="#315A7D"
						/>
					</View>

					<AppText variant="body" tone="muted" alignment="center">
						{translate('actionPlan.preparing')}
					</AppText>
				</View>
			) : isUnavailable || plan === null ? (
				<View style={styles.stateContainer}>
					<View style={styles.stateIconError}>
						<Ionicons
							accessible={false}
							name="alert-circle-outline"
							size={responsiveSize(width, height, 0.075)}
							color="#A84E17"
						/>
					</View>

					<AppText variant="subtitle" alignment="center">
						{translate('actionPlan.unavailableTitle')}
					</AppText>

					<AppText variant="body" tone="muted" alignment="center">
						{translate('actionPlan.unavailableMessage')}
					</AppText>
				</View>
			) : (
				<ScrollView
					contentContainerStyle={styles.container}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.pageHeader}>
						<View style={styles.pageHeaderIcon}>
							<Ionicons
								accessible={false}
								name="shield-checkmark-outline"
								size={responsiveSize(width, height, 0.06)}
								color="#173F5F"
							/>
						</View>

						<View style={styles.pageHeaderText}>
							<AppText variant="title">
								{translate('actionPlan.title')}
							</AppText>

							<AppText variant="body" tone="muted">
								{translate('actionPlan.rankedActions')}
							</AppText>
						</View>
					</View>

					<View style={styles.alertCard}>
						<View style={styles.alertHeading}>
							<View style={styles.alertIcon}>
								<Ionicons
									accessible={false}
									name="warning-outline"
									size={responsiveSize(width, height, 0.052)}
									color="#A84E17"
								/>
							</View>

							<View style={styles.alertHeadingText}>
								{plan.alert.origin_type === 'simulated' ? (
									<View style={styles.simulationBadge}>
										<AppText variant="caption">
											{translate('actionPlan.simulationBadge')}
										</AppText>
									</View>
								) : null}

								<AppText variant="subtitle">
									{language === 'ar'
										? plan.alert.title_ar
										: plan.alert.title_en}
								</AppText>
							</View>
						</View>

						{plan.alert.origin_type === 'simulated' ? (
							<View style={styles.simulationNotice}>
								<Ionicons
									accessible={false}
									name="flask-outline"
									size={responsiveSize(width, height, 0.036)}
									color="#8A5A00"
								/>

								<View style={styles.flexText}>
									<AppText variant="body" tone="muted">
										{translate('actionPlan.simulationNotice')}
									</AppText>
								</View>
							</View>
						) : null}
					</View>

					<View style={styles.contextCard}>
						<View style={styles.contextGrid}>
							<View style={styles.metaSection}>
								<View style={styles.metaLabel}>
									<Ionicons
										accessible={false}
										name="location-outline"
										size={responsiveSize(width, height, 0.035)}
										color="#315A7D"
									/>
									<AppText variant="caption" tone="muted">
										{translate('actionPlan.currentLocation')}
									</AppText>
								</View>

								<AppText variant="body">
									{currentLocationName}
								</AppText>
							</View>

							<View style={styles.metaSection}>
								<View style={styles.metaLabel}>
									<Ionicons
										accessible={false}
										name="speedometer-outline"
										size={responsiveSize(width, height, 0.035)}
										color={severityIconColor}
									/>
									<AppText variant="caption" tone="muted">
										{translate('actionPlan.severity')}
									</AppText>
								</View>

								<View style={[styles.severityBadge, severityStyle]}>
									<AppText variant="body">
										{translate(`alerts.level${plan.effectiveSeverity}`)}
									</AppText>
								</View>
							</View>
						</View>

						{sourceLabel !== null ? (
							<View style={styles.sourceRow}>
								<Ionicons
									accessible={false}
									name={source === 'cache' ? 'cloud-offline-outline' : 'cloud-outline'}
									size={responsiveSize(width, height, 0.038)}
									color="#315A7D"
								/>

								<View style={styles.flexText}>
									<AppText variant="caption" tone="muted">
										{translate('actionPlan.source')}
									</AppText>

									<AppText variant="body">
										{sourceLabel}
									</AppText>
								</View>
							</View>
						) : null}
					</View>

					<View style={styles.actionsSection}>
						<View style={styles.sectionHeading}>
							<View style={styles.sectionIcon}>
								<Ionicons
									accessible={false}
									name="list-outline"
									size={responsiveSize(width, height, 0.043)}
									color="#176B66"
								/>
							</View>

							<AppText variant="subtitle">
								{translate('actionPlan.rankedActions')}
							</AppText>
						</View>

						{plan.items.length === 0 ? (
							<View style={styles.emptyCard}>
								<AppText variant="subtitle">
									{translate('actionPlan.noActionsTitle')}
								</AppText>

								<AppText variant="body" tone="muted">
									{translate('actionPlan.noActionsMessage')}
								</AppText>
							</View>
						) : (
							plan.items.map((item, index) => {
								const actionTitle =
									language === 'ar'
										? item.action.title_ar
										: item.action.title_en;

								const instruction =
									language === 'ar'
										? item.action.instruction_ar
										: item.action.instruction_en;

								const reason =
									language === 'ar'
										? item.rule.reason_ar
										: item.rule.reason_en;

								const actionAccentStyle =
									index === 0
										? styles.actionAccentOrange
										: index === 1
											? styles.actionAccentBlue
											: styles.actionAccentTeal;

								return (
									<View
										key={item.action.id}
										style={[styles.actionCard, actionAccentStyle]}
									>
										<View style={styles.actionTopRow}>
											<View style={styles.priorityBadge}>
												<AppText variant="caption">
													{`${translate('actionPlan.priority')} ${index + 1}`}
												</AppText>
											</View>

											<Ionicons
												accessible={false}
												name="checkmark-circle-outline"
												size={responsiveSize(width, height, 0.047)}
												color="#176B66"
											/>
										</View>

										<AppText
											testID="action-plan-item-title"
											variant="subtitle"
										>
											{actionTitle}
										</AppText>

										<AppText variant="body">
											{instruction}
										</AppText>

										<View style={styles.reasonSection}>
											<View style={styles.reasonHeading}>
												<Ionicons
													accessible={false}
													name="information-circle-outline"
													size={responsiveSize(width, height, 0.036)}
													color="#315A7D"
												/>

												<AppText variant="caption">
													{translate('actionPlan.whyThisAction')}
												</AppText>
											</View>

											<AppText variant="body" tone="muted">
												{reason}
											</AppText>
										</View>
									</View>
								);
							})
						)}
					</View>

					<View style={styles.officialGuidanceCard}>
						<Ionicons
							accessible={false}
							name="shield-outline"
							size={responsiveSize(width, height, 0.052)}
							color="#173F5F"
						/>

						<View style={styles.flexText}>
							<AppText variant="body" tone="muted">
								{translate('actionPlan.officialGuidance')}
							</AppText>
						</View>
					</View>
				</ScrollView>
			)}
		</AppScreen>
	);
}

const createStyles = (
	width: number,
	height: number,
	isRTL: boolean,
	fontScale: number,
) =>
	StyleSheet.create({
		container: {
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
			borderRadius: responsiveSize(width, height, 0.014),
		},

		pageHeaderText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.006),
		},

		alertCard: {
			gap: responsiveSize(width, height, 0.025),
			padding: responsiveSize(width, height, 0.035),
			backgroundColor: '#FFF8E6',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#E4C56A',
			borderStartWidth: responsiveSize(width, height, 0.01),
			borderStartColor: '#B96B13',
			borderRadius: responsiveSize(width, height, 0.016),
			shadowColor: '#0F172A',
			shadowOffset: { width: 0, height: responsiveSize(width, height, 0.006) },
			shadowOpacity: 0.07,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		alertHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.018),
		},

		alertIcon: {
			width: responsiveSize(width, height, 0.082),
			height: responsiveSize(width, height, 0.082),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FBE9D8',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		alertHeadingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.012),
		},

		simulationBadge: {
			alignSelf:
				fontScale >= 1.3
					? 'stretch'
					: isRTL
						? 'flex-end'
						: 'flex-start',
			paddingHorizontal: responsiveSize(width, height, 0.018),
			paddingVertical: responsiveSize(width, height, 0.007),
			backgroundColor: '#FFD978',
			borderWidth: responsiveSize(width, height, 0.0015),
			borderColor: '#C89B24',
			borderRadius: responsiveSize(width, height, 0.006),
		},

		simulationNotice: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.01),
			paddingTop: responsiveSize(width, height, 0.015),
			borderTopWidth: responsiveSize(width, height, 0.0015),
			borderTopColor: '#E4C56A',
		},

		contextCard: {
			gap: responsiveSize(width, height, 0.025),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#EEF5F9',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#B8CFDE',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		contextGrid: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.03),
		},

		metaSection: {
			flexGrow: 1,
			flexBasis: '42%',
			minWidth: 0,
			gap: responsiveSize(width, height, 0.008),
		},

		metaLabel: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.007),
		},

		severityBadge: {
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			paddingHorizontal: responsiveSize(width, height, 0.016),
			paddingVertical: responsiveSize(width, height, 0.006),
			borderWidth: responsiveSize(width, height, 0.0015),
			borderRadius: responsiveSize(width, height, 0.006),
		},

		severityOne: {
			backgroundColor: '#FFF1B8',
			borderColor: '#D6AD2F',
		},

		severityTwo: {
			backgroundColor: '#FBE2CC',
			borderColor: '#D47A37',
		},

		severityThree: {
			backgroundColor: '#F8D7D8',
			borderColor: '#C74A4E',
		},

		sourceRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.012),
			paddingTop: responsiveSize(width, height, 0.018),
			borderTopWidth: responsiveSize(width, height, 0.0015),
			borderTopColor: '#C8D8E3',
		},

		actionsSection: {
			gap: responsiveSize(width, height, 0.02),
		},

		sectionHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.012),
		},

		sectionIcon: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		actionCard: {
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(width, height, 0.01),
			borderRadius: responsiveSize(width, height, 0.016),
			shadowColor: '#0F172A',
			shadowOffset: { width: 0, height: responsiveSize(width, height, 0.006) },
			shadowOpacity: 0.07,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		actionAccentOrange: {
			borderStartColor: '#B96B13',
		},

		actionAccentBlue: {
			borderStartColor: '#315A7D',
		},

		actionAccentTeal: {
			borderStartColor: '#176B66',
		},

		actionTopRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: responsiveSize(width, height, 0.012),
		},

		priorityBadge: {
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			paddingHorizontal: responsiveSize(width, height, 0.016),
			paddingVertical: responsiveSize(width, height, 0.006),
			backgroundColor: '#FFF0C2',
			borderWidth: responsiveSize(width, height, 0.0015),
			borderColor: '#D5AE42',
			borderRadius: responsiveSize(width, height, 0.006),
		},

		reasonSection: {
			gap: responsiveSize(width, height, 0.009),
			padding: responsiveSize(width, height, 0.02),
			backgroundColor: '#F1F6FA',
			borderStartWidth: responsiveSize(width, height, 0.006),
			borderStartColor: '#315A7D',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		reasonHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.007),
		},

		emptyCard: {
			gap: responsiveSize(width, height, 0.012),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		officialGuidanceCard: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
			padding: responsiveSize(width, height, 0.028),
			backgroundColor: '#E4ECF5',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#B7C9D8',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		flexText: {
			flex: 1,
		},

		stateContainer: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			gap: responsiveSize(width, height, 0.025),
			paddingHorizontal: responsiveSize(width, height, 0.04),
		},

		stateIcon: {
			width: responsiveSize(width, height, 0.12),
			height: responsiveSize(width, height, 0.12),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		stateIconError: {
			width: responsiveSize(width, height, 0.12),
			height: responsiveSize(width, height, 0.12),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FBE9D8',
			borderRadius: responsiveSize(width, height, 0.014),
		},
	});
