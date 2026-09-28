import { useMemo, useState } from 'react';

import {
	Pressable,
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { AppScreen } from '@/components/AppScreen';
import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';

import { usePreparednessData } from '@/features/preparedness/PreparednessDataProvider';

import {
	getResourceById,
	getSourcesForResource,
	getTopicsForResource,
} from '@/features/resource-hub/resource-hub-derivation';

import { openResourceSourceUrl } from '@/features/resource-hub/resource-hub-external-link';

import type { ResourceSource } from '@/features/resource-hub/resource-hub-types';

import { useResourceHub } from '@/features/resource-hub/ResourceHubProvider';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';

/**
 * Route parameters come from several places in the app, so I validate them
 * before they reach the Resource Hub catalogue instead of trusting raw input.
 */
function parseResourceId(
	value: string | string[] | undefined,
): number | null {
	const rawValue = Array.isArray(value) ? value[0] : value;

	if (!rawValue || !/^\d+$/.test(rawValue)) {
		return null;
	}

	const resourceId = Number(rawValue);

	return Number.isSafeInteger(resourceId) && resourceId > 0
		? resourceId
		: null;
}

function formatResourceDate(
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
 * Detailed Resource Hub guidance.
 *
 * The provider remains responsible for online/offline loading. This screen
 * resolves one accepted catalogue resource and presents its guidance,
 * source-origin and external sources without changing the canonical data.
 */
export default function ResourceHubResourceDetailScreen() {
	const { width, height } = useWindowDimensions();

	const { resourceId: resourceIdParam } = useLocalSearchParams<{
		resourceId?: string | string[];
	}>();

	const { language, isRTL, translate } = useAppLanguage();

	const {
		catalogue,
		source,
		status,
		isLoading,
		refresh,
	} = useResourceHub();

	const { activeLocation } = usePreparednessData();

	const [openingSourceId, setOpeningSourceId] =
		useState<number | null>(null);

	const [externalLinkMessage, setExternalLinkMessage] =
		useState<string | null>(null);

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);

	const resourceId = useMemo(
		() => parseResourceId(resourceIdParam),
		[resourceIdParam],
	);

	const resource = useMemo(
		() =>
			catalogue && resourceId !== null
				? getResourceById(catalogue, resourceId)
				: null,
		[catalogue, resourceId],
	);

	/*
	 * Sources and topics are derived only after the canonical resource has
	 * resolved. This keeps dangling relationship IDs out of the UI.
	 */
	const sources = useMemo(
		() =>
			catalogue && resource
				? getSourcesForResource(catalogue, resource.id)
				: [],
		[catalogue, resource],
	);

	const topicAssociations = useMemo(
		() =>
			catalogue && resource
				? getTopicsForResource(catalogue, resource.id)
				: [],
		[catalogue, resource],
	);

	const returnToResourceHub = (): void => {
		router.replace('/resource-hub-discovery');
	};

	/*
	 * External URLs always pass through the validated HTTPS boundary.
	 * I only surface a local UI message here; the screen never opens arbitrary
	 * schemes directly.
	 */
	const handleOpenSource = async (
		resourceSource: ResourceSource,
	): Promise<void> => {
		setOpeningSourceId(resourceSource.id);
		setExternalLinkMessage(null);

		try {
			const result = await openResourceSourceUrl(
				resourceSource.source_url,
			);

			if (result === 'invalid-url') {
				setExternalLinkMessage(
					translate('resourceHub.unsafeSourceLink'),
				);
			} else if (result === 'open-failed') {
				setExternalLinkMessage(
					translate('resourceHub.sourceOpenError'),
				);
			}
		} finally {
			setOpeningSourceId(null);
		}
	};

	const renderDetailHeader = () => (
		<AppHeader
			showBackButton
			title={translate('resourceHub.title')}
		/>
	);

	if (resourceId === null) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				{renderDetailHeader()}

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
						{translate(
							'resourceHub.detailUnavailableTitle',
						)}
					</AppText>

					<AppText
						variant="body"
						tone="muted"
						alignment="center"
					>
						{translate(
							'resourceHub.detailUnavailableMessage',
						)}
					</AppText>

					<AppButton
						label={translate(
							'resourceHub.backToResourceHub',
						)}
						onPress={returnToResourceHub}
					/>
				</View>
			</AppScreen>
		);
	}

	if (isLoading && catalogue === null) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				{renderDetailHeader()}

				<View style={styles.stateContainer}>
					<View style={styles.stateIcon}>
						<Ionicons
							accessible={false}
							name="book-outline"
							size={responsiveSize(width, height, 0.075)}
							color="#315A7D"
						/>
					</View>

					<AppText
						variant="body"
						tone="muted"
						alignment="center"
					>
						{translate(
							'resourceHub.detailLoading',
						)}
					</AppText>
				</View>
			</AppScreen>
		);
	}

	if (status === 'error' || catalogue === null) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				{renderDetailHeader()}

				<View style={styles.stateContainer}>
					<View style={styles.stateIconError}>
						<Ionicons
							accessible={false}
							name="cloud-offline-outline"
							size={responsiveSize(width, height, 0.075)}
							color="#A84E17"
						/>
					</View>

					<AppText variant="subtitle" alignment="center">
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
			</AppScreen>
		);
	}

	if (!resource) {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />

				{renderDetailHeader()}

				<View style={styles.stateContainer}>
					<View style={styles.stateIconError}>
						<Ionicons
							accessible={false}
							name="document-outline"
							size={responsiveSize(width, height, 0.075)}
							color="#A84E17"
						/>
					</View>

					<AppText variant="subtitle" alignment="center">
						{translate(
							'resourceHub.detailUnavailableTitle',
						)}
					</AppText>

					<AppText
						variant="body"
						tone="muted"
						alignment="center"
					>
						{translate(
							'resourceHub.detailUnavailableMessage',
						)}
					</AppText>

					<AppButton
						label={translate(
							'resourceHub.backToResourceHub',
						)}
						onPress={returnToResourceHub}
					/>
				</View>
			</AppScreen>
		);
	}

	const title =
		language === 'ar'
			? resource.title_ar
			: resource.title_en;

	const summary =
		language === 'ar'
			? resource.summary_ar
			: resource.summary_en;

	const content =
		language === 'ar'
			? resource.content_ar
			: resource.content_en;

	const locationName = activeLocation
		? language === 'ar'
			? activeLocation.name_ar
			: activeLocation.name_en
		: translate('resourceHub.noLocation');

	const reviewedDate = formatResourceDate(
		resource.last_reviewed_on,
		language,
	);

	const primaryTopic = topicAssociations.find(
		(association) => association.isPrimary,
	);

	const primaryTopicName = primaryTopic
		? language === 'ar'
			? primaryTopic.topic.name_ar
			: primaryTopic.topic.name_en
		: null;

	return (
		<AppScreen>
			<Stack.Screen options={{ headerShown: false }} />

			{renderDetailHeader()}

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{source === 'cache' ? (
					<AppStatusMessage
						tone="info"
						message={translate(
							'resourceHub.detailOfflineNotice',
						)}
					/>
				) : null}

				<View style={styles.heroCard}>
					<View style={styles.heroTopRow}>
						<View style={styles.heroIcon}>
							<Ionicons
								accessible={false}
								name="book-outline"
								size={responsiveSize(
									width,
									height,
									0.065,
								)}
								color="#173F5F"
							/>
						</View>

						<View style={styles.heroText}>
							{primaryTopicName ? (
								<AppText
									variant="caption"
									tone="muted"
								>
									{primaryTopicName}
								</AppText>
							) : null}

							<AppText variant="title">
								{title}
							</AppText>
						</View>
					</View>

					<AppText variant="body" tone="muted">
						{summary}
					</AppText>
				</View>

				<View style={styles.contextPanel}>
					<View style={styles.contextRow}>
						<View style={styles.contextItem}>
							<View style={styles.contextIcon}>
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

						<View style={styles.contextItem}>
							<View
								style={[
									styles.contextIcon,
									source === 'cache'
										? styles.contextIconOffline
										: undefined,
								]}
							>
								<Ionicons
									accessible={false}
									name={
										source === 'cache'
											? 'cloud-offline-outline'
											: 'cloud-done-outline'
									}
									size={responsiveSize(
										width,
										height,
										0.04,
									)}
									color={
										source === 'cache'
											? '#8A5A00'
											: '#315A7D'
									}
								/>
							</View>

							<View style={styles.contextText}>
								<AppText
									variant="caption"
									tone="muted"
								>
									{translate(
										'resourceHub.resourceStatus',
									)}
								</AppText>

								<AppText variant="body">
									{source === 'cache'
										? translate(
											'resourceHub.offlineCopy',
										)
										: translate(
											'resourceHub.updatedOnline',
										)}
								</AppText>
							</View>
						</View>
					</View>

					<View style={styles.reviewRow}>
						<View style={styles.reviewMetadata}>
							<Ionicons
								accessible={false}
								name="calendar-outline"
								size={responsiveSize(
									width,
									height,
									0.038,
								)}
								color="#64748B"
							/>

							<View style={styles.contextText}>
								<AppText
									variant="caption"
									tone="muted"
								>
									{translate(
										'resourceHub.lastReviewed',
									)}
								</AppText>

								<AppText variant="body">
									{reviewedDate
										?? translate(
											'resourceHub.reviewDateUnavailable',
										)}
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
								{translate(
									'resourceHub.refresh',
								)}
							</AppText>
						</Pressable>
					</View>
				</View>

				{topicAssociations.length > 0 ? (
					<View style={styles.section}>
						<View style={styles.sectionHeading}>
							<View style={styles.sectionHeadingIcon}>
								<Ionicons
									accessible={false}
									name="pricetags-outline"
									size={responsiveSize(
										width,
										height,
										0.043,
									)}
									color="#315A7D"
								/>
							</View>

							<AppText variant="subtitle">
								{translate(
									'resourceHub.topics',
								)}
							</AppText>
						</View>

						<View style={styles.topicList}>
							{topicAssociations.map(
								({ topic, isPrimary }) => {
									const topicName =
										language === 'ar'
											? topic.name_ar
											: topic.name_en;

									return (
										<View
											key={topic.id}
											style={[
												styles.topicChip,
												isPrimary
													? styles.primaryTopicChip
													: styles.relatedTopicChip,
											]}
										>
											<AppText variant="caption">
												{topicName}
											</AppText>

											<AppText
												variant="caption"
												tone="muted"
											>
												{isPrimary
													? translate(
														'resourceHub.primaryTopic',
													)
													: translate(
														'resourceHub.additionalTopic',
													)}
											</AppText>
										</View>
									);
								},
							)}
						</View>
					</View>
				) : null}

				<View style={styles.section}>
					<View style={styles.sectionHeading}>
						<View style={styles.sectionHeadingIconTeal}>
							<Ionicons
								accessible={false}
								name="shield-checkmark-outline"
								size={responsiveSize(
									width,
									height,
									0.043,
								)}
								color="#176B66"
							/>
						</View>

						<AppText variant="subtitle">
							{translate(
								'resourceHub.guidance',
							)}
						</AppText>
					</View>

					<View style={styles.guidancePanel}>
						<AppText variant="body">
							{content}
						</AppText>
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeading}>
						<View style={styles.sectionHeadingIconAmber}>
							<Ionicons
								accessible={false}
								name="link-outline"
								size={responsiveSize(
									width,
									height,
									0.043,
								)}
								color="#8A5A00"
							/>
						</View>

						<View style={styles.sectionHeadingText}>
							<AppText variant="subtitle">
								{translate(
									'resourceHub.sources',
								)}
							</AppText>

							<AppText
								variant="caption"
								tone="muted"
							>
								{translate(
									'resourceHub.sourcesDescription',
								)}
							</AppText>
						</View>
					</View>

					{externalLinkMessage ? (
						<AppStatusMessage
							tone="error"
							message={externalLinkMessage}
						/>
					) : null}

					{sources.length > 0 ? (
						<View style={styles.sourceList}>
							{sources.map((resourceSource) => {
								const publisher =
									language === 'ar'
										? resourceSource.publisher_name_ar
										: resourceSource.publisher_name_en;

								const sourceTitle =
									language === 'ar'
										? resourceSource.source_title_ar
											?? resourceSource.source_title_en
											?? publisher
										: resourceSource.source_title_en
											?? resourceSource.source_title_ar
											?? publisher;

								const checkedDate =
									formatResourceDate(
										resourceSource.last_checked_on,
										language,
									);

								const sourceType =
									resourceSource.is_official
										? translate(
											'resourceHub.officialSource',
										)
										: translate(
											'resourceHub.referenceSource',
										);

								const openLabel =
									resourceSource.is_official
										? translate(
											'resourceHub.openOfficialSource',
										)
										: translate(
											'resourceHub.openSource',
										);

								return (
									<View
										key={resourceSource.id}
										style={[
											styles.sourceCard,
											resourceSource.is_official
												? styles.sourceCardOfficial
												: styles.sourceCardReference,
										]}
									>
										<View style={styles.sourceHeader}>
											<View
												style={[
													styles.sourceTypeIcon,
													resourceSource.is_official
														? styles.officialIcon
														: styles.referenceIcon,
												]}
											>
												<Ionicons
													accessible={false}
													name={
														resourceSource.is_official
															? 'shield-checkmark-outline'
															: 'document-text-outline'
													}
													size={responsiveSize(
														width,
														height,
														0.043,
													)}
													color={
														resourceSource.is_official
															? '#176B66'
															: '#315A7D'
													}
												/>
											</View>

											<View style={styles.sourceHeaderText}>
												<View
													style={[
														styles.sourceBadge,
														resourceSource.is_official
															? styles.officialBadge
															: styles.referenceBadge,
													]}
												>
													<AppText variant="caption">
														{sourceType}
													</AppText>
												</View>

												<AppText variant="subtitle">
													{sourceTitle}
												</AppText>
											</View>
										</View>

										<View style={styles.sourceMetadata}>
											<View style={styles.metadataBlock}>
												<AppText
													variant="caption"
													tone="muted"
												>
													{translate(
														'resourceHub.publisher',
													)}
												</AppText>

												<AppText variant="body">
													{publisher}
												</AppText>
											</View>

											<View style={styles.metadataBlock}>
												<AppText
													variant="caption"
													tone="muted"
												>
													{translate(
														'resourceHub.sourceChecked',
													)}
												</AppText>

												<AppText variant="body">
													{checkedDate
														?? translate(
															'resourceHub.reviewDateUnavailable',
														)}
												</AppText>
											</View>
										</View>

										<AppButton
											label={openLabel}
											disabled={
												openingSourceId !== null
											}
											accessibilityLabel={`${openLabel}: ${sourceTitle}`}
											onPress={() => {
												void handleOpenSource(
													resourceSource,
												);
											}}
										/>
									</View>
								);
							})}
						</View>
					) : (
						<View style={styles.noSources}>
							<Ionicons
								accessible={false}
								name="information-circle-outline"
								size={responsiveSize(
									width,
									height,
									0.043,
								)}
								color="#64748B"
							/>

							<AppText
								variant="body"
								tone="muted"
							>
								{translate(
									'resourceHub.noSources',
								)}
							</AppText>
						</View>
					)}
				</View>

				<View style={styles.sourceContextNotice}>
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

					<AppText
						variant="caption"
						tone="muted"
					>
						{translate(
							'resourceHub.sourceContext',
						)}
					</AppText>
				</View>
			</ScrollView>
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
			paddingBottom: responsiveSize(width, height, 0.05),
		},

		stateContainer: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			gap: responsiveSize(width, height, 0.028),
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

		heroCard: {
			gap: responsiveSize(width, height, 0.022),
			padding: responsiveSize(width, height, 0.034),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#C7D6E1',
			borderStartWidth: responsiveSize(width, height, 0.012),
			borderStartColor: '#173F5F',
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

		heroTopRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.02),
		},

		heroIcon: {
			width: responsiveSize(width, height, 0.1),
			height: responsiveSize(width, height, 0.1),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		heroText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.006),
		},

		contextPanel: {
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.028),
			backgroundColor: '#F1F6FA',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#B9CBD8',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		contextRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.025),
		},

		contextItem: {
			flexGrow: 1,
			flexBasis: '42%',
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.012),
		},

		contextIcon: {
			width: responsiveSize(width, height, 0.068),
			height: responsiveSize(width, height, 0.068),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		contextIconOffline: {
			backgroundColor: '#FFF0C2',
		},

		contextText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.002),
		},

		reviewRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.018),
			paddingTop: responsiveSize(width, height, 0.016),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#D5E0E8',
		},

		reviewMetadata: {
			flex: 1,
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.012),
			minWidth: responsiveSize(width, height, 0.35),
		},

		refreshButton: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.008),
			paddingHorizontal: responsiveSize(width, height, 0.018),
			paddingVertical: responsiveSize(width, height, 0.01),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#9FB3C3',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		refreshButtonPressed: {
			backgroundColor: '#E4ECF5',
		},

		refreshButtonDisabled: {
			opacity: 0.5,
		},

		section: {
			gap: responsiveSize(width, height, 0.02),
		},

		sectionHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
		},

		sectionHeadingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.005),
		},

		sectionHeadingIcon: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		sectionHeadingIconTeal: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E7F3F1',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		sectionHeadingIconAmber: {
			width: responsiveSize(width, height, 0.07),
			height: responsiveSize(width, height, 0.07),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		topicList: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.012),
		},

		topicChip: {
			maxWidth: '100%',
			gap: responsiveSize(width, height, 0.003),
			paddingHorizontal: responsiveSize(width, height, 0.02),
			paddingVertical: responsiveSize(width, height, 0.01),
			borderWidth: responsiveSize(width, height, 0.002),
			borderRadius: responsiveSize(width, height, 0.008),
		},

		primaryTopicChip: {
			backgroundColor: '#DDEAF3',
			borderColor: '#93B1C7',
		},

		relatedTopicChip: {
			backgroundColor: '#F7F9FB',
			borderColor: '#CBD5E1',
		},

		guidancePanel: {
			padding: responsiveSize(width, height, 0.034),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#C9D8D5',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderStartColor: '#176B66',
			borderRadius: responsiveSize(width, height, 0.01),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(width, height, 0.005),
			},
			shadowOpacity: 0.05,
			shadowRadius: responsiveSize(width, height, 0.01),
			elevation: 1,
		},

		sourceList: {
			gap: responsiveSize(width, height, 0.025),
		},

		sourceCard: {
			gap: responsiveSize(width, height, 0.022),
			padding: responsiveSize(width, height, 0.03),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(width, height, 0.009),
			borderRadius: responsiveSize(width, height, 0.012),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(width, height, 0.005),
			},
			shadowOpacity: 0.06,
			shadowRadius: responsiveSize(width, height, 0.01),
			elevation: 1,
		},

		sourceCardOfficial: {
			borderStartColor: '#176B66',
		},

		sourceCardReference: {
			borderStartColor: '#315A7D',
		},

		sourceHeader: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.016),
		},

		sourceTypeIcon: {
			width: responsiveSize(width, height, 0.075),
			height: responsiveSize(width, height, 0.075),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		officialIcon: {
			backgroundColor: '#E7F3F1',
		},

		referenceIcon: {
			backgroundColor: '#E4ECF5',
		},

		sourceHeaderText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.01),
		},

		sourceBadge: {
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			paddingHorizontal: responsiveSize(width, height, 0.016),
			paddingVertical: responsiveSize(width, height, 0.005),
			borderWidth: responsiveSize(width, height, 0.002),
			borderRadius: responsiveSize(width, height, 0.007),
		},

		officialBadge: {
			backgroundColor: '#EAF7EE',
			borderColor: '#8AC59A',
		},

		referenceBadge: {
			backgroundColor: '#EAF2F8',
			borderColor: '#9BBBD2',
		},

		sourceMetadata: {
			gap: responsiveSize(width, height, 0.016),
			paddingTop: responsiveSize(width, height, 0.012),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#E5E7EB',
		},

		metadataBlock: {
			gap: responsiveSize(width, height, 0.004),
		},

		noSources: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.012),
			padding: responsiveSize(width, height, 0.025),
			backgroundColor: '#F7F9FB',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#D8DEE3',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		sourceContextNotice: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.012),
			paddingHorizontal: responsiveSize(width, height, 0.022),
			paddingVertical: responsiveSize(width, height, 0.016),
			backgroundColor: '#F7F9FB',
			borderStartWidth: responsiveSize(width, height, 0.007),
			borderStartColor: '#315A7D',
		},
	});