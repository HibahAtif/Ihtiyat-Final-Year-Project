import { useMemo, useState } from 'react';
import type { ViewStyle } from 'react-native';

import {
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';

import { supabaseClient } from '@/lib/supabase-config';
import { useAuth } from '@/auth/AuthenticationProvider';
import { AppBottomNavigation } from '@/components/AppBottomNavigation';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { useMissionProgress } from '@/features/preparedness/MissionProgressProvider';
import { usePreparednessData } from '@/features/preparedness/PreparednessDataProvider';
import { derivePreparednessProgressSummary } from '@/features/preparedness/preparedness-progress-summary';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

const LTR_ISOLATE = '\u2066';
const POP_DIRECTIONAL_ISOLATE = '\u2069';

/**
 * Main Ihtiyat dashboard.
 *
 * Home is deliberately focused on the things a user is likely to need next:
 * current location, preparedness progress, the next mission entry point and a
 * small set of secondary actions. Alerts and resources live in the persistent
 * bottom navigation rather than being repeated here.
 */
export default function IndexScreen() {
	const { width, height, fontScale } = useWindowDimensions();

	const {
		language,
		isRTL,
		translate,
		toggleLanguage,
	} = useAppLanguage();

	const { isAuthenticated } = useAuth();
	const [isSigningOut, setIsSigningOut] = useState(false);

	const {
		activeLocation,
		missions,
		status: preparednessStatus,
	} = usePreparednessData();

	const {
		progress,
		pendingTaskIds,
		status: missionProgressStatus,
	} = useMissionProgress();

	// At larger system text sizes the quick actions become full-width rows.
	const useSingleColumnQuickActions = fontScale >= 1.4 || width < 400;

	const styles = useMemo(
		() =>
			createStyles(
				width,
				height,
				isRTL,
				useSingleColumnQuickActions,
			),
		[
			width,
			height,
			isRTL,
			useSingleColumnQuickActions,
		],
	);

	const progressSummary = useMemo(
		() =>
			derivePreparednessProgressSummary(
				missions,
				progress,
				pendingTaskIds,
			),
		[missions, progress, pendingTaskIds],
	);

	const progressFillStyle = useMemo<ViewStyle>(
		() => ({
			width: `${progressSummary.completionPercentage}%`,
		}),
		[progressSummary.completionPercentage],
	);

	const locationName = activeLocation
		? language === 'ar'
			? activeLocation.name_ar
			: activeLocation.name_en
		: translate('location.noLocationSelected');

	const formatNumericFraction = (
		current: number,
		total: number,
	): string => {
		const fraction = `${current} / ${total}`;

		// Arabic needs the fraction isolated or Android may visually reverse it.
		return language === 'ar'
			? `${LTR_ISOLATE}${fraction}${POP_DIRECTIONAL_ISOLATE}`
			: fraction;
	};

	const progressReady =
		isAuthenticated
		&& preparednessStatus === 'ready'
		&& missionProgressStatus === 'ready';

	const progressLoading =
		isAuthenticated
		&& (
			preparednessStatus === 'loading'
			|| missionProgressStatus === 'loading'
		);

	const accountLabel = isAuthenticated
		? translate('home.profileAction')
		: translate('authentication.signIn');

	const accountQuickAction = {
		key: 'account',
		title: isAuthenticated
			? translate('home.profileAction')
			: translate('authentication.createAccount'),
		description: isAuthenticated
			? translate('home.profileDescription')
			: translate('home.createAccountDescription'),
		icon: isAuthenticated
			? 'person-outline' as const
			: 'person-add-outline' as const,
		iconColour: '#4a3c5f',
		iconStyle: styles.accountIcon,
		onPress: isAuthenticated
			? () => router.push('/profile-preferences')
			: () => router.push('/register'),
	};

	const preparednessQuickActions = [
		{
			key: 'quiz',
			title: translate('quiz.title'),
			description: translate('home.quizDescription'),
			icon: 'school-outline' as const,
			iconColour: '#A86600',
			iconStyle: styles.quizIcon,
			onPress: () => router.push('/preparedness-quiz'),
		},
		{
			key: 'progress',
			title: translate('achievements.title'),
			description: translate('home.progressDescription'),
			icon: 'trophy-outline' as const,
			iconColour: '#173F5F',
			iconStyle: styles.progressIcon,
			onPress: () => router.push('/progress-achievements'),
		},
		{
			key: 'location',
			title: translate('location.title'),
			description: translate('home.locationDescription'),
			icon: 'location-outline' as const,
			iconColour: '#2C6F91',
			iconStyle: styles.locationIcon,
			onPress: () => router.push('/location-selection'),
		},
	];

	// I put account creation first for guests because it unlocks saved progress.
	const quickActions = isAuthenticated
		? [...preparednessQuickActions, accountQuickAction]
		: [accountQuickAction, ...preparednessQuickActions];

	const handleSignOut = async (): Promise<void> => {
		if (isSigningOut) {
			return;
		}

		setIsSigningOut(true);

		try {
			//scope: local to signout only from current device
			const { error } = await supabaseClient.auth.signOut({ scope: 'local' }); 

			if (error) {
				console.error('[Ihtiyat auth] Sign out failed:', error.message);
			}
		} catch (error) {
			console.error('[Ihtiyat auth] Unexpected sign out failure:', error);
		} finally {
			setIsSigningOut(false);
		}
	};

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Home is the one place where I keep my apps brand "Ihtiyat" prominent. */}
				<View style={styles.brandRow}>
					<View style={styles.brand}>
						<View style={styles.brandMark}>
							<Ionicons
								accessible={false}
								name="shield-checkmark-outline"
								size={responsiveSize(width, height, 0.062)}
								color="#FFFFFF"
							/>
						</View>

						<AppText variant="subtitle">
							{translate('common.appName')}
						</AppText>
					</View>

					<View style={styles.headerActions}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={
								language === 'en'
									? translate('language.switchToArabic')
									: translate('language.switchToEnglish')
							}
							onPress={toggleLanguage}
							style={({ pressed }) => [
								styles.headerAction,
								pressed ? styles.pressed : undefined,
							]}
						>
							<Ionicons
								accessible={false}
								name="language-outline"
								size={responsiveSize(width, height, 0.046)}
								color="#40515C"
							/>

							<AppText variant="caption">
								{language === 'en'
									? translate('language.switchToArabic')
									: translate('language.switchToEnglish')}
							</AppText>
						</Pressable>

						<Pressable
							accessibilityRole="button"
							accessibilityLabel={accountLabel}
							onPress={() => {
								if (isAuthenticated) {
									router.push('/profile-preferences');
									return;
								}

								router.push('/sign-in');
							}}
							style={({ pressed }) => [
								styles.headerAction,
								pressed ? styles.pressed : undefined,
							]}
						>
							<Ionicons
								accessible={false}
								name={
									isAuthenticated
										? 'person-circle-outline'
										: 'log-in-outline'
								}
								size={responsiveSize(width, height, 0.046)}
								color="#40515C"
							/>

							<AppText variant="caption">
								{accountLabel}
							</AppText>
						</Pressable>
						{isAuthenticated ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={translate('authentication.signOut')}
								disabled={isSigningOut}
								onPress={() => {
									void handleSignOut();
								}}
								style={({ pressed }) => [
									styles.headerAction,
									styles.signOutAction,
									pressed ? styles.pressed : undefined,
									isSigningOut ? styles.disabledAction : undefined,
								]}
							>
								<Ionicons
									accessible={false}
									name="log-out-outline"
									size={responsiveSize(width, height, 0.046)}
									color="#8A3C18"
								/>

								<AppText variant="caption">
									{translate('authentication.signOut')}
								</AppText>
							</Pressable>
						) : null}
					</View>
				</View>

				<View style={styles.hero}>
					<AppText variant="caption" tone="muted">
						{translate('home.readyToday')}
					</AppText>

					<AppText variant="title">
						{translate('home.title')}
					</AppText>

					<AppText variant="body" tone="muted">
						{translate('home.subtitle')}
					</AppText>
				</View>

				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${translate(
						'location.currentLocationTitle',
					)}: ${locationName}`}
					onPress={() => router.push('/location-selection')}
					style={({ pressed }) => [
						styles.locationRow,
						pressed ? styles.pressed : undefined,
					]}
				>
					<View style={styles.locationContent}>
						<View style={styles.locationMarker}>
							<Ionicons
								accessible={false}
								name="location"
								size={responsiveSize(width, height, 0.052)}
								color="#176B66"
							/>
						</View>

						<View style={styles.locationText}>
							<AppText variant="caption" tone="muted">
								{translate('location.currentLocationTitle')}
							</AppText>

							<AppText variant="body">
								{locationName}
							</AppText>
						</View>
					</View>

					<Ionicons
						accessible={false}
						name={isRTL ? 'chevron-back' : 'chevron-forward'}
						size={responsiveSize(width, height, 0.05)}
						color="#64748B"
					/>
				</Pressable>

				<View style={styles.progressPanel}>
					<View style={styles.progressTopRow}>
						<View style={styles.progressTitleGroup}>
							<AppText variant="caption" tone="muted">
								{translate('home.progressTitle')}
							</AppText>

							{progressReady ? (
								<AppText variant="title">
									{`${progressSummary.completionPercentage}%`}
								</AppText>
							) : null}
						</View>

						{progressReady ? (
							<AppText variant="body">
								{`${formatNumericFraction(
									progressSummary.earnedPoints,
									progressSummary.totalAvailablePoints,
								)} ${translate('preparedness.points')}`}
							</AppText>
						) : null}
					</View>

					{progressReady ? (
						<>
							<View
								accessible
								accessibilityRole="progressbar"
								accessibilityLabel={translate('home.progressTitle')}
								accessibilityValue={{
									min: 0,
									max: 100,
									now: progressSummary.completionPercentage,
									text: `${progressSummary.completionPercentage}%`,
								}}
								style={styles.progressTrack}
							>
								<View style={[
										styles.progressFill,
										progressFillStyle
									]}
								>
									<View style={styles.progressGloss} />
								</View>
							</View>

							<View style={styles.progressStats}>
								<View style={styles.progressStat}>
									<AppText variant="caption" tone="muted">
										{translate('preparedness.tasksCompleted')}
									</AppText>

									<AppText variant="subtitle">
										{formatNumericFraction(
											progressSummary.completedTasks,
											progressSummary.totalTasks,
										)}
									</AppText>
								</View>

								{progressSummary.pendingTaskCount > 0 ? (
									<View style={styles.progressStat}>
										<AppText variant="caption" tone="muted">
											{translate('preparedness.pendingSync')}
										</AppText>

										<AppText variant="subtitle">
											{String(progressSummary.pendingTaskCount)}
										</AppText>
									</View>
								) : null}
							</View>
						</>
					) : progressLoading ? (
						<AppText variant="body" tone="muted">
							{translate('preparedness.progressLoading')}
						</AppText>
					) : isAuthenticated ? (
						<AppText variant="body" tone="muted">
							{translate('home.progressUnavailable')}
						</AppText>
					) : (
						<View style={styles.guestProgress}>
							<AppText variant="subtitle">
								{translate('home.guestProgressTitle')}
							</AppText>

							<AppText variant="body" tone="muted">
								{translate('home.guestProgressDescription')}
							</AppText>

							<Pressable
								accessibilityRole="button"
								accessibilityLabel={translate(
									'authentication.signIn',
								)}
								onPress={() => router.push('/sign-in')}
								style={({ pressed }) => [
									styles.inlineAction,
									pressed ? styles.pressed : undefined,
								]}
							>
								<AppText variant="caption">
									{translate('authentication.signIn')}
								</AppText>

								<Ionicons
									accessible={false}
									name={
										isRTL
											? 'arrow-back'
											: 'arrow-forward'
									}
									size={responsiveSize(width, height, 0.04)}
									color="#176B66"
								/>
							</Pressable>
						</View>
					)}
				</View>

				<View style={styles.section}>
					<AppText variant="caption" tone="muted">
						{translate('home.continuePreparing')}
					</AppText>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel={translate('preparedness.title')}
						onPress={() => router.push('/missions-checklists')}
						style={({ pressed }) => [
							styles.continueCard,
							pressed ? styles.pressed : undefined,
						]}
					>
						<View style={styles.continueIcon}>
							<Ionicons
								accessible={false}
								name="checkbox-outline"
								size={responsiveSize(width, height, 0.06)}
								color="#176B66"
							/>
						</View>

						<View style={styles.continueText}>
							<AppText variant="subtitle">
								{translate('preparedness.title')}
							</AppText>

							<AppText variant="caption" tone="muted">
								{translate('preparedness.subtitle')}
							</AppText>
						</View>

						<Ionicons
							accessible={false}
							name={isRTL ? 'chevron-back' : 'chevron-forward'}
							size={responsiveSize(width, height, 0.05)}
							color="#64748B"
						/>
					</Pressable>
				</View>

				<View style={styles.section}>
					<AppText variant="caption" tone="muted">
						{translate('home.quickAccess')}
					</AppText>

					<View style={styles.quickGrid}>
						{quickActions.map((action) => (
							<Pressable
								key={action.key}
								accessibilityRole="button"
								accessibilityLabel={action.title}
								accessibilityHint={action.description}
								onPress={action.onPress}
								style={({ pressed }) => [
									styles.quickTile,
									pressed ? styles.pressed : undefined,
								]}
							>
								<View
									style={[
										styles.quickIcon,
										action.iconStyle,
									]}
								>
									<Ionicons
										accessible={false}
										name={action.icon}
										size={responsiveSize(
											width,
											height,
											0.055,
										)}
										color={action.iconColour}
									/>
								</View>

								<View style={styles.quickText}>
									<AppText variant="subtitle">
										{action.title}
									</AppText>

									<AppText variant="caption" tone="muted">
										{action.description}
									</AppText>
								</View>
							</Pressable>
						))}
					</View>
				</View>
			</ScrollView>

			<AppBottomNavigation activeKey="home" />
		</AppScreen>
	);
}

const createStyles = (
	width: number,
	height: number,
	isRTL: boolean,
	useSingleColumnQuickActions: boolean,
) =>
	StyleSheet.create({

		scrollView: {
			flex: 1,
		},

		scrollContent: {
			gap: responsiveSize(width, height, 0.04),
			paddingBottom: responsiveSize(width, height, 0.045),
		},

		brandRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.02),
		},

		brand: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			flexGrow: 1,
			gap: responsiveSize(width, height, 0.018),
		},

		brandMark: {
			width: responsiveSize(width, height, 0.1),
			height: responsiveSize(width, height, 0.1),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#176B66',
			borderRadius: responsiveSize(width, height, 0.018),
		},

		headerActions: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.014),
		},

		headerAction: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.01),
			minHeight: responsiveSize(width, height, 0.09),
			paddingHorizontal: responsiveSize(width, height, 0.022),
			paddingVertical: responsiveSize(width, height, 0.012),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderRadius: responsiveSize(width, height, 0.015),
		},

		signOutAction: {
			backgroundColor: '#FFF4EE',
			borderColor: '#E8C6AA',
		},

		disabledAction: {
			opacity: 0.5,
		},

		hero: {
			gap: responsiveSize(width, height, 0.014),
		},

		locationRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderRadius: responsiveSize(width, height, 0.018),
		},

		locationContent: {
			flex: 1,
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.025),
		},

		locationMarker: {
			width: responsiveSize(width, height, 0.09),
			height: responsiveSize(width, height, 0.09),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		locationText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.004),
		},

		progressPanel: {
			gap: responsiveSize(width, height, 0.025),
			padding: responsiveSize(width, height, 0.035),
			backgroundColor: '#EAF2F8',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#B9CBD8',
			borderRadius: responsiveSize(width, height, 0.02),
		},

		progressTopRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.02),
		},

		progressTitleGroup: {
			gap: responsiveSize(width, height, 0.005),
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
			borderRightWidth: isRTL ? 0 : responsiveSize(width, height, 0.002),
			borderLeftWidth: isRTL ? responsiveSize(width, height, 0.002) : 0,
			borderColor: '#103650',
		},

		progressGloss: {
			height: '45%',
			width: '100%',
			backgroundColor: '#3B83AF',
		},

		progressStats: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.04),
		},

		progressStat: {
			flexGrow: 1,
			flexBasis: '40%',
			gap: responsiveSize(width, height, 0.005),
		},

		guestProgress: {
			gap: responsiveSize(width, height, 0.014),
		},

		inlineAction: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			gap: responsiveSize(width, height, 0.01),
			paddingVertical: responsiveSize(width, height, 0.008),
		},

		section: {
			gap: responsiveSize(width, height, 0.016),
		},

		continueCard: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.025),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(width, height, 0.01),
			borderStartColor: '#176B66',
			borderRadius: responsiveSize(width, height, 0.016),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(width, height, 0.006),
			},
			shadowOpacity: 0.08,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		continueIcon: {
			width: responsiveSize(width, height, 0.105),
			height: responsiveSize(width, height, 0.105),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.015),
		},

		continueText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.006),
		},

		quickGrid: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.025),
		},

		quickTile: {
			flexGrow: 1,
			flexBasis: useSingleColumnQuickActions ? '100%' : '46%',
			minWidth: 0,
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.03),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderRadius: responsiveSize(width, height, 0.016),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(width, height, 0.006),
			},
			shadowOpacity: 0.08,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		quickIcon: {
			width: responsiveSize(width, height, 0.09),
			height: responsiveSize(width, height, 0.09),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		quizIcon: {
			backgroundColor: '#FFF0C2',
		},

		progressIcon: {
			backgroundColor: '#E4ECF5',
		},

		locationIcon: {
			backgroundColor: '#E4F1F7',
		},

		accountIcon: {
			backgroundColor: '#EEEAF3',
		},

		quickText: {
			gap: responsiveSize(width, height, 0.006),
		},

		pressed: {
			opacity: 0.65,
		},
	});