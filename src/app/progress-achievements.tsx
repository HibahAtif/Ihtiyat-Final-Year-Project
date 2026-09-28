import { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';

import { useAuth } from '@/auth/AuthenticationProvider';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';
import { useAchievements } from '@/features/achievements/AchievementProvider';
import type { AchievementDefinition } from '@/features/achievements/achievement-types';
import { useMissionProgress } from '@/features/preparedness/MissionProgressProvider';
import { derivePreparednessProgressSummary } from '@/features/preparedness/preparedness-progress-summary';
import { usePreparednessData } from '@/features/preparedness/PreparednessDataProvider';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

/**
 * Displays public achievement milestones and private earned state for the
 * signed-in account.
 *
 * Achievement eligibility is deliberately not calculated here. I have made
 * PostgreSQL remain authoritative for creating user achievement records; this screen
 * only presents the state returned by the providers.
 */
export default function ProgressAchievementsScreen() {
	const { width, height } = useWindowDimensions();
	const { language, isRTL, translate } = useAppLanguage();
	const { isAuthenticated } = useAuth();

	const {
		definitions,
		earnedAchievements,
		catalogueStatus,
		earnedStatus,
		refresh,
	} = useAchievements();

	const { missions, status: preparednessStatus } = usePreparednessData();

	const {
		progress,
		pendingTaskIds,
		status: missionProgressStatus,
	} = useMissionProgress();

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);

	// This Set only indexes trusted provider state. It does not award anything.
	const earnedAchievementIds = useMemo(
		() => new Set(earnedAchievements.map(({ achievement }) => achievement.id)),
		[earnedAchievements],
	);

	const earnedCount = earnedAchievements.length;

	const preparednessSummary = useMemo(
		() => derivePreparednessProgressSummary(missions, progress, pendingTaskIds),
		[missions, progress, pendingTaskIds],
	);

	// Recent history is intentionally small so this remains a milestone summary, not an activity log.
	const recentAchievements = useMemo(
		() =>
			[...earnedAchievements]
				.sort(
					(left, right) =>
						new Date(right.earned_at).getTime() -
						new Date(left.earned_at).getTime(),
				)
				.slice(0, 3),
		[earnedAchievements],
	);

	/**
	 * Achievement awards may be created by database triggers after completing
	 * Missions or Quiz attempts. Refreshing on focus makes newly awarded
	 * milestones visible without coupling those features to this screen.
	*/
	useFocusEffect(
		useCallback(() => {
			if (!isAuthenticated) {
				return;
			}

			void refresh();
		}, [isAuthenticated, refresh]),
	);

	const LTR_ISOLATE = '\u2066';
	const POP_DIRECTIONAL_ISOLATE = '\u2069';

	function formatNumericFraction(current: number, total: number): string {
		const fraction = `${current} / ${total}`;
		return isRTL
			? `${LTR_ISOLATE}${fraction}${POP_DIRECTIONAL_ISOLATE}`
			: fraction;
	}

	function formatAchievementDate(value: string, currentLanguage: 'en' | 'ar'): string {
		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return new Intl.DateTimeFormat(
			currentLanguage === 'ar' ? 'ar-SA' : 'en-GB',
			{
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				timeZone: 'UTC',
			},
		).format(date);
	}

	/**
	 * Guests can browse every public milestone. Earned/not-earned state is only
	 * shown after private achievement data has loaded for an authenticated user.
	 */
	const renderAchievement = (achievement: AchievementDefinition) => {
		const title =
			language === 'ar' ? achievement.title_ar : achievement.title_en;

		const description =
			language === 'ar'
				? achievement.description_ar
				: achievement.description_en;

		const isEarned = earnedAchievementIds.has(achievement.id);

		return (
			<AppCard key={achievement.id}>
				<View style={styles.achievementRow}>
					<View
						style={[
							styles.achievementIcon,
							isEarned
								? styles.achievementIconEarned
								: styles.achievementIconLocked,
						]}
					>
						<Ionicons
							accessible={false}
							name={isEarned ? 'trophy' : 'trophy-outline'}
							size={responsiveSize(width, height, 0.048)}
							color={isEarned ? '#9A6A00' : '#64748B'}
						/>
					</View>

					<View style={styles.achievementContent}>
						<AppText variant="subtitle">
							{title}
						</AppText>

						<AppText variant="body" tone="muted">
							{description}
						</AppText>

						{isAuthenticated && earnedStatus === 'ready' ? (
							<View
								style={[
									styles.achievementState,
									isEarned
										? styles.achievementStateEarned
										: styles.achievementStateLocked,
								]}
							>
								<AppText
									variant="caption"
									tone={isEarned ? 'default' : 'muted'}
								>
									{isEarned
										? `✓ ${translate('achievements.earned')}`
										: `○ ${translate('achievements.notEarned')}`}
								</AppText>
							</View>
						) : null}
					</View>
				</View>
			</AppCard>
		);
	};

	// Public catalogue state can gate this screen; private account state cannot.
	if (catalogueStatus === 'loading') {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />
				<AppHeader showBackButton />

				<View style={styles.centeredState}>
					<View style={styles.stateIcon}>
						<Ionicons
							accessible={false}
							name="trophy-outline"
							size={responsiveSize(width, height, 0.07)}
							color="#9A6A00"
						/>
					</View>

					<AppText variant="body" tone="muted" alignment="center">
						{translate('achievements.loading')}
					</AppText>
				</View>
			</AppScreen>
		);
	}

	if (catalogueStatus === 'error') {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />
				<AppHeader showBackButton />

				<View style={styles.centeredState}>
					<View style={styles.stateIconError}>
						<Ionicons
							accessible={false}
							name="alert-circle-outline"
							size={responsiveSize(width, height, 0.07)}
							color="#A84E17"
						/>
					</View>

					<AppStatusMessage
						message={translate('achievements.loadError')}
						tone="error"
					/>

					<AppButton
						label={translate('achievements.retry')}
						onPress={() => {
							void refresh();
						}}
					/>
				</View>
			</AppScreen>
		);
	}

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />
			<AppHeader showBackButton />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.pageHeader}>
					<View style={styles.pageHeaderIcon}>
						<Ionicons
							accessible={false}
							name="trophy-outline"
							size={responsiveSize(width, height, 0.062)}
							color="#9A6A00"
						/>
					</View>

					<View style={styles.pageHeaderText}>
						<AppText variant="title">
							{translate('achievements.title')}
						</AppText>

						<AppText variant="body" tone="muted">
							{translate('achievements.subtitle')}
						</AppText>
					</View>
				</View>

				{!isAuthenticated ? (
					<AppCard>
						<View style={styles.guestContent}>
							<View style={styles.guestIcon}>
								<Ionicons
									accessible={false}
									name="person-outline"
									size={responsiveSize(width, height, 0.046)}
									color="#315A7D"
								/>
							</View>

							<View style={styles.guestText}>
								<AppText variant="body">
									{translate('achievements.signInToView')}
								</AppText>
							</View>
						</View>

						<AppButton
							label={translate('achievements.signIn')}
							onPress={() => router.push('/sign-in')}
						/>
					</AppCard>
				) : null}

				{isAuthenticated ? (
					<View style={styles.section}>
						<View style={styles.sectionHeading}>
							<View style={styles.progressIcon}>
								<Ionicons
									accessible={false}
									name="stats-chart-outline"
									size={responsiveSize(width, height, 0.044)}
									color="#173F5F"
								/>
							</View>

							<AppText variant="subtitle">
								{translate('achievements.missionProgress')}
							</AppText>
						</View>

						{preparednessStatus === 'loading' ||
						missionProgressStatus === 'loading' ? (
							<AppStatusMessage
								message={translate(
									'achievements.missionProgressLoading',
								)}
								tone="info"
							/>
						) : null}

						{preparednessStatus === 'error' ? (
							<AppStatusMessage
								message={translate(
									'achievements.preparednessUnavailable',
								)}
								tone="error"
							/>
						) : null}

						{missionProgressStatus === 'error' ? (
							<AppStatusMessage
								message={translate(
									'achievements.missionProgressLoadError',
								)}
								tone="error"
							/>
						) : null}

						{preparednessStatus === 'ready' &&
						missionProgressStatus === 'ready' ? (
							<AppCard>
								<View style={styles.progressCardContent}>
									<View style={styles.progressHeading}>
										<View style={styles.progressHeadingText}>
											<AppText variant="caption" tone="muted">
												{translate(
													'achievements.missionCompletion',
												)}
											</AppText>

											<AppText variant="title">
												{`${preparednessSummary.completionPercentage}%`}
											</AppText>
										</View>

										<View style={styles.pointsSummary}>
											<Ionicons
												accessible={false}
												name="star-outline"
												size={responsiveSize(
													width,
													height,
													0.038,
												)}
												color="#9A6A00"
											/>

											<AppText variant="body">
												{`${formatNumericFraction(
													preparednessSummary.earnedPoints,
													preparednessSummary.totalAvailablePoints,
												)} ${translate('preparedness.points')}`}
											</AppText>
										</View>
									</View>

									<View
										accessible
										accessibilityRole="progressbar"
										accessibilityLabel={translate(
											'achievements.missionCompletion',
										)}
										accessibilityValue={{
											min: 0,
											max: 100,
											now:
												preparednessSummary
													.completionPercentage,
											text: `${preparednessSummary.completionPercentage}%`,
										}}
										style={styles.progressTrack}
									>
										<View
											style={[
												styles.progressFill,
												{
													width: `${preparednessSummary.completionPercentage}%`,
												},
											]}
										>
											<View style={styles.progressGloss} />
										</View>
									</View>

									<View style={styles.summaryGrid}>
										<View style={styles.summaryItem}>
											<View style={styles.summaryLabel}>
												<Ionicons
													accessible={false}
													name="checkbox-outline"
													size={responsiveSize(
														width,
														height,
														0.035,
													)}
													color="#315A7D"
												/>

												<AppText
													variant="caption"
													tone="muted"
												>
													{translate(
														'achievements.tasksCompleted',
													)}
												</AppText>
											</View>

											<AppText variant="subtitle">
												{formatNumericFraction(
													preparednessSummary.completedTasks,
													preparednessSummary.totalTasks,
												)}
											</AppText>
										</View>

										<View style={styles.summaryItem}>
											<View style={styles.summaryLabel}>
												<Ionicons
													accessible={false}
													name="flag-outline"
													size={responsiveSize(
														width,
														height,
														0.035,
													)}
													color="#315A7D"
												/>

												<AppText
													variant="caption"
													tone="muted"
												>
													{translate(
														'achievements.missionsCompleted',
													)}
												</AppText>
											</View>

											<AppText variant="subtitle">
												{formatNumericFraction(
													preparednessSummary.completedMissions,
													preparednessSummary.totalMissions,
												)}
											</AppText>
										</View>
									</View>

									{preparednessSummary.pendingTaskCount > 0 ? (
										<View style={styles.pendingSync}>
											<Ionicons
												accessible={false}
												name="cloud-upload-outline"
												size={responsiveSize(
													width,
													height,
													0.035,
												)}
												color="#8A5A00"
											/>

											<AppText variant="caption" tone="muted">
												{`${translate(
													'achievements.pendingSync',
												)}: ${
													preparednessSummary
														.pendingTaskCount
												}`}
											</AppText>
										</View>
									) : null}

									<View style={styles.disclaimer}>
										<Ionicons
											accessible={false}
											name="information-circle-outline"
											size={responsiveSize(
												width,
												height,
												0.036,
											)}
											color="#64748B"
										/>

										<View style={styles.disclaimerText}>
											<AppText variant="caption" tone="muted">
												{translate(
													'achievements.completionDisclaimer',
												)}
											</AppText>
										</View>
									</View>
								</View>
							</AppCard>
						) : null}
					</View>
				) : null}

				{isAuthenticated && earnedStatus === 'loading' ? (
					<AppStatusMessage
						message={translate('achievements.progressLoading')}
						tone="info"
					/>
				) : null}

				{isAuthenticated && earnedStatus === 'error' ? (
					<AppStatusMessage
						message={translate('achievements.progressLoadError')}
						tone="error"
					/>
				) : null}

				{isAuthenticated && earnedStatus === 'ready' ? (
					<AppCard>
						<View style={styles.earnedSummary}>
							<View style={styles.earnedSummaryIcon}>
								<Ionicons
									accessible={false}
									name="trophy"
									size={responsiveSize(width, height, 0.05)}
									color="#9A6A00"
								/>
							</View>

							<AppText variant="subtitle">
								{`${translate(
									'achievements.earnedAchievements',
								)}: ${formatNumericFraction(earnedCount, definitions.length)}`}
							</AppText>
						</View>
					</AppCard>
				) : null}

				{isAuthenticated &&
				earnedStatus === 'ready' &&
				recentAchievements.length > 0 ? (
					<View style={styles.section}>
						<View style={styles.sectionHeading}>
							<View style={styles.recentIcon}>
								<Ionicons
									accessible={false}
									name="time-outline"
									size={responsiveSize(width, height, 0.044)}
									color="#315A7D"
								/>
							</View>

							<AppText variant="subtitle">
								{translate('achievements.recentAchievements')}
							</AppText>
						</View>

						<AppCard>
							<View style={styles.historyList}>
								{recentAchievements.map(
									({ achievement, earned_at }) => {
										const title =
											language === 'ar'
												? achievement.title_ar
												: achievement.title_en;

										return (
											<View
												key={achievement.id}
												style={styles.historyItem}
											>
												<View style={styles.historyIcon}>
													<Ionicons
														accessible={false}
														name="ribbon-outline"
														size={responsiveSize(
															width,
															height,
															0.04,
														)}
														color="#176B66"
													/>
												</View>

												<View style={styles.historyText}>
													<AppText variant="body">
														{`✓ ${title}`}
													</AppText>

													<AppText
														variant="caption"
														tone="muted"
													>
														{`${translate(
															'achievements.earnedOn',
														)} ${formatAchievementDate(
															earned_at,
															language,
														)}`}
													</AppText>
												</View>
											</View>
										);
									},
								)}
							</View>
						</AppCard>
					</View>
				) : null}

				{definitions.length === 0 ? (
					<AppStatusMessage
						message={translate('achievements.noAchievements')}
						tone="info"
					/>
				) : (
					<View style={styles.achievementList}>
						{definitions.map(renderAchievement)}
					</View>
				)}
			</ScrollView>
		</AppScreen>
	);
}

/**
 * AppText owns direction and text alignment. 
 * styles only handle visual structure, spacing and the screen's navy/gold achievement identity.
 */
const createStyles = (width: number, height: number, isRTL: boolean) =>
	StyleSheet.create({
		scrollContent: {
			gap: responsiveSize(width, height, 0.035),
			paddingBottom: responsiveSize(width, height, 0.1),
		},

		centeredState: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			gap: responsiveSize(width, height, 0.025),
		},

		stateIcon: {
			width: responsiveSize(width, height, 0.115),
			height: responsiveSize(width, height, 0.115),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		stateIconError: {
			width: responsiveSize(width, height, 0.115),
			height: responsiveSize(width, height, 0.115),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FBE9D8',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		pageHeader: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.022),
		},

		pageHeaderIcon: {
			width: responsiveSize(width, height, 0.105),
			height: responsiveSize(width, height, 0.105),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		pageHeaderText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.012),
		},

		guestContent: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.016),
		},

		guestIcon: {
			width: responsiveSize(width, height, 0.075),
			height: responsiveSize(width, height, 0.075),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		guestText: {
			flex: 1,
		},

		section: {
			gap: responsiveSize(width, height, 0.02),
		},

		sectionHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.014),
		},

		progressIcon: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		recentIcon: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#EAF2F8',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		progressCardContent: {
			gap: responsiveSize(width, height, 0.025),
		},

		progressHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.02),
		},

		progressHeadingText: {
			gap: responsiveSize(width, height, 0.006),
		},

		pointsSummary: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.008),
		},

		progressTrack: {
			width: '100%',
			height: responsiveSize(width, height, 0.027),
			alignItems: isRTL ? 'flex-end' : 'flex-start',
			overflow: 'hidden',
			backgroundColor: '#D6DEE5',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#7890A3',
			borderRadius: responsiveSize(width, height, 0.006),
		},

		progressFill: {
			height: '100%',
			overflow: 'hidden',
			backgroundColor: '#174A70',
			borderRightWidth: isRTL
				? 0
				: responsiveSize(width, height, 0.002),
			borderLeftWidth: isRTL
				? responsiveSize(width, height, 0.002)
				: 0,
			borderColor: '#103650',
		},

		progressGloss: {
			width: '100%',
			height: '45%',
			backgroundColor: '#3B83AF',
		},

		summaryGrid: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.03),
		},

		summaryItem: {
			flexGrow: 1,
			flexBasis: '40%',
			gap: responsiveSize(width, height, 0.006),
		},

		summaryLabel: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.007),
		},

		pendingSync: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.008),
			paddingHorizontal: responsiveSize(width, height, 0.016),
			paddingVertical: responsiveSize(width, height, 0.009),
			backgroundColor: '#FFF7D6',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#E5C05B',
			borderRadius: responsiveSize(width, height, 0.007),
		},

		disclaimer: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.009),
			paddingTop: responsiveSize(width, height, 0.012),
			borderTopWidth: responsiveSize(width, height, 0.0015),
			borderTopColor: '#E5E7EB',
		},

		disclaimerText: {
			flex: 1,
		},

		earnedSummary: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.018),
		},

		earnedSummaryIcon: {
			width: responsiveSize(width, height, 0.078),
			height: responsiveSize(width, height, 0.078),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(width, height, 0.01),
		},

		historyList: {
			gap: responsiveSize(width, height, 0.02),
		},

		historyItem: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
			paddingBottom: responsiveSize(width, height, 0.016),
			borderBottomWidth: responsiveSize(width, height, 0.0015),
			borderBottomColor: '#E5E7EB',
		},

		historyIcon: {
			width: responsiveSize(width, height, 0.065),
			height: responsiveSize(width, height, 0.065),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		historyText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.005),
		},

		achievementList: {
			gap: responsiveSize(width, height, 0.025),
		},

		achievementRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.018),
		},

		achievementIcon: {
			width: responsiveSize(width, height, 0.085),
			height: responsiveSize(width, height, 0.085),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: responsiveSize(width, height, 0.01),
		},

		achievementIconEarned: {
			backgroundColor: '#FFF0C2',
		},

		achievementIconLocked: {
			backgroundColor: '#EEF2F5',
		},

		achievementContent: {
			flex: 1,
			gap: responsiveSize(width, height, 0.012),
		},

		achievementState: {
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			paddingHorizontal: responsiveSize(width, height, 0.014),
			paddingVertical: responsiveSize(width, height, 0.006),
			borderWidth: responsiveSize(width, height, 0.002),
			borderRadius: responsiveSize(width, height, 0.007),
		},

		achievementStateEarned: {
			backgroundColor: '#EAF7EE',
			borderColor: '#8AC59A',
		},

		achievementStateLocked: {
			backgroundColor: '#F7F9FB',
			borderColor: '#CBD5E1',
		},
	});