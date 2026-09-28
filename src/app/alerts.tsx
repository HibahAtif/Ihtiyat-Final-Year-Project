import { useMemo, useState } from 'react';

import {
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { AppBottomNavigation } from '@/components/AppBottomNavigation';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';

import { useAlertsActionPlan } from '@/features/alerts/AlertsActionPlanProvider';
import { presentSimulatedAlertNotification } from '@/features/alerts/alerts-notification-service';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

import type { AppButtonVariant } from '@/components/AppButton';
import type { ActionPlanSeverity } from '@/features/alerts/action-plan-types';
import type { ImageSourcePropType } from 'react-native';

const level1Icon =
	require('../../assets/appIcons/alert-severity-level-1.png') as ImageSourcePropType;

const level2Icon =
	require('../../assets/appIcons/alert-severity-level-2.png') as ImageSourcePropType;

const level3Icon =
	require('../../assets/appIcons/alert-severity-level-3.png') as ImageSourcePropType;

type SeverityControl = {
	severity: ActionPlanSeverity;
	labelKey: string;
	accessibilityLabelKey: string;
	variant: AppButtonVariant;
	icon: ImageSourcePropType;
	lightIcon: boolean;
};

const severityControls: readonly SeverityControl[] = [
	{
		severity: 1,
		labelKey: 'alerts.level1',
		accessibilityLabelKey: 'alerts.level1AccessibilityLabel',
		variant: 'severity1',
		icon: level1Icon,
		lightIcon: false,
	},
	{
		severity: 2,
		labelKey: 'alerts.level2',
		accessibilityLabelKey: 'alerts.level2AccessibilityLabel',
		variant: 'severity2',
		icon: level2Icon,
		lightIcon: true,
	},
	{
		severity: 3,
		labelKey: 'alerts.level3',
		accessibilityLabelKey: 'alerts.level3AccessibilityLabel',
		variant: 'severity3',
		icon: level3Icon,
		lightIcon: true,
	},
];

/**
 * Public alert-simulation screen.
 *
 * The actual catalogue, location filtering, severity state and Action Plan
 * context continue to belong to AlertsActionPlanProvider. This screen is just
 * responsible for presenting those states clearly and accessibly.
 */
export default function AlertsScreen() {
	const { width, height, fontScale } = useWindowDimensions();
	const { language, translate, isRTL } = useAppLanguage();

	const {
		activeLocation,
		applicableAlerts,
		source,
		status,
		isLoading,
		isActionPlanContextLoading,
		simulationSeverity,
		setSimulationSeverity,
		refresh,
	} = useAlertsActionPlan();

	const styles = useMemo(
		() => createStyles(width, height, fontScale, isRTL),
		[width, height, fontScale, isRTL],
	);

	const [notificationSendingAlertId, setNotificationSendingAlertId] =
		useState<number | null>(null);

	const [notificationFeedback, setNotificationFeedback] = useState<{
		alertId: number;
		status: 'sent' | 'permission-denied' | 'error';
	} | null>(null);

	const currentLocationName =
		activeLocation === null
			? translate('alerts.noLocation')
			: language === 'ar'
				? activeLocation.name_ar
				: activeLocation.name_en;

	async function handleSendSimulatedNotification(
		alert: typeof applicableAlerts[number],
	): Promise<void> {
		setNotificationSendingAlertId(alert.id);
		setNotificationFeedback(null);

		try {
			const result = await presentSimulatedAlertNotification({
				alert,
				severity: simulationSeverity,
				language,
			});

			setNotificationFeedback({
				alertId: alert.id,
				status: result.status,
			});
		} catch {
			setNotificationFeedback({
				alertId: alert.id,
				status: 'error',
			});
		} finally {
			setNotificationSendingAlertId(null);
		}
	}

	const renderPageHeader = () => (
		<View style={styles.pageHeader}>
			<View style={styles.headingRow}>
				<View style={styles.headingIcon}>
					<Ionicons
						accessible={false}
						name="warning-outline"
						size={responsiveSize(width, height, 0.065)}
						color="#A84E17"
					/>
				</View>

				<View style={styles.headingText}>
					<AppText variant="title">
						{translate('alerts.title')}
					</AppText>

					<AppText variant="body" tone="muted">
						{translate('alerts.simulationMessage')}
					</AppText>
				</View>
			</View>

			<View style={styles.contextRow}>
				<View style={styles.contextItem}>
					<Ionicons
						accessible={false}
						name="location-outline"
						size={responsiveSize(width, height, 0.042)}
						color="#315A7D"
					/>

					<View style={styles.contextText}>
						<AppText variant="caption" tone="muted">
							{translate('alerts.currentLocation')}
						</AppText>

						<AppText variant="body">
							{currentLocationName}
						</AppText>
					</View>
				</View>

				<Pressable
					accessibilityRole="button"
					accessibilityLabel={translate('alerts.refresh')}
					disabled={isLoading}
					onPress={() => {
						void refresh();
					}}
					style={({ pressed }) => [
						styles.refreshButton,
						pressed && !isLoading
							? styles.refreshButtonPressed
							: undefined,
						isLoading
							? styles.refreshButtonDisabled
							: undefined,
					]}
				>
					<Ionicons
						accessible={false}
						name="refresh"
						size={responsiveSize(width, height, 0.043)}
						color="#173F5F"
					/>

					<AppText variant="caption">
						{translate('alerts.refresh')}
					</AppText>
				</Pressable>
			</View>

			<View
				style={[
					styles.sourceStatus,
					source === 'cache'
						? styles.sourceStatusOffline
						: styles.sourceStatusOnline,
				]}
			>
				<View style={styles.sourceStatusIcon}>
					<Ionicons
						accessible={false}
						name={
							source === 'cache'
								? 'cloud-offline-outline'
								: 'cloud-done-outline'
						}
						size={responsiveSize(width, height, 0.045)}
						color={source === 'cache' ? '#8A5A00' : '#315A7D'}
					/>
				</View>

				<View style={styles.sourceStatusText}>
					<AppText variant="caption" tone="muted">
						{translate('alerts.catalogueStatus')}
					</AppText>

					<AppText variant="body">
						{source === 'cache'
							? translate('alerts.cacheSource')
							: translate('alerts.remoteSource')}
					</AppText>
				</View>
			</View>
		</View>
	);

	if (isLoading && applicableAlerts.length === 0) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				<View style={styles.loadingContent}>
					<AppText variant="title">
						{translate('alerts.title')}
					</AppText>

					<Ionicons
						accessible={false}
						name="hourglass-outline"
						size={responsiveSize(width, height, 0.08)}
						color="#315A7D"
					/>

					<AppText variant="body" tone="muted" alignment="center">
						{translate('alerts.loading')}
					</AppText>
				</View>

				<AppBottomNavigation activeKey="alerts" />
			</AppScreen>
		);
	}

	if (status === 'error') {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				<View style={styles.loadingContent}>
					<AppText variant="title">
						{translate('alerts.title')}
					</AppText>

					<AppStatusMessage
						message={translate('alerts.errorMessage')}
						tone="error"
					/>

					<AppText variant="subtitle" alignment="center">
						{translate('alerts.errorTitle')}
					</AppText>

					<AppButton
						label={translate('alerts.tryAgain')}
						onPress={() => {
							void refresh();
						}}
					/>
				</View>

				<AppBottomNavigation activeKey="alerts" />
			</AppScreen>
		);
	}

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{renderPageHeader()}

				{/* Simulations must never be mistaken for official emergency alerts. */}
				<View style={styles.simulationNotice}>
					<View style={styles.simulationNoticeIcon}>
						<Ionicons
							accessible={false}
							name="flask-outline"
							size={responsiveSize(width, height, 0.05)}
							color="#9A6700"
						/>
					</View>

					<View style={styles.simulationNoticeText}>
						<AppText variant="subtitle">
							{translate('alerts.simulationHeading')}
						</AppText>

						<AppText variant="body" tone="muted">
							{translate('alerts.simulationSeverityNotice')}
						</AppText>
					</View>
				</View>

				<View style={styles.severitySection}>
					<AppText variant="subtitle">
						{translate('alerts.simulationSeverity')}
					</AppText>

					<View
						testID="alert-severity-controls"
						style={styles.severityControls}
					>
						{severityControls.map((control) => (
							<AppButton
								key={control.severity}
								label={translate(control.labelKey)}
								accessibilityLabel={translate(
									control.accessibilityLabelKey,
								)}
								variant={control.variant}
								selected={
									simulationSeverity === control.severity
								}
								accessibilityHint={translate(
									'alerts.severityAccessibilityHint',
								)}
								icon={
									<Image
										accessible={false}
										source={control.icon}
										resizeMode="contain"
										style={[
											styles.severityIcon,
											control.lightIcon
												? styles.severityIconLight
												: styles.severityIconDark,
										]}
									/>
								}
								onPress={() => {
									setSimulationSeverity(control.severity);
								}}
							/>
						))}
					</View>

					<View style={styles.selectedSeverity}>
						<Ionicons
							accessible={false}
							name="checkmark-circle-outline"
							size={responsiveSize(width, height, 0.04)}
							color="#173F5F"
						/>

						<AppText variant="caption">
							{`${translate('alerts.selected')}: ${translate(
								`alerts.level${simulationSeverity}`,
							)}`}
						</AppText>
					</View>
				</View>

				<View style={styles.alertsSection}>
					<AppText variant="subtitle">
						{translate('alerts.alertsForLocation')}
					</AppText>

					{applicableAlerts.length === 0 ? (
						<View style={styles.emptyState}>
							<Ionicons
								accessible={false}
								name="checkmark-circle-outline"
								size={responsiveSize(width, height, 0.07)}
								color="#315A7D"
							/>

							<AppText variant="subtitle">
								{translate('alerts.noAlertsTitle')}
							</AppText>

							<AppText variant="body" tone="muted">
								{translate('alerts.noAlertsMessage')}
							</AppText>
						</View>
					) : (
						applicableAlerts.map((alert) => {
							const title =
								language === 'ar'
									? alert.title_ar
									: alert.title_en;

							const message =
								language === 'ar'
									? alert.message_ar
									: alert.message_en;

							const feedback =
								notificationFeedback?.alertId === alert.id
									? notificationFeedback
									: null;

							return (
								<View key={alert.id} style={styles.alertCard}>
									<View style={styles.alertHeader}>
										<View style={styles.alertIcon}>
											<Ionicons
												accessible={false}
												name="warning"
												size={responsiveSize(
													width,
													height,
													0.056,
												)}
												color="#B45309"
											/>
										</View>

										<View style={styles.alertHeadingText}>
											{alert.origin_type ==='simulated' ? (
												<View
													style={
														styles.simulationBadge
													}
												>
													<AppText variant="caption">
														{translate(
															'alerts.simulationBadge',
														)}
													</AppText>
												</View>
											) : null}

											<AppText variant="subtitle">
												{title}
											</AppText>
										</View>
									</View>

									<AppText variant="body" tone="muted">
										{message}
									</AppText>

									<View style={styles.alertSeverityRow}>
										<AppText variant="caption" tone="muted">
											{translate(
												'alerts.simulationSeverity',
											)}
										</AppText>

										<AppText variant="body">
											{translate(
												`alerts.level${simulationSeverity}`,
											)}
										</AppText>
									</View>

									<AppButton
										label={translate(
											'alerts.viewActionPlan',
										)}
										disabled={isActionPlanContextLoading}
										onPress={() => {
											router.push({
												pathname:
													'/emergency-action-plan',
												params: {
													alertId: String(alert.id),
													severity: String(
														simulationSeverity,
													),
												},
											});
										}}
									/>

									{alert.origin_type === 'simulated' ? (
										<AppButton
											label={translate(
												'alerts.sendSimulationNotification',
											)}
											accessibilityHint={translate(
												'alerts.sendSimulationNotificationHint',
											)}
											disabled={
												notificationSendingAlertId !==
												null
											}
											onPress={() => {
												void handleSendSimulatedNotification(
													alert,
												);
											}}
										/>
									) : null}

									{notificationSendingAlertId ===
									alert.id ? (
										<AppStatusMessage
											message={translate(
												'alerts.notificationSending',
											)}
											tone="info"
										/>
									) : null}

									{feedback ? (
										<AppStatusMessage
											message={translate(
												feedback.status === 'sent'
													? 'alerts.notificationSent'
													: feedback.status ===
														  'permission-denied'
														? 'alerts.notificationPermissionDenied'
														: 'alerts.notificationError',
											)}
											tone={
												feedback.status === 'sent'
													? 'success'
													: 'error'
											}
										/>
									) : null}

									{isActionPlanContextLoading ? (
										<AppText
											variant="caption"
											tone="muted"
											alignment="center"
										>
											{translate(
												'alerts.actionPlanPreparing',
											)}
										</AppText>
									) : null}
								</View>
							);
						})
					)}
				</View>
			</ScrollView>

			<AppBottomNavigation activeKey="alerts" />
		</AppScreen>
	);
}

const createStyles = (
	width: number,
	height: number,
	fontScale: number,
	isRTL: boolean,
) =>
	StyleSheet.create({
		scrollView: {
			flex: 1,
		},

		scrollContent: {
			gap: responsiveSize(width, height, 0.035),
			paddingBottom: responsiveSize(width, height, 0.045),
		},

		loadingContent: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			gap: responsiveSize(width, height, 0.03),
		},

		pageHeader: {
			gap: responsiveSize(width, height, 0.025),
		},

		headingRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.025),
		},

		headingIcon: {
			width: responsiveSize(width, height, 0.11),
			height: responsiveSize(width, height, 0.11),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FBE9D8',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		headingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.01),
		},

		contextRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.025),
			backgroundColor: '#EEF3F7',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#C5D3DE',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		contextItem: {
			flex: 1,
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.014),
			minWidth: responsiveSize(width, height, 0.3),
		},

		contextText: {
			flex: 1,
		},

		refreshButton: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.008),
			paddingHorizontal: responsiveSize(width, height, 0.018),
			paddingVertical: responsiveSize(width, height, 0.01),
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#9FB3C3',
			borderRadius: responsiveSize(width, height, 0.009),
			backgroundColor: '#FFFFFF',
		},

		refreshButtonPressed: {
			backgroundColor: '#E4ECF5',
		},

		refreshButtonDisabled: {
			opacity: 0.5,
		},

		sourceStatus: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.014),
			paddingHorizontal: responsiveSize(width, height, 0.022),
			paddingVertical: responsiveSize(width, height, 0.014),
			borderWidth: responsiveSize(width, height, 0.002),
			borderRadius: responsiveSize(width, height, 0.01),
		},

		sourceStatusOnline: {
			backgroundColor: '#E8F0F6',
			borderColor: '#AAC1D2',
		},

		sourceStatusOffline: {
			backgroundColor: '#FFF4D6',
			borderColor: '#E2B84B',
		},

		sourceStatusIcon: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
		},

		sourceStatusText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.002),
		},

		simulationNotice: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.03),
			backgroundColor: '#FFF4D6',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#E2B84B',
			borderStartWidth: responsiveSize(width, height, 0.01),
			borderStartColor: '#C47A08',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		simulationNoticeIcon: {
			width: responsiveSize(width, height, 0.08),
			height: responsiveSize(width, height, 0.08),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFE7A3',
			borderRadius: responsiveSize(width, height, 0.01),
		},

		simulationNoticeText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.008),
		},

		severitySection: {
			gap: responsiveSize(width, height, 0.02),
		},

		severityControls: {
			flexDirection: fontScale >= 1.3 ? 'column' : 'row',
			alignItems: 'stretch',
			gap: responsiveSize(width, height, 0.015),
		},

		severityIcon: {
			width: responsiveSize(width, height, 0.065),
			height: responsiveSize(width, height, 0.065),
		},

		severityIconDark: {
			tintColor: '#111827',
		},

		severityIconLight: {
			tintColor: '#FFFFFF',
		},

		selectedSeverity: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			gap: responsiveSize(width, height, 0.008),
			paddingHorizontal: responsiveSize(width, height, 0.018),
			paddingVertical: responsiveSize(width, height, 0.008),
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		alertsSection: {
			gap: responsiveSize(width, height, 0.02),
		},

		emptyState: {
			gap: responsiveSize(width, height, 0.018),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#D8DEE3',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		alertCard: {
			gap: responsiveSize(width, height, 0.024),
			padding: responsiveSize(width, height, 0.034),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#E1C7A9',
			borderStartWidth: responsiveSize(width, height, 0.012),
			borderStartColor: '#C46A12',
			borderRadius: responsiveSize(width, height, 0.014),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(width, height, 0.007),
			},
			shadowOpacity: 0.09,
			shadowRadius: responsiveSize(width, height, 0.014),
			elevation: 3,
		},

		alertHeader: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.02),
		},

		alertIcon: {
			width: responsiveSize(width, height, 0.09),
			height: responsiveSize(width, height, 0.09),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FBE9D8',
			borderRadius: responsiveSize(width, height, 0.01),
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
			paddingVertical: responsiveSize(width, height, 0.006),
			backgroundColor: '#FFF0C2',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#DDAA35',
			borderRadius: responsiveSize(width, height, 0.007),
		},

		alertSeverityRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: responsiveSize(width, height, 0.02),
			paddingTop: responsiveSize(width, height, 0.012),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#E5E7EB',
		},
	});