import { useMemo, useState } from 'react';

import {
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthenticationProvider';
import { AppBottomNavigation } from '@/components/AppBottomNavigation';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';

import {
	deriveMissionProgress,
	type DerivedMissionProgress,
	type DerivedMissionTask,
} from '@/features/preparedness/mission-progress-derivation';

import { useMissionProgress } from '@/features/preparedness/MissionProgressProvider';
import { usePreparednessData } from '@/features/preparedness/PreparednessDataProvider';

import {
	getMissionTaskGuidanceForDisplay,
	type ResourceHubLinkedResource,
} from '@/features/resource-hub/resource-hub-derivation';

import { useResourceHub } from '@/features/resource-hub/ResourceHubProvider';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

const LTR_ISOLATE = '\u2066';
const POP_DIRECTIONAL_ISOLATE = '\u2069';

/**
 * Preparedness missions remain public, while task completion belongs to the
 * signed-in user's private progress. I keep those two concerns visibly
 * separate here so guests can still use all of the safety guidance.
*/
export default function MissionsChecklistsScreen() {
	const { width, height } = useWindowDimensions();
	const { language, isRTL, translate } = useAppLanguage();
	const { isAuthenticated } = useAuth();

	const {
		activeLocation,
		missions,
		status: preparednessStatus,
		refresh: refreshPreparedness,
	} = usePreparednessData();

	const { catalogue: resourceHubCatalogue } = useResourceHub();

	const {
		progress,
		pendingTaskIds,
		status: missionProgressStatus,
		setTaskCompletion,
	} = useMissionProgress();

	const [savingTaskIds, setSavingTaskIds] = useState<Set<number>>(
		() => new Set(),
	);
	const [taskSaveError, setTaskSaveError] = useState<string | null>(null);

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);

	const derivedMissions = useMemo(
		() =>
			missions.map((resolution) =>
				deriveMissionProgress(
					resolution,
					progress,
					pendingTaskIds,
				),
			),
		[missions, progress, pendingTaskIds],
	);

	/*
	 * Resource relationships are resolved once for the current mission set.
	 * Duplicate resources within one mission have already been collapsed by
	 * the display derivation I added after physical-device testing.
	*/
	const relatedGuidanceByTaskId = useMemo(() => {
		const guidanceByTaskId = new Map<
			number,
			ResourceHubLinkedResource[]
		>();

		if (!resourceHubCatalogue) {
			return guidanceByTaskId;
		}

		for (const resolution of missions) {
			const missionGuidance = getMissionTaskGuidanceForDisplay(
				resourceHubCatalogue,
				resolution.tasks.map((task) => task.id),
			);

			for (const [taskId, linkedResources] of missionGuidance) {
				guidanceByTaskId.set(taskId, linkedResources);
			}
		}

		return guidanceByTaskId;
	}, [missions, resourceHubCatalogue]);

	const canPersistProgress =
		isAuthenticated && missionProgressStatus === 'ready';

	const locationName = activeLocation
		? language === 'ar'
			? activeLocation.name_ar
			: activeLocation.name_en
		: null;

	const formatNumericFraction = (
		current: number,
		total: number,
	): string => {
		const fraction = `${current} / ${total}`;

		return language === 'ar'
			? `${LTR_ISOLATE}${fraction}${POP_DIRECTIONAL_ISOLATE}`
			: fraction;
	};

	const getMissionTheme = (missionCode: string) => {
		switch (missionCode) {
			case 'household_emergency_kit':
				return {
					icon: 'cube-outline' as const,
					iconColour: '#173F5F',
					cardStyle: styles.missionCardBlue,
					iconStyle: styles.missionIconBlue,
				};

			case 'prepare_first_aid_kit':
				return {
					icon: 'medkit-outline' as const,
					iconColour: '#A84E17',
					cardStyle: styles.missionCardOrange,
					iconStyle: styles.missionIconOrange,
				};

			case 'household_communication_readiness':
				return {
					icon: 'chatbubbles-outline' as const,
					iconColour: '#65507C',
					cardStyle: styles.missionCardPurple,
					iconStyle: styles.missionIconPurple,
				};

			case 'know_local_hazards':
				return {
					icon: 'warning-outline' as const,
					iconColour: '#9A6700',
					cardStyle: styles.missionCardAmber,
					iconStyle: styles.missionIconAmber,
				};

			default:
				return {
					icon: 'shield-checkmark-outline' as const,
					iconColour: '#176B66',
					cardStyle: styles.missionCardTeal,
					iconStyle: styles.missionIconTeal,
				};
		}
	};

	const handleTaskCompletion = async (
		task: DerivedMissionTask,
	): Promise<void> => {
		if (!canPersistProgress || savingTaskIds.has(task.id)) {
			return;
		}

		setTaskSaveError(null);

		setSavingTaskIds((currentTaskIds) => {
			const nextTaskIds = new Set(currentTaskIds);
			nextTaskIds.add(task.id);
			return nextTaskIds;
		});

		try {
			await setTaskCompletion(task.id, !task.isCompleted);
		} catch {
			setTaskSaveError(
				translate('preparedness.taskSaveError'),
			);
		} finally {
			setSavingTaskIds((currentTaskIds) => {
				const nextTaskIds = new Set(currentTaskIds);
				nextTaskIds.delete(task.id);
				return nextTaskIds;
			});
		}
	};

	const renderTask = (task: DerivedMissionTask) => {
		const taskTitle =
			language === 'ar'
				? task.title_ar
				: task.title_en;

		const taskDetail =
			language === 'ar'
				? task.detail_ar
				: task.detail_en;

		const isSaving = savingTaskIds.has(task.id);
		const isDisabled = !canPersistProgress || isSaving;

		const relatedGuidance =
			relatedGuidanceByTaskId.get(task.id) ?? [];

		return (
			<View key={task.id} style={styles.taskBlock}>
				<Pressable
					accessibilityRole="checkbox"
					accessibilityLabel={taskTitle}
					accessibilityState={{
						checked: task.isCompleted,
						disabled: isDisabled,
					}}
					disabled={isDisabled}
					onPress={() => {
						void handleTaskCompletion(task);
					}}
					style={({ pressed }) => [
						styles.taskRow,
						task.isCompleted
							? styles.taskRowCompleted
							: undefined,
						pressed && !isDisabled
							? styles.taskRowPressed
							: undefined,
						isSaving
							? styles.taskRowSaving
							: undefined,
					]}
				>
					<View
						style={[
							styles.checkbox,
							task.isCompleted
								? styles.checkboxCompleted
								: undefined,
						]}
					>
						{task.isCompleted ? (
							<Ionicons
								accessible={false}
								name="checkmark"
								size={responsiveSize(
									width,
									height,
									0.047,
								)}
								color="#FFFFFF"
							/>
						) : null}
					</View>

					<View style={styles.taskContent}>
						<AppText variant="body">
							{taskTitle}
						</AppText>

						{taskDetail ? (
							<AppText variant="caption" tone="muted">
								{taskDetail}
							</AppText>
						) : null}

						<View style={styles.taskMetadata}>
							<View style={styles.pointsBadge}>
								<AppText variant="caption">
									{`${task.points} ${translate(
										'preparedness.points',
									)}`}
								</AppText>
							</View>

							{task.isPendingSync ? (
								<View style={styles.pendingBadge}>
									<Ionicons
										accessible={false}
										name="sync-outline"
										size={responsiveSize(
											width,
											height,
											0.034,
										)}
										color="#315A7D"
									/>

									<AppText
										variant="caption"
										tone="muted"
									>
										{translate(
											'preparedness.pendingSync',
										)}
									</AppText>
								</View>
							) : null}
						</View>
					</View>
				</Pressable>

				{relatedGuidance.length > 0 ? (
					<View style={styles.relatedGuidanceSection}>
						<View style={styles.relatedGuidanceHeading}>
							<Ionicons
								accessible={false}
								name="book-outline"
								size={responsiveSize(
									width,
									height,
									0.043,
								)}
								color="#315A7D"
							/>

							<AppText variant="caption" tone="muted">
								{translate(
									'preparedness.relatedGuidance',
								)}
							</AppText>
						</View>

						{relatedGuidance.map(
							({ resource, linkRole }) => {
								const resourceTitle =
									language === 'ar'
										? resource.title_ar
										: resource.title_en;

								const roleLabel =
									linkRole === 'primary'
										? translate(
											'preparedness.primaryGuidance',
										)
										: translate(
											'preparedness.supportingGuidance',
										);

								const readGuidanceLabel =
									translate(
										'resourceHub.readGuidance',
									);

								return (
									<Pressable
										key={resource.id}
										accessibilityRole="button"
										accessibilityLabel={`${readGuidanceLabel}: ${resourceTitle}`}
										onPress={() => {
											router.push({
												pathname:
													'/resource-hub-resource-detail',
												params: {
													resourceId:
														String(
															resource.id,
														),
												},
											});
										}}
										style={({ pressed }) => [
											styles.guidanceLink,
											pressed
												? styles.guidanceLinkPressed
												: undefined,
										]}
									>
										<View
											style={
												styles.guidanceLinkContent
											}
										>
											<AppText
												variant="caption"
												tone="muted"
											>
												{roleLabel}
											</AppText>

											<AppText variant="body">
												{resourceTitle}
											</AppText>
										</View>

										<View
											style={
												styles.guidanceAction
											}
										>
											<AppText variant="caption">
												{readGuidanceLabel}
											</AppText>

											<Ionicons
												accessible={false}
												name={
													isRTL
														? 'chevron-back'
														: 'chevron-forward'
												}
												size={responsiveSize(
													width,
													height,
													0.038,
												)}
												color="#315A7D"
											/>
										</View>
									</Pressable>
								);
							},
						)}
					</View>
				) : null}
			</View>
		);
	};

	const renderMission = (
		missionProgress: DerivedMissionProgress,
	) => {
		const resolution = missions.find(
			(candidate) =>
				candidate.mission.id
				=== missionProgress.missionId,
		);

		if (!resolution) {
			return null;
		}

		const missionTitle =
			language === 'ar'
				? resolution.mission.title_ar
				: resolution.mission.title_en;

		const missionDescription =
			language === 'ar'
				? resolution.mission.description_ar
				: resolution.mission.description_en;

		const theme = getMissionTheme(
			resolution.mission.code,
		);

		/*
		 * Percentage width is one of the few styles that genuinely has to be
		 * data-driven at render time.
		*/
		const progressWidth =
			`${Math.min(
				100,
				Math.max(
					0,
					missionProgress.completionPercentage,
				),
			)}%` as `${number}%`;

		return (
			<View
				key={missionProgress.missionId}
				style={[
					styles.missionCard,
					theme.cardStyle,
				]}
			>
				<View style={styles.missionHeader}>
					<View
						style={[
							styles.missionIcon,
							theme.iconStyle,
						]}
					>
						<Ionicons
							accessible={false}
							name={theme.icon}
							size={responsiveSize(
								width,
								height,
								0.062,
							)}
							color={theme.iconColour}
						/>
					</View>

					<View style={styles.missionHeaderText}>
						<AppText variant="subtitle">
							{missionTitle}
						</AppText>

						<AppText variant="caption" tone="muted">
							{missionDescription}
						</AppText>
					</View>

					{missionProgress.isComplete ? (
						<Ionicons
							accessible={false}
							name="checkmark-circle"
							size={responsiveSize(
								width,
								height,
								0.057,
							)}
							color="#15803D"
						/>
					) : null}
				</View>

				{isAuthenticated ? (
					<View style={styles.progressSection}>
						<View style={styles.metricRow}>
							<AppText variant="caption" tone="muted">
								{translate(
									'preparedness.progress',
								)}
							</AppText>

							<AppText variant="subtitle">
								{`${missionProgress.completionPercentage}%`}
							</AppText>
						</View>

						<View
							accessible
							accessibilityRole="progressbar"
							accessibilityLabel={translate(
								'preparedness.progress',
							)}
							accessibilityValue={{
								min: 0,
								max: 100,
								now: missionProgress.completionPercentage,
								text:
									`${missionProgress.completionPercentage}%`,
							}}
							style={styles.progressTrack}
						>
							<View
								style={[
									styles.progressFill,
									{
										width: progressWidth,
									},
								]}
							>
								<View
									style={
										styles.progressGloss
									}
								/>
							</View>
						</View>

						<View style={styles.metricGrid}>
							<View style={styles.metricBlock}>
								<AppText
									variant="caption"
									tone="muted"
								>
									{translate(
										'preparedness.tasksCompleted',
									)}
								</AppText>

								<AppText variant="body">
									{formatNumericFraction(
										missionProgress.completedTasks,
										missionProgress.totalTasks,
									)}
								</AppText>
							</View>

							<View style={styles.metricBlock}>
								<AppText
									variant="caption"
									tone="muted"
								>
									{translate(
										'preparedness.readinessPoints',
									)}
								</AppText>

								<AppText variant="body">
									{formatNumericFraction(
										missionProgress.earnedPoints,
										missionProgress
											.totalAvailablePoints,
									)}
								</AppText>
							</View>
						</View>

						{missionProgress.pendingTaskCount > 0 ? (
							<AppStatusMessage
								message={translate(
									'preparedness.pendingSync',
								)}
								tone="info"
							/>
						) : null}
					</View>
				) : null}

				{resolution.requiresLocation ? (
					<View style={styles.locationSection}>
						<AppStatusMessage
							message={translate(
								'preparedness.locationRequired',
							)}
							tone="info"
						/>

						<AppButton
							label={translate(
								'preparedness.chooseLocation',
							)}
							onPress={() =>
								router.push(
									'/location-selection',
								)
							}
						/>
					</View>
				) : null}

				<View style={styles.taskList}>
					{missionProgress.tasks.map(renderTask)}
				</View>
			</View>
		);
	};

	const renderScreenHeader = () => (
		<View style={styles.pageHeader}>
			<View style={styles.pageHeading}>
				<AppText variant="title">
					{translate('preparedness.title')}
				</AppText>

				<AppText variant="body" tone="muted">
					{translate('preparedness.subtitle')}
				</AppText>
			</View>

			{locationName ? (
				<View style={styles.locationContext}>
					<Ionicons
						accessible={false}
						name="location-outline"
						size={responsiveSize(
							width,
							height,
							0.04,
						)}
						color="#315A7D"
					/>

					<AppText variant="caption">
						{locationName}
					</AppText>
				</View>
			) : null}

			<Pressable
                accessibilityRole="button"
                accessibilityLabel={translate('achievements.title')}
                onPress={() => router.push('/progress-achievements')}
                style={({ pressed }) => [
                    styles.progressLink,
                    pressed ? styles.progressLinkPressed : undefined,
                ]}
            >
                <View style={styles.progressLinkContent}>
                    <View style={styles.progressLinkIcon}>
                        <Ionicons
                            accessible={false}
                            name="trophy-outline"
                            size={responsiveSize(width, height, 0.046)}
                            color="#8A5A00"
                        />
                    </View>

                    <View style={styles.progressLinkText}>
                        <AppText variant="body">
                            {translate('achievements.title')}
                        </AppText>

                        <AppText variant="caption" tone="muted">
                            {translate('home.progressDescription')}
                        </AppText>
                    </View>
                </View>

                <Ionicons
                    accessible={false}
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={responsiveSize(width, height, 0.042)}
                    color="#8A5A00"
                />
            </Pressable>
		</View>
	);

	if (preparednessStatus === 'loading') {
		return (
			<AppScreen>
				<Stack.Screen
					options={{ headerShown: false }}
				/>

				{renderScreenHeader()}

				<View style={styles.centeredState}>
					<Ionicons
						accessible={false}
						name="hourglass-outline"
						size={responsiveSize(
							width,
							height,
							0.08,
						)}
						color="#315A7D"
					/>

					<AppText
						alignment="center"
						variant="body"
						tone="muted"
					>
						{translate(
							'preparedness.loading',
						)}
					</AppText>
				</View>

				<AppBottomNavigation activeKey="missions" />
			</AppScreen>
		);
	}

	if (preparednessStatus === 'error') {
		return (
			<AppScreen>
				<Stack.Screen
					options={{ headerShown: false }}
				/>

				{renderScreenHeader()}

				<View style={styles.centeredState}>
					<AppStatusMessage
						message={translate(
							'preparedness.loadError',
						)}
						tone="error"
					/>

					<AppButton
						label={translate(
							'preparedness.retry',
						)}
						onPress={() => {
							void refreshPreparedness();
						}}
					/>
				</View>

				<AppBottomNavigation activeKey="missions" />
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
				{renderScreenHeader()}

				{!isAuthenticated ? (
					<View style={styles.guestBanner}>
						<View style={styles.guestBannerHeading}>
							<Ionicons
								accessible={false}
								name="lock-closed-outline"
								size={responsiveSize(
									width,
									height,
									0.05,
								)}
								color="#173F5F"
							/>

							<AppText variant="body">
								{translate(
									'preparedness.signInToSave',
								)}
							</AppText>
						</View>

						<AppButton
							label={translate(
								'preparedness.signIn',
							)}
							onPress={() =>
								router.push('/sign-in')
							}
						/>
					</View>
				) : null}

				{isAuthenticated
				&& missionProgressStatus === 'loading' ? (
					<AppStatusMessage
						message={translate(
							'preparedness.progressLoading',
						)}
						tone="info"
					/>
				) : null}

				{isAuthenticated
				&& missionProgressStatus === 'error' ? (
					<AppStatusMessage
						message={translate(
							'preparedness.progressLoadError',
						)}
						tone="error"
					/>
				) : null}

				{taskSaveError ? (
					<AppStatusMessage
						message={taskSaveError}
						tone="error"
					/>
				) : null}

				{derivedMissions.length === 0 ? (
					<AppStatusMessage
						message={translate(
							'preparedness.noMissions',
						)}
						tone="info"
					/>
				) : (
					derivedMissions.map(renderMission)
				)}
			</ScrollView>

			<AppBottomNavigation activeKey="missions" />
		</AppScreen>
	);
}

const createStyles = (
	width: number,
	height: number,
	isRTL: boolean,
) =>
	StyleSheet.create({
		scrollView: {
			flex: 1,
		},

		scrollContent: {
			gap: responsiveSize(width, height, 0.035),
			paddingBottom: responsiveSize(
				width,
				height,
				0.045,
			),
		},

		centeredState: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			gap: responsiveSize(width, height, 0.03),
		},

		pageHeader: {
			gap: responsiveSize(width, height, 0.018),
		},

		pageHeading: {
			gap: responsiveSize(width, height, 0.012),
		},

		locationContext: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'center',
			alignSelf: isRTL
				? 'flex-end'
				: 'flex-start',
			gap: responsiveSize(width, height, 0.01),
			paddingHorizontal: responsiveSize(
				width,
				height,
				0.02,
			),
			paddingVertical: responsiveSize(
				width,
				height,
				0.01,
			),
			backgroundColor: '#E8F0F6',
			borderRadius: responsiveSize(
				width,
				height,
				0.01,
			),
		},

		progressLink: {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: responsiveSize(width, height, 0.02),
            paddingHorizontal: responsiveSize(width, height, 0.026),
            paddingVertical: responsiveSize(width, height, 0.018),
            backgroundColor: '#FFF7D6',
            borderWidth: responsiveSize(width, height, 0.0025),
            borderColor: '#E5C05B',
            borderRadius: responsiveSize(width, height, 0.012),
        },

        progressLinkContent: {
            flex: 1,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: responsiveSize(width, height, 0.018),
        },

        progressLinkIcon: {
            width: responsiveSize(width, height, 0.075),
            height: responsiveSize(width, height, 0.075),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFF0C2',
            borderRadius: responsiveSize(width, height, 0.01),
        },

        progressLinkText: {
            flex: 1,
            gap: responsiveSize(width, height, 0.003),
        },

        progressLinkPressed: {
            opacity: 0.65,
        },

		guestBanner: {
			gap: responsiveSize(width, height, 0.022),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#EEF3F7',
			borderWidth: responsiveSize(
				width,
				height,
				0.0025,
			),
			borderColor: '#B9CBD8',
			borderRadius: responsiveSize(
				width,
				height,
				0.015,
			),
		},

		guestBannerHeading: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.018),
		},

		missionCard: {
			gap: responsiveSize(width, height, 0.03),
			padding: responsiveSize(width, height, 0.034),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(
				width,
				height,
				0.0025,
			),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(
				width,
				height,
				0.01,
			),
			borderRadius: responsiveSize(
				width,
				height,
				0.018,
			),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(
					width,
					height,
					0.007,
				),
			},
			shadowOpacity: 0.07,
			shadowRadius: responsiveSize(
				width,
				height,
				0.015,
			),
			elevation: 2,
		},

		missionCardBlue: {
			borderStartColor: '#315A7D',
		},

		missionCardOrange: {
			borderStartColor: '#B96B13',
		},

		missionCardPurple: {
			borderStartColor: '#65507C',
		},

		missionCardAmber: {
			borderStartColor: '#B27A00',
		},

		missionCardTeal: {
			borderStartColor: '#176B66',
		},

		missionHeader: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.022),
		},

		missionHeaderText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.008),
		},

		missionIcon: {
			width: responsiveSize(width, height, 0.105),
			height: responsiveSize(width, height, 0.105),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: responsiveSize(
				width,
				height,
				0.014,
			),
		},

		missionIconBlue: {
			backgroundColor: '#E4ECF5',
		},

		missionIconOrange: {
			backgroundColor: '#FBE9D8',
		},

		missionIconPurple: {
			backgroundColor: '#EEEAF5',
		},

		missionIconAmber: {
			backgroundColor: '#FFF0C2',
		},

		missionIconTeal: {
			backgroundColor: '#E7F3F1',
		},

		progressSection: {
			gap: responsiveSize(width, height, 0.018),
			paddingTop: responsiveSize(
				width,
				height,
				0.005,
			),
		},

		metricRow: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: responsiveSize(width, height, 0.025),
		},

		progressTrack: {
			width: '100%',
			height: responsiveSize(width, height, 0.025),
			alignItems: isRTL
				? 'flex-end'
				: 'flex-start',
			overflow: 'hidden',
			backgroundColor: '#D6DEE5',
			borderWidth: responsiveSize(
				width,
				height,
				0.0025,
			),
			borderColor: '#7890A3',
			borderRadius: responsiveSize(
				width,
				height,
				0.006,
			),
		},

		progressFill: {
			height: '100%',
			overflow: 'hidden',
			backgroundColor: '#174A70',
		},

		progressGloss: {
			width: '100%',
			height: '45%',
			backgroundColor: '#3B83AF',
		},

		metricGrid: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.025),
		},

		metricBlock: {
			flexGrow: 1,
			flexBasis: '42%',
			gap: responsiveSize(width, height, 0.004),
		},

		locationSection: {
			gap: responsiveSize(width, height, 0.02),
		},

		taskList: {
			gap: responsiveSize(width, height, 0.022),
		},

		taskBlock: {
			gap: responsiveSize(width, height, 0.013),
		},

		taskRow: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.025),
			minHeight: responsiveSize(width, height, 0.13),
			padding: responsiveSize(width, height, 0.027),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(
				width,
				height,
				0.002,
			),
			borderColor: '#D6DDE3',
			borderRadius: responsiveSize(
				width,
				height,
				0.012,
			),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(
					width,
					height,
					0.006,
				),
			},
			shadowOpacity: 0.08,
			shadowRadius: responsiveSize(
				width,
				height,
				0.011,
			),
			elevation: 2,
		},

		taskRowCompleted: {
			backgroundColor: '#F1F8F3',
			borderColor: '#90C9A0',
		},

		taskRowPressed: {
			opacity: 0.7,
		},

		taskRowSaving: {
			opacity: 0.6,
		},

		checkbox: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(
				width,
				height,
				0.0035,
			),
			borderColor: '#718096',
			borderRadius: responsiveSize(
				width,
				height,
				0.007,
			),
		},

		checkboxCompleted: {
			backgroundColor: '#24734B',
			borderColor: '#24734B',
		},

		taskContent: {
			flex: 1,
			gap: responsiveSize(width, height, 0.012),
		},

		taskMetadata: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			flexWrap: 'wrap',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: responsiveSize(width, height, 0.012),
		},

		pointsBadge: {
			paddingHorizontal: responsiveSize(
				width,
				height,
				0.018,
			),
			paddingVertical: responsiveSize(
				width,
				height,
				0.006,
			),
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(
				width,
				height,
				0.008,
			),
		},

		pendingBadge: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.008),
		},

		relatedGuidanceSection: {
			gap: responsiveSize(width, height, 0.012),
			paddingHorizontal: responsiveSize(
				width,
				height,
				0.01,
			),
		},

		relatedGuidanceHeading: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.01),
		},

		guidanceLink: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: responsiveSize(width, height, 0.022),
			minHeight: responsiveSize(width, height, 0.105),
			paddingHorizontal: responsiveSize(
				width,
				height,
				0.025,
			),
			paddingVertical: responsiveSize(
				width,
				height,
				0.018,
			),
			backgroundColor: '#EDF5FA',
			borderWidth: responsiveSize(
				width,
				height,
				0.002,
			),
			borderColor: '#B8D2E5',
			borderRadius: responsiveSize(
				width,
				height,
				0.01,
			),
		},

		guidanceLinkContent: {
			flex: 1,
			gap: responsiveSize(width, height, 0.004),
		},

		guidanceAction: {
			flexDirection: isRTL
				? 'row-reverse'
				: 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.006),
		},

		guidanceLinkPressed: {
			opacity: 0.65,
		},
	});