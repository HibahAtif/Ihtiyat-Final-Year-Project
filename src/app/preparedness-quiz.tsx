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
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import {
	AppMultiSelectionOption,
	AppSelectionOption,
} from '@/components/AppSelectionOption';
import { AppScreen } from '@/components/AppScreen';
import { AppStatusMessage } from '@/components/AppStatusMessage';
import { AppText } from '@/components/AppText';

import { useQuizData } from '@/features/preparedness/QuizDataProvider';

import type {
	QuizOption,
	QuizQuestion,
	QuizSubmissionResult,
	UserQuizProgress,
} from '@/features/preparedness/quiz-types';

import {
	getResourcesForQuizQuestion,
	type ResourceHubLinkedResource,
} from '@/features/resource-hub/resource-hub-derivation';

import { useResourceHub } from '@/features/resource-hub/ResourceHubProvider';
import { useAppLanguage } from '@/localization/AppLanguageProvider';
import { responsiveSize } from '@/utils/responsive-sizing';


type SelectedOptionsByQuestion = {
	[questionId: number]: number[];
};


type SubmissionResultsByQuestion = {
	[questionId: number]: QuizSubmissionResult | undefined;
};


/**
 * Interactive preparedness Quiz.
 *
 * The client deliberately never works out whether an answer is correct.
 * Selected option IDs go to the protected Quiz service and all assessment
 * feedback shown below comes back from that authoritative result.
 *
 * Deliberately made sure guests can still use the full learning experience; signing in only adds
 * private attempt history and saved progress.
 */
export default function PreparednessQuizScreen() {
	const { width, height } = useWindowDimensions();
	const { language, isRTL, translate } = useAppLanguage();
	const { isAuthenticated } = useAuth();

	const {
		questions,
		options,
		progress,
		catalogueStatus,
		progressStatus,
		refresh,
		submitAnswer,
	} = useQuizData();

	const { catalogue: resourceHubCatalogue } = useResourceHub();

	const [selectedOptions, setSelectedOptions] =
		useState<SelectedOptionsByQuestion>({});

	const [submissionResults, setSubmissionResults] =
		useState<SubmissionResultsByQuestion>({});

	const [submittingQuestionIds, setSubmittingQuestionIds] =
		useState<Set<number>>(() => new Set());

	const [submissionErrorQuestionIds, setSubmissionErrorQuestionIds] =
		useState<Set<number>>(() => new Set());

	const styles = useMemo(
		() => createStyles(width, height, isRTL),
		[width, height, isRTL],
	);


	/*
	 * Questions and options arrive as separate catalogue rows. Grouping them
	 * once keeps the render and interaction handlers simple without changing
	 * the canonical ordering supplied by QuizDataProvider.
	 */
	const optionsByQuestion = useMemo(() => {
		const groupedOptions = new Map<number, QuizOption[]>();

		for (const option of options) {
			const questionOptions =
				groupedOptions.get(option.question_id) ?? [];

			questionOptions.push(option);
			groupedOptions.set(option.question_id, questionOptions);
		}

		return groupedOptions;
	}, [options]);


	// Private progress is account-owned; the screen only indexes what the provider exposes.
	const progressByQuestion = useMemo(
		() =>
			new Map<number, UserQuizProgress>(
				progress.map((item) => [item.question_id, item]),
			),
		[progress],
	);


	/*
	 * Resource Hub guidance is resolved in advance but remains hidden until a
	 * fresh answer has actually been checked. That prevents reviewed guidance
	 * from becoming a pre-answer hint.
	 */
	const relatedGuidanceByQuestionId = useMemo(() => {
		const guidanceByQuestionId =
			new Map<number, ResourceHubLinkedResource[]>();

		if (!resourceHubCatalogue) {
			return guidanceByQuestionId;
		}

		for (const question of questions) {
			const linkedResources = getResourcesForQuizQuestion(
				resourceHubCatalogue,
				question.id,
			);

			if (linkedResources.length > 0) {
				guidanceByQuestionId.set(
					question.id,
					linkedResources,
				);
			}
		}

		return guidanceByQuestionId;
	}, [questions, resourceHubCatalogue]);


	/*
	 * Feedback only describes the answer that was actually submitted. As soon
	 * as the user changes a choice I clear that older feedback and its related
	 * guidance together.
	 */
	const clearQuestionFeedback = (questionId: number): void => {
		setSubmissionResults((currentResults) => ({
			...currentResults,
			[questionId]: undefined,
		}));

		setSubmissionErrorQuestionIds((currentIds) => {
			const nextIds = new Set(currentIds);
			nextIds.delete(questionId);
			return nextIds;
		});
	};


	const handleSingleSelect = (
		questionId: number,
		optionId: number,
	): void => {
		if (submittingQuestionIds.has(questionId)) {
			return;
		}

		setSelectedOptions((currentSelections) => ({
			...currentSelections,
			[questionId]: [optionId],
		}));

		clearQuestionFeedback(questionId);
	};


	const handleMultiSelect = (
		questionId: number,
		optionId: number,
	): void => {
		if (submittingQuestionIds.has(questionId)) {
			return;
		}

		setSelectedOptions((currentSelections) => {
			const currentQuestionSelections =
				currentSelections[questionId] ?? [];

			const nextQuestionSelections =
				currentQuestionSelections.includes(optionId)
					? currentQuestionSelections.filter(
							(currentOptionId) =>
								currentOptionId !== optionId,
						)
					: [...currentQuestionSelections, optionId];

			return {
				...currentSelections,
				[questionId]: nextQuestionSelections,
			};
		});

		clearQuestionFeedback(questionId);
	};


	/*
	 * Quiz attempts are intentionally online-only.The selected
	 * answer is preserved after a connection failure so the user can retry without starting
	 * that question again.
	 */
	const handleSubmitQuestion = async (
		question: QuizQuestion,
		questionOptions: QuizOption[],
	): Promise<void> => {
		const currentSelection =
			selectedOptions[question.id] ?? [];

		if (
			currentSelection.length === 0
			|| submittingQuestionIds.has(question.id)
		) {
			return;
		}

		const canonicalSelection = questionOptions
			.filter((option) =>
				currentSelection.includes(option.id),
			)
			.map((option) => option.id);

		setSubmissionResults((currentResults) => ({
			...currentResults,
			[question.id]: undefined,
		}));

		setSubmissionErrorQuestionIds((currentIds) => {
			const nextIds = new Set(currentIds);
			nextIds.delete(question.id);
			return nextIds;
		});

		setSubmittingQuestionIds((currentIds) => {
			const nextIds = new Set(currentIds);
			nextIds.add(question.id);
			return nextIds;
		});

		try {
			const result = await submitAnswer(
				question.id,
				canonicalSelection,
			);

			// No answer key is calculated on-device.
			setSubmissionResults((currentResults) => ({
				...currentResults,
				[question.id]: result,
			}));
		} catch {
			setSubmissionErrorQuestionIds((currentIds) => {
				const nextIds = new Set(currentIds);
				nextIds.add(question.id);
				return nextIds;
			});
		} finally {
			setSubmittingQuestionIds((currentIds) => {
				const nextIds = new Set(currentIds);
				nextIds.delete(question.id);
				return nextIds;
			});
		}
	};


	const renderQuestion = (
		question: QuizQuestion,
		questionIndex: number,
	) => {
		const questionOptions =
			optionsByQuestion.get(question.id) ?? [];

		const selectedQuestionOptions =
			selectedOptions[question.id] ?? [];

		const questionProgress =
			progressByQuestion.get(question.id);

		const submissionResult =
			submissionResults[question.id];

		const relatedGuidance =
			relatedGuidanceByQuestionId.get(question.id) ?? [];

		const isSubmitting =
			submittingQuestionIds.has(question.id);

		const hasSubmissionError =
			submissionErrorQuestionIds.has(question.id);

		const questionPrompt =
			language === 'ar'
				? question.prompt_ar
				: question.prompt_en;

		const isMultiSelect =
			question.question_type === 'multi_select';

		const instruction = isMultiSelect
			? translate('quiz.multiSelectInstruction')
			: translate('quiz.singleSelectInstruction');

		const resultExplanation = submissionResult
			? language === 'ar'
				? submissionResult.explanation_ar
				: submissionResult.explanation_en
			: null;

		/*
		 * These IDs come back from submit_quiz_answer(). The UI only resolves
		 * them against the public options so it can display readable answers.
		 */
		const correctOptionTexts = submissionResult
			? questionOptions
					.filter((option) =>
						submissionResult.correct_option_ids.includes(
							option.id,
						),
					)
					.map((option) =>
						language === 'ar'
							? option.text_ar
							: option.text_en,
					)
			: [];

		return (
			<View
				key={question.id}
				style={[
					styles.questionCard,
					isMultiSelect
						? styles.multiQuestionCard
						: styles.singleQuestionCard,
				]}
			>
				<View style={styles.questionTopRow}>
					<View
						style={[
							styles.questionNumber,
							isMultiSelect
								? styles.questionNumberAmber
								: styles.questionNumberBlue,
						]}
					>
						<AppText variant="subtitle">
							{String(questionIndex + 1)}
						</AppText>
					</View>

					<View style={styles.questionHeader}>
						<AppText variant="subtitle">
							{questionPrompt}
						</AppText>

						<View
							style={[
								styles.instructionBadge,
								isMultiSelect
									? styles.instructionBadgeAmber
									: styles.instructionBadgeBlue,
							]}
						>
							<Ionicons
								accessible={false}
								name={
									isMultiSelect
										? 'checkbox-outline'
										: 'ellipse-outline'
								}
								size={responsiveSize(
									width,
									height,
									0.036,
								)}
								color={
									isMultiSelect
										? '#8A5A00'
										: '#315A7D'
								}
							/>

							<AppText variant="caption" tone="muted">
								{instruction}
							</AppText>
						</View>
					</View>
				</View>

				<View style={styles.optionList}>
					{questionOptions.map((option) => {
						const optionText =
							language === 'ar'
								? option.text_ar
								: option.text_en;

						const isSelected =
							selectedQuestionOptions.includes(
								option.id,
							);

						/*
						 * The shared selection components keep their tested
						 * radio/checkbox semantics. The outer shell adds Quiz-
						 * specific depth without duplicating those controls.
						 */
						return (
							<View
								key={option.id}
								style={styles.optionShadow}
							>
								{isMultiSelect ? (
									<AppMultiSelectionOption
										label={optionText}
										checked={isSelected}
										disabled={isSubmitting}
										onPress={() => {
											handleMultiSelect(
												question.id,
												option.id,
											);
										}}
									/>
								) : (
									<AppSelectionOption
										label={optionText}
										selected={isSelected}
										disabled={isSubmitting}
										onPress={() => {
											handleSingleSelect(
												question.id,
												option.id,
											);
										}}
									/>
								)}
							</View>
						);
					})}
				</View>

				{isAuthenticated && questionProgress ? (
					<View style={styles.progressSection}>
						{questionProgress.has_correct_answer ? (
							<View style={styles.solvedBadge}>
								<Ionicons
									accessible={false}
									name="checkmark-circle"
									size={responsiveSize(
										width,
										height,
										0.038,
									)}
									color="#24734B"
								/>

								<AppText variant="caption">
									{translate('quiz.solved')}
								</AppText>
							</View>
						) : null}

						<View style={styles.attemptRow}>
							<Ionicons
								accessible={false}
								name="refresh-outline"
								size={responsiveSize(
									width,
									height,
									0.036,
								)}
								color="#64748B"
							/>

							<AppText variant="caption" tone="muted">
								{`${translate('quiz.attempts')}: ${questionProgress.attempt_count}`}
							</AppText>
						</View>
					</View>
				) : null}

				{submissionResult ? (
					<View
						style={[
							styles.feedbackSection,
							submissionResult.is_correct
								? styles.correctFeedback
								: styles.incorrectFeedback,
						]}
					>
						<View style={styles.feedbackHeading}>
							<Ionicons
								accessible={false}
								name={
									submissionResult.is_correct
										? 'checkmark-circle'
										: 'close-circle'
								}
								size={responsiveSize(
									width,
									height,
									0.05,
								)}
								color={
									submissionResult.is_correct
										? '#24734B'
										: '#B42318'
								}
							/>

							<AppStatusMessage
								message={
									submissionResult.is_correct
										? translate('quiz.correct')
										: translate('quiz.incorrect')
								}
								tone={
									submissionResult.is_correct
										? 'success'
										: 'error'
								}
							/>
						</View>

						{resultExplanation ? (
							<AppText variant="body">
								{resultExplanation}
							</AppText>
						) : null}

						{correctOptionTexts.length === 1 ? (
								<View style={styles.correctAnswerBlock}>
                                    <AppText variant="caption">
                                        {`${translate('quiz.correctAnswer')}: ${correctOptionTexts[0]}`}
                                    </AppText>
                                </View>
						) : null}

						{correctOptionTexts.length > 1 ? (
							<View style={styles.correctAnswersSection}>
								<AppText
									variant="caption"
									tone="muted"
								>
									{translate('quiz.correctAnswers')}
								</AppText>

								{correctOptionTexts.map((correctOptionText, index) => (
                                    <AppText
                                        key={`${question.id}-correct-${index}`}
                                        variant="caption"
                                    >
                                        {`• ${correctOptionText}`}
                                    </AppText>
                                ))}
							</View>
						) : null}
					</View>
				) : null}

				{submissionResult && relatedGuidance.length > 0 ? (
					<View style={styles.relatedGuidanceSection}>
						<View style={styles.relatedGuidanceHeading}>
							<View style={styles.guidanceHeadingIcon}>
								<Ionicons
									accessible={false}
									name="book-outline"
									size={responsiveSize(
										width,
										height,
										0.045,
									)}
									color="#315A7D"
								/>
							</View>

							<View style={styles.relatedGuidanceHeadingText}>
								<AppText variant="subtitle">
									{translate(
										'quiz.reviewRelatedGuidance',
									)}
								</AppText>

								<AppText
									variant="caption"
									tone="muted"
								>
									{translate(
										'quiz.relatedGuidanceExplanation',
									)}
								</AppText>
							</View>
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
												'quiz.primaryGuidance',
											)
										: translate(
												'quiz.supportingGuidance',
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
														String(resource.id),
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
												styles.guidanceLinkAction
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
													0.037,
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

				{hasSubmissionError ? (
					<AppStatusMessage
						message={translate(
							'quiz.connectionRequired',
						)}
						tone="error"
					/>
				) : null}

				<AppButton
					label={
						isSubmitting
							? translate('quiz.checkingAnswer')
							: translate('quiz.checkAnswer')
					}
					disabled={
						selectedQuestionOptions.length === 0
						|| isSubmitting
					}
					onPress={() => {
						void handleSubmitQuestion(
							question,
							questionOptions,
						);
					}}
				/>
			</View>
		);
	};


	// Public catalogue failures may gate the Quiz; private progress failures never do.
	if (catalogueStatus === 'loading') {
		return (
			<AppScreen>
				<Stack.Screen options={{ headerShown: false }} />
				<AppHeader showBackButton />

				<View style={styles.centeredState}>
					<View style={styles.stateIcon}>
						<Ionicons
							accessible={false}
							name="school-outline"
							size={responsiveSize(
								width,
								height,
								0.075,
							)}
							color="#173F5F"
						/>
					</View>

					<AppText
						alignment="center"
						variant="body"
						tone="muted"
					>
						{translate('quiz.loading')}
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
							name="cloud-offline-outline"
							size={responsiveSize(
								width,
								height,
								0.075,
							)}
							color="#A84E17"
						/>
					</View>

					<AppStatusMessage
						message={translate('quiz.loadError')}
						tone="error"
					/>

					<AppButton
						label={translate('quiz.retry')}
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
					<View style={styles.pageHeading}>
						<View style={styles.pageHeadingIcon}>
							<Ionicons
								accessible={false}
								name="school-outline"
								size={responsiveSize(
									width,
									height,
									0.062,
								)}
								color="#8A5A00"
							/>
						</View>

						<View style={styles.pageHeadingText}>
							<AppText variant="title">
								{translate('quiz.title')}
							</AppText>

							<AppText variant="body" tone="muted">
								{translate('quiz.subtitle')}
							</AppText>
						</View>
					</View>
				</View>

				{!isAuthenticated ? (
					<View style={styles.guestBanner}>
						<View style={styles.guestBannerContent}>
							<View style={styles.guestIcon}>
								<Ionicons
									accessible={false}
									name="person-outline"
									size={responsiveSize(
										width,
										height,
										0.047,
									)}
									color="#315A7D"
								/>
							</View>

							<AppText variant="body">
								{translate('quiz.signInToSave')}
							</AppText>
						</View>

						<AppButton
							label={translate('quiz.signIn')}
							onPress={() => {
								router.push('/sign-in');
							}}
						/>
					</View>
				) : null}

				{isAuthenticated && progressStatus === 'loading' ? (
					<AppStatusMessage
						message={translate(
							'quiz.progressLoading',
						)}
						tone="info"
					/>
				) : null}

				{isAuthenticated && progressStatus === 'error' ? (
					<AppStatusMessage
						message={translate(
							'quiz.progressLoadError',
						)}
						tone="error"
					/>
				) : null}

				{questions.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons
							accessible={false}
							name="help-circle-outline"
							size={responsiveSize(
								width,
								height,
								0.065,
							)}
							color="#64748B"
						/>

						<AppStatusMessage
							message={translate(
								'quiz.noQuestions',
							)}
							tone="info"
						/>
					</View>
				) : (
					questions.map(renderQuestion)
				)}
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
		scrollContent: {
			gap: responsiveSize(width, height, 0.035),
			paddingBottom: responsiveSize(width, height, 0.08),
		},

		centeredState: {
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
			backgroundColor: '#FFF0C2',
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

		pageHeader: {
			gap: responsiveSize(width, height, 0.018),
		},

		pageHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.022),
		},

		pageHeadingIcon: {
			width: responsiveSize(width, height, 0.105),
			height: responsiveSize(width, height, 0.105),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#FFF0C2',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		pageHeadingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.01),
		},

		guestBanner: {
			gap: responsiveSize(width, height, 0.02),
			padding: responsiveSize(width, height, 0.028),
			backgroundColor: '#EEF3F7',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#B9CBD8',
			borderRadius: responsiveSize(width, height, 0.012),
		},

		guestBannerContent: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.015),
		},

		guestIcon: {
			width: responsiveSize(width, height, 0.075),
			height: responsiveSize(width, height, 0.075),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		questionCard: {
			gap: responsiveSize(width, height, 0.028),
			padding: responsiveSize(width, height, 0.032),
			backgroundColor: '#FFFFFF',
			borderWidth: responsiveSize(width, height, 0.0025),
			borderColor: '#D8DEE3',
			borderStartWidth: responsiveSize(width, height, 0.011),
			borderRadius: responsiveSize(width, height, 0.014),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(width, height, 0.007),
			},
			shadowOpacity: 0.08,
			shadowRadius: responsiveSize(width, height, 0.014),
			elevation: 3,
		},

		singleQuestionCard: {
			borderStartColor: '#173F5F',
		},

		multiQuestionCard: {
			borderStartColor: '#B27A00',
		},

		questionTopRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.02),
		},

		questionNumber: {
			width: responsiveSize(width, height, 0.075),
			height: responsiveSize(width, height, 0.075),
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: responsiveSize(width, height, 0.008),
		},

		questionNumberBlue: {
			backgroundColor: '#E4ECF5',
		},

		questionNumberAmber: {
			backgroundColor: '#FFF0C2',
		},

		questionHeader: {
			flex: 1,
			gap: responsiveSize(width, height, 0.014),
		},

		instructionBadge: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			alignSelf: isRTL ? 'flex-end' : 'flex-start',
			gap: responsiveSize(width, height, 0.008),
			maxWidth: '100%',
			paddingHorizontal: responsiveSize(width, height, 0.016),
			paddingVertical: responsiveSize(width, height, 0.007),
			borderWidth: responsiveSize(width, height, 0.002),
			borderRadius: responsiveSize(width, height, 0.007),
		},

		instructionBadgeBlue: {
			backgroundColor: '#EAF2F8',
			borderColor: '#AAC1D2',
		},

		instructionBadgeAmber: {
			backgroundColor: '#FFF7D6',
			borderColor: '#E5C05B',
		},

		optionList: {
			gap: responsiveSize(width, height, 0.018),
		},

		optionShadow: {
			backgroundColor: '#FFFFFF',
			borderRadius: responsiveSize(width, height, 0.018),
			shadowColor: '#0F172A',
			shadowOffset: {
				width: 0,
				height: responsiveSize(width, height, 0.005),
			},
			shadowOpacity: 0.08,
			shadowRadius: responsiveSize(width, height, 0.01),
			elevation: 2,
		},

		progressSection: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			flexWrap: 'wrap',
			gap: responsiveSize(width, height, 0.014),
			paddingTop: responsiveSize(width, height, 0.014),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#E5E7EB',
		},

		solvedBadge: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.006),
			paddingHorizontal: responsiveSize(width, height, 0.014),
			paddingVertical: responsiveSize(width, height, 0.006),
			backgroundColor: '#EAF7EE',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#8AC59A',
			borderRadius: responsiveSize(width, height, 0.007),
		},

		attemptRow: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.007),
		},

		feedbackSection: {
			gap: responsiveSize(width, height, 0.018),
			padding: responsiveSize(width, height, 0.025),
			borderWidth: responsiveSize(width, height, 0.002),
			borderStartWidth: responsiveSize(width, height, 0.008),
			borderRadius: responsiveSize(width, height, 0.01),
		},

		correctFeedback: {
			backgroundColor: '#F1F8F3',
			borderColor: '#A7D3B2',
			borderStartColor: '#24734B',
		},

		incorrectFeedback: {
			backgroundColor: '#FFF3F1',
			borderColor: '#E8B4AD',
			borderStartColor: '#B42318',
		},

		feedbackHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.012),
		},

		correctAnswerBlock: {
			gap: responsiveSize(width, height, 0.005),
			paddingTop: responsiveSize(width, height, 0.01),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#D8E4DA',
		},

		correctAnswersSection: {
			gap: responsiveSize(width, height, 0.01),
			paddingTop: responsiveSize(width, height, 0.01),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#D8E4DA',
		},

		relatedGuidanceSection: {
			gap: responsiveSize(width, height, 0.015),
			paddingTop: responsiveSize(width, height, 0.012),
			borderTopWidth: responsiveSize(width, height, 0.002),
			borderTopColor: '#D8DEE3',
		},

		relatedGuidanceHeading: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'flex-start',
			gap: responsiveSize(width, height, 0.014),
		},

		guidanceHeadingIcon: {
			width: responsiveSize(width, height, 0.072),
			height: responsiveSize(width, height, 0.072),
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: '#E4ECF5',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		relatedGuidanceHeadingText: {
			flex: 1,
			gap: responsiveSize(width, height, 0.004),
		},

		guidanceLink: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: responsiveSize(width, height, 0.02),
			minHeight: responsiveSize(width, height, 0.105),
			paddingHorizontal: responsiveSize(width, height, 0.024),
			paddingVertical: responsiveSize(width, height, 0.017),
			backgroundColor: '#EDF5FA',
			borderWidth: responsiveSize(width, height, 0.002),
			borderColor: '#B8D2E5',
			borderRadius: responsiveSize(width, height, 0.009),
		},

		guidanceLinkContent: {
			flex: 1,
			gap: responsiveSize(width, height, 0.004),
		},

		guidanceLinkAction: {
			flexDirection: isRTL ? 'row-reverse' : 'row',
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.005),
		},

		guidanceLinkPressed: {
			opacity: 0.65,
		},

		emptyState: {
			alignItems: 'center',
			gap: responsiveSize(width, height, 0.018),
			padding: responsiveSize(width, height, 0.03),
		},
	});