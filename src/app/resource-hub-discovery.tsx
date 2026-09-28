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

import { AppBottomNavigation } from '@/components/AppBottomNavigation';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';

import { usePreparednessData } from '@/features/preparedness/PreparednessDataProvider';

import {
	getContextRelevantResources,
	getResourcesForTopic,
	getTopicsForResource,
} from '@/features/resource-hub/resource-hub-derivation';

import { useResourceHub } from '@/features/resource-hub/ResourceHubProvider';

import type {
	SafetyResource,
} from '@/features/resource-hub/resource-hub-types';

import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

function formatReviewDate(
	value: string | null,
	language: 'en' | 'ar',
): string | null {
	if (!value) {
		return null;
	}

	const parts = value.split('-');

	if (parts.length !== 3) {
		return value;
	}

	const [year, month, day] = parts.map(Number);

	if (!year || !month || !day) {
		return value;
	}

	const date = new Date(Date.UTC(year, month - 1, day));

	return new Intl.DateTimeFormat(
		language === 'ar' ? 'ar-SA' : 'en-GB',
		{
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: 'UTC',
		},
	).format(date);
}

/**
 * The Resource Hub is public and is kept intentionally useful without an account.
 *
 * ResourceHubProvider owns the remote/cache loading boundary. 
 * PreparednessDataProvider contributes the current location and prioritised hazards. I keep the catalogue
 * relationship work in the pure derivation helpers rather than rebuilding joins here.
*/
export default function ResourceHubDiscoveryScreen() {
	const { width, height } = useWindowDimensions();
	const { language, isRTL, translate } = useAppLanguage();

	const {
		catalogue,
		source,
		status,
		isLoading,
		refresh,
	} = useResourceHub();

	const {
		activeLocation,
		resolvedHazards,
	} = usePreparednessData();

	const [selectedTopicId, setSelectedTopicId] =
		useState<number | null>(null);

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);

	/*
	 * Only hazards explicitly prioritised by the preparedness resolver should
	 * influence the "Relevant to your location" section. Other known hazards
	 * remain available through normal Resource Hub browsing.
	 */
	const prioritisedHazards = useMemo(
		() =>
			(resolvedHazards ?? []).filter(
				(hazard) => hazard.is_prioritised,
			),
		[resolvedHazards],
	);

	const hazardIds = useMemo(
		() =>
			prioritisedHazards.map(
				(hazard) => hazard.hazard_id,
			),
		[prioritisedHazards],
	);

	/*
	 * Location relevance can come from the user's active location or from the
	 * location row that matched a prioritised hazard. A Set keeps this scope
	 * deterministic and prevents duplicate resource matches.
	*/
	const locationScopeIds = useMemo(() => {
		const locationIds = new Set<number>();

		if (activeLocation) {
			locationIds.add(activeLocation.id);
		}

		for (const hazard of prioritisedHazards) {
			if (hazard.matched_location_id !== null) {
				locationIds.add(hazard.matched_location_id);
			}
		}

		return Array.from(locationIds);
	}, [activeLocation, prioritisedHazards]);

	const relevantResources = useMemo(
		() =>
			catalogue
				? getContextRelevantResources(catalogue, {
						hazardIds,
						locationScopeIds,
					})
				: [],
		[catalogue, hazardIds, locationScopeIds],
	);

	const filteredResources = useMemo(() => {
		if (!catalogue) {
			return [];
		}

		if (selectedTopicId === null) {
			return catalogue.resources;
		}

		return getResourcesForTopic(
			catalogue,
			selectedTopicId,
		);
	}, [catalogue, selectedTopicId]);

	const locationName = activeLocation
		? language === 'ar'
			? activeLocation.name_ar
			: activeLocation.name_en
		: translate('resourceHub.noLocation');

	const hazardNames = prioritisedHazards.map(
		(hazard) =>
			language === 'ar'
				? hazard.hazard_name_ar
				: hazard.hazard_name_en,
	);

	const isOfflineCopy = source === 'cache';

	const openResource = (resource: SafetyResource): void => {
		router.push({
			pathname: '/resource-hub-resource-detail',
			params: {
				resourceId: String(resource.id),
			},
		});
	};

	/*
	 * Topic colours help users distinguish the nature of guidance 
	 * limited them so the Hub doesn't turn into a multicoloured grid.
	*/
	const getResourceTheme = (topicCode: string | null) => {
		if (topicCode?.includes('first_aid')) {
			return {
				icon: 'medkit-outline' as const,
				iconColour: '#315A7D',
				iconStyle: styles.resourceIconBlue,
				borderStyle: styles.resourceCardBlue,
			};
		}

		if (
			topicCode?.includes('emergency')
			|| topicCode?.includes('preparedness')
		) {
			return {
				icon: 'shield-checkmark-outline' as const,
				iconColour: '#A86600',
				iconStyle: styles.resourceIconAmber,
				borderStyle: styles.resourceCardAmber,
			};
		}

		if (
			topicCode?.includes('hazard')
			|| topicCode?.includes('flood')
			|| topicCode?.includes('heat')
		) {
			return {
				icon: 'warning-outline' as const,
				iconColour: '#176B66',
				iconStyle: styles.resourceIconTeal,
				borderStyle: styles.resourceCardTeal,
			};
		}

		return {
			icon: 'book-outline' as const,
			iconColour: '#173F5F',
			iconStyle: styles.resourceIconNavy,
			borderStyle: styles.resourceCardNavy,
		};
	};

	const renderResourceCard = (
		resource: SafetyResource,
		emphasised = false,
	) => {
		if (!catalogue) {
			return null;
		}

		const title =
			language === 'ar'
				? resource.title_ar
				: resource.title_en;

		const summary =
			language === 'ar'
				? resource.summary_ar
				: resource.summary_en;

		const primaryTopic = getTopicsForResource(
			catalogue,
			resource.id,
		).find((association) => association.isPrimary);

		const primaryTopicName = primaryTopic
			? language === 'ar'
				? primaryTopic.topic.name_ar
				: primaryTopic.topic.name_en
			: null;

		const reviewDate = formatReviewDate(
			resource.last_reviewed_on,
			language,
		);

		const theme = getResourceTheme(
			primaryTopic?.topic.code ?? null,
		);

		return (
			<View
				key={resource.id}
				style={[
					styles.resourceCard,
					theme.borderStyle,
					emphasised
						? styles.resourceCardRelevant
						: undefined,
				]}
			>
				<View style={styles.resourceHeader}>
					<View
						style={[
							styles.resourceIcon,
							theme.iconStyle,
						]}
					>
						<Ionicons
							accessible={false}
							name={theme.icon}
							size={responsiveSize(
								width,
								height,
								0.055,
							)}
							color={theme.iconColour}
						/>
					</View>

					<View style={styles.resourceHeadingText}>
						{primaryTopicName ? (
							<AppText variant="caption" tone="muted">
								{primaryTopicName}
							</AppText>
						) : null}

						<AppText variant="subtitle">
							{title}
						</AppText>
					</View>
				</View>

				<AppText variant="body" tone="muted">
					{summary}
				</AppText>

				<View style={styles.resourceFooter}>
					<View style={styles.reviewDate}>
						<Ionicons
							accessible={false}
							name="calendar-outline"
							size={responsiveSize(
								width,
								height,
								0.035,
							)}
							color="#64748B"
						/>

						<AppText variant="caption" tone="muted">
							{`${translate(
								'resourceHub.lastReviewed',
							)}: ${
								reviewDate
								?? translate(
									'resourceHub.reviewDateUnavailable',
								)
							}`}
						</AppText>
					</View>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`${translate(
							'resourceHub.readGuidance',
						)}: ${title}`}
						onPress={() => openResource(resource)}
						style={({ pressed }) => [
							styles.readAction,
							pressed
								? styles.readActionPressed
								: undefined,
						]}
					>
						<AppText variant="caption">
							{translate(
								'resourceHub.readGuidance',
							)}
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
								0.037,
							)}
							color="#173F5F"
						/>
					</Pressable>
				</View>
			</View>
		);
	};

	const renderPageHeader = () => (
		<View style={styles.pageHeader}>
			<View style={styles.headingRow}>
				<View style={styles.headingIcon}>
					<Ionicons
						accessible={false}
						name="book-outline"
						size={responsiveSize(
							width,
							height,
							0.062,
						)}
						color="#173F5F"
					/>
				</View>

				<View style={styles.headingText}>
					<AppText variant="title">
						{translate('resourceHub.title')}
					</AppText>

					<AppText variant="body" tone="muted">
						{translate('resourceHub.subtitle')}
					</AppText>
				</View>
			</View>

			<View style={styles.contextPanel}>
				<View style={styles.contextTopRow}>
					<View style={styles.contextItem}>
						<View style={styles.contextIcon}>
							<Ionicons
								accessible={false}
								name="location-outline"
								size={responsiveSize(
									width,
									height,
									0.042,
								)}
								color="#315A7D"
							/>
						</View>

						<View style={styles.contextText}>
							<AppText
								variant="caption"
								tone="muted"
							>
								{translate(
									'resourceHub.currentLocation',
								)}
							</AppText>

							<AppText variant="body">
								{locationName}
							</AppText>
						</View>
					</View>

					<Pressable
						accessibilityRole="button"
						accessibilityLabel={translate(
							'resourceHub.refresh',
						)}
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
							size={responsiveSize(
								width,
								height,
								0.04,
							)}
							color="#173F5F"
						/>

						<AppText variant="caption">
							{translate('resourceHub.refresh')}
						</AppText>
					</Pressable>
				</View>

				<View
					style={[
						styles.catalogueStatus,
						isOfflineCopy
							? styles.catalogueStatusOffline
							: styles.catalogueStatusOnline,
					]}
				>
					<Ionicons
						accessible={false}
						name={
							isOfflineCopy
								? 'cloud-offline-outline'
								: 'cloud-done-outline'
						}
						size={responsiveSize(
							width,
							height,
							0.042,
						)}
						color={
							isOfflineCopy
								? '#8A5A00'
								: '#315A7D'
						}
					/>

					<View style={styles.catalogueStatusText}>
						<AppText
							variant="caption"
							tone="muted"
						>
							{translate(
								'resourceHub.catalogueSource',
							)}
						</AppText>

						<AppText variant="body">
							{isOfflineCopy
								? translate(
									'resourceHub.offlineCopy',
								)
								: translate(
									'resourceHub.updatedOnline',
								)}
						</AppText>
					</View>
				</View>

				<View style={styles.hazardContext}>
					<Ionicons
						accessible={false}
						name="compass-outline"
						size={responsiveSize(
							width,
							height,
							0.042,
						)}
						color="#176B66"
					/>

					<View style={styles.hazardContextText}>
						<AppText
							variant="caption"
							tone="muted"
						>
							{translate(
								'resourceHub.relevantHazards',
							)}
						</AppText>

						{hazardNames.length > 0 ? (
							<View style={styles.hazardList}>
								{hazardNames.map((hazardName) => (
									<View key={hazardName} style={styles.hazardRow}>
										<View style={styles.hazardBullet} />

										<AppText variant="body">
											{hazardName}
										</AppText>
									</View>
								))}
							</View>
						) : (
							<AppText variant="body">
								{translate('resourceHub.noHazardContext')}
							</AppText>
						)}
					</View>
				</View>
			</View>
		</View>
	);

	if (isLoading && catalogue === null) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				<View style={styles.stateContainer}>
					<View style={styles.stateIcon}>
						<Ionicons
							accessible={false}
							name="book-outline"
							size={responsiveSize(
								width,
								height,
								0.075,
							)}
							color="#315A7D"
						/>
					</View>

					<AppText variant="title" alignment="center">
						{translate('resourceHub.title')}
					</AppText>

					<AppText
						variant="body"
						tone="muted"
						alignment="center"
					>
						{translate('resourceHub.loading')}
					</AppText>
				</View>

				<AppBottomNavigation activeKey="resources" />
			</AppScreen>
		);
	}

	if (status === 'error' || catalogue === null) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				<View style={styles.stateContainer}>
					<View style={styles.stateIconError}>
						<Ionicons
							accessible={false}
							name="cloud-offline-outline"
							size={responsiveSize(
								width,
								height,
								0.075,
							)}
							color="#A84E17"
						/>
					</View>

					<AppText variant="title" alignment="center">
						{translate('resourceHub.errorTitle')}
					</AppText>

					<AppStatusMessage
						tone="error"
						message={translate(
							'resourceHub.errorMessage',
						)}
					/>

					<AppButton
						label={translate('resourceHub.tryAgain')}
						onPress={() => {
							void refresh();
						}}
					/>
				</View>

				<AppBottomNavigation activeKey="resources" />
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

				{isOfflineCopy ? (
					<AppStatusMessage
						tone="info"
						message={translate(
							'resourceHub.offlineNotice',
						)}
					/>
				) : null}

				<View style={styles.sourceNotice}>
					<Ionicons
						accessible={false}
						name="information-circle-outline"
						size={responsiveSize(
							width,
							height,
							0.043,
						)}
						color="#315A7D"
					/>

					<View style={styles.sourceNoticeText}>
						<AppText variant="caption" tone="muted">
							{translate(
								'resourceHub.sourceContext',
							)}
						</AppText>
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeading}>
						<View style={styles.sectionHeadingIcon}>
							<Ionicons
								accessible={false}
								name="location-outline"
								size={responsiveSize(
									width,
									height,
									0.045,
								)}
								color="#176B66"
							/>
						</View>

						<View style={styles.sectionHeadingText}>
							<AppText variant="subtitle">
								{translate(
									'resourceHub.relevantTitle',
								)}
							</AppText>

							<AppText
								variant="caption"
								tone="muted"
							>
								{translate(
									'resourceHub.relevantDescription',
								)}
							</AppText>
						</View>
					</View>

					{relevantResources.length > 0 ? (
						<View style={styles.cardList}>
							{relevantResources.map(
								(resource) =>
									renderResourceCard(
										resource,
										true,
									),
							)}
						</View>
					) : (
						<View style={styles.emptySection}>
							<Ionicons
								accessible={false}
								name="information-circle-outline"
								size={responsiveSize(
									width,
									height,
									0.045,
								)}
								color="#64748B"
							/>

							<AppText
								variant="body"
								tone="muted"
							>
								{translate(
									'resourceHub.noRelevantResources',
								)}
							</AppText>
						</View>
					)}
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeading}>
						<View style={styles.sectionHeadingIconBlue}>
							<Ionicons
								accessible={false}
								name="library-outline"
								size={responsiveSize(
									width,
									height,
									0.045,
								)}
								color="#173F5F"
							/>
						</View>

						<View style={styles.sectionHeadingText}>
							<AppText variant="subtitle">
								{translate(
									'resourceHub.browseTitle',
								)}
							</AppText>

							<AppText
								variant="caption"
								tone="muted"
							>
								{translate(
									'resourceHub.filterTitle',
								)}
							</AppText>
						</View>
					</View>

					{/*
					 * Topic filters deliberately size themselves to their text.
					 * This is less rigid than a two-column grid, but it prevents
					 * english labels such as "Emergency Preparedness" from being
					 * crushed when android bold font or large text is enabled.
					 */}
					<View
						accessibilityRole="radiogroup"
						style={styles.filters}
					>
						<Pressable
							accessibilityRole="radio"
							accessibilityLabel={translate(
								'resourceHub.allResources',
							)}
							accessibilityState={{
								selected:
									selectedTopicId === null,
							}}
							onPress={() =>
								setSelectedTopicId(null)
							}
							style={({ pressed }) => [
								styles.filter,
								selectedTopicId === null
									? styles.selectedFilter
									: undefined,
								pressed
									? styles.pressedFilter
									: undefined,
							]}
						>
							<View style={styles.filterContent}>
								{selectedTopicId === null ? (
									<Ionicons
										accessible={false}
										name="checkmark"
										size={responsiveSize(
											width,
											height,
											0.037,
										)}
										color="#173F5F"
									/>
								) : null}

								<AppText
									variant="caption"
									alignment="center"
								>
									{translate(
										'resourceHub.allResources',
									)}
								</AppText>
							</View>
						</Pressable>

						{catalogue.topics.map((topic) => {
							const selected =
								selectedTopicId === topic.id;

							const topicName =
								language === 'ar'
									? topic.name_ar
									: topic.name_en;

							return (
								<Pressable
									key={topic.id}
									accessibilityRole="radio"
									accessibilityLabel={topicName}
									accessibilityState={{
										selected,
									}}
									onPress={() =>
										setSelectedTopicId(
											topic.id,
										)
									}
									style={({ pressed }) => [
										styles.filter,
										selected
											? styles.selectedFilter
											: undefined,
										pressed
											? styles.pressedFilter
											: undefined,
									]}
								>
									<View
										style={
											styles.filterContent
										}
									>
										{selected ? (
											<Ionicons
												accessible={false}
												name="checkmark"
												size={responsiveSize(
													width,
													height,
													0.037,
												)}
												color="#173F5F"
											/>
										) : null}

										<AppText
											variant="caption"
											alignment="center"
										>
											{topicName}
										</AppText>
									</View>
								</Pressable>
							);
						})}
					</View>

					{filteredResources.length > 0 ? (
						<View style={styles.cardList}>
							{filteredResources.map(
								(resource) => renderResourceCard(resource),
							)}
						</View>
					) : (
						<View style={styles.emptySection}>
							<Ionicons
								accessible={false}
								name="search-outline"
								size={responsiveSize(
									width,
									height,
									0.045,
								)}
								color="#64748B"
							/>

							<AppText
								variant="body"
								tone="muted"
							>
								{translate(
									'resourceHub.noResources',
								)}
							</AppText>
						</View>
					)}
				</View>
			</ScrollView>

			<AppBottomNavigation activeKey="resources" />
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
			gap: responsiveSize(width, height, 0.038),
			paddingBottom: responsiveSize(width, height, 0.045),
		},

		stateContainer: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			gap: responsiveSize(width, height, 0.025),
		},

		stateIcon: {
			width: responsiveSize(width, height, 0.13),
			height: responsiveSize(width, height, 0.13),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.015),
		},

		stateIconError: {
			width: responsiveSize(width, height, 0.13),
			height: responsiveSize(width, height, 0.13),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FBE9D8',
			borderRadius: responsiveSize(width, height, 0.015),
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
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		headingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.01),
		},

		contextPanel: {
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.028),
			backgroundColor: '#F1F6FA',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#B9CBD8',
			borderRadius: responsiveSize(width, height, 0.014),
		},

		contextTopRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.018),
		},

		contextItem: {
			flex: 1,
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.014),
			minWidth: responsiveSize(width, height, 0.3),
		},

		contextIcon: {
			width: responsiveSize(width, height, 0.075),
			height: responsiveSize(width, height, 0.075),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.01),
		},

		contextText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.002),
		},

		refreshButton: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.008),
			paddingHorizontal: responsiveSize(width, height, 0.018),
			paddingVertical: responsiveSize(width, height, 0.011),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#9FB3C3',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		refreshButtonPressed: {
			backgroundColor: '#E4ECF5',
		},

		refreshButtonDisabled: {
			opacity: 0.5,
		},

		catalogueStatus: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.014),
			paddingHorizontal: responsiveSize(width, height, 0.02),
			paddingVertical: responsiveSize(width, height, 0.012),
			borderWidth: responsiveSize(width, height, 0.002),
			borderRadius: responsiveSize(width, height, 0.009),
		},

		catalogueStatusOnline: {
			backgroundColor: '#E8F0F6',
			borderColor: '#AAC1D2',
		},

		catalogueStatusOffline: {
			backgroundColor: '#FFF4D6',
			borderColor: '#E2B84B',
		},

		catalogueStatusText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.002),
		},

		hazardContext: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
			paddingTop: responsiveSize(width, height, 0.012),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#D5E0E8',
		},

		hazardContextText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.004),
		},

		hazardList: {
			gap: responsiveSize(width, height, 0.008),
		},

		hazardRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.012),
		},

		hazardBullet: {
			width: responsiveSize(width, height, 0.014),
			height: responsiveSize(width, height, 0.014),
			marginTop: responsiveSize(width, height, 0.015),
			backgroundColor: '#176B66',
			borderRadius: responsiveSize(width, height, 0.007),
		},

		sourceNotice: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
			paddingHorizontal: responsiveSize(width, height, 0.022),
			paddingVertical: responsiveSize(width, height, 0.016),
			backgroundColor: '#F7F9FB',
			borderStartWidth: responsiveSize(width, height, 0.007),
			borderStartColor: '#315A7D',
		},

		sourceNoticeText: {
			flex: 1,
		},

		section: {
			gap: responsiveSize(width, height, 0.025),
		},

		sectionHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.018),
		},

		sectionHeadingIcon: {
			width: responsiveSize(width, height, 0.075),
			height: responsiveSize(width, height, 0.075),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.01),
		},

		sectionHeadingIconBlue: {
			width: responsiveSize(width, height, 0.075),
			height: responsiveSize(width, height, 0.075),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.01),
		},

		sectionHeadingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.006),
		},

		cardList: {
			gap: responsiveSize(width, height, 0.025),
		},

		resourceCard: {
			gap: responsiveSize(width, height, 0.022),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(width, height, 0.01),
			borderRadius: responsiveSize(width, height, 0.014),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(width, height, 0.006),
			},
			shadowOpacity: 0.07,
			shadowRadius: responsiveSize(width, height, 0.012),
			elevation: 2,
		},

		resourceCardRelevant: {
			backgroundColor: '#FBFDFE',
		},

		resourceCardBlue: {
			borderStartColor: '#315A7D',
		},

		resourceCardAmber: {
			borderStartColor: '#B27A00',
		},

		resourceCardTeal: {
			borderStartColor: '#176B66',
		},

		resourceCardNavy: {
			borderStartColor: '#173F5F',
		},

		resourceHeader: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.018),
		},

		resourceIcon: {
			width: responsiveSize(width, height, 0.085),
			height: responsiveSize(width, height, 0.085),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: responsiveSize(width, height, 0.011),
		},

		resourceIconBlue: {
			backgroundColor: '#E4ECF5',
		},

		resourceIconAmber: {
			backgroundColor: '#FFF0C2',
		},

		resourceIconTeal: {
			backgroundColor: '#E7F3F1',
		},

		resourceIconNavy: {
			backgroundColor: '#E8EDF2',
		},

		resourceHeadingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.005),
		},

		resourceFooter: {
			gap: responsiveSize(width, height, 0.016),
			paddingTop: responsiveSize(width, height, 0.014),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#E5E7EB',
		},

		reviewDate: {
			width: '100%',
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.008),
		},

		readAction: {
			alignSelf: isRTL ? 'flex-start' : 'flex-end',
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.005),
			paddingHorizontal: responsiveSize(width, height, 0.018),
			paddingVertical: responsiveSize(width, height, 0.01),
			backgroundColor: '#E8F0F6',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#AAC1D2',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		readActionPressed: {
			opacity: 0.65,
		},

		filters: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.014),
		},

		filter: {
			flexShrink: 0,
			maxWidth: '100%',
			alignSelf: 'flex-start',
			minHeight: responsiveSize(width, height, 0.085),
			justifyContent: 'center',
			paddingHorizontal: responsiveSize(width, height, 0.028),
			paddingVertical: responsiveSize(width, height, 0.014),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#B9C5CF',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		filterContent: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: responsiveSize(width, height, 0.008),
		},

		selectedFilter: {
			backgroundColor: '#DDEAF3',
			borderColor: '#315A7D',
		},

		pressedFilter: {
			opacity: 0.65,
		},

		emptySection: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
			padding: responsiveSize(width, height, 0.025),
			backgroundColor: '#F7F9FB',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#D8DEE3',
			borderRadius: responsiveSize(width, height, 0.01),
		},
	});