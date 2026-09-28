/**
 * English translations used throughout the app.
 *
 * Translation keys are organised by feature/domain rather than by screen
 * implementation. 
 * The Arabic translation file  mirrors this same 
 * structure so the UI can switch language without duplicating components.
*/
const english_translation_dict = {
	// Text reused across multiple parts of the application.
	common: {
		appName: 'Ihtiyat',
		continue: 'Continue',
		back: 'Back',
		save: 'Save',
		cancel: 'Cancel',
	},

	// Main Home screen content.
	home: {
		title: 'Preparedness starts before an emergency',
		subtitle:
			'Build your readiness, understand your local hazards, and access trusted safety guidance.',
		readyToday: 'Ready today',
		progressTitle: "Your mission's progress",
		continuePreparing: 'Continue preparing',
		quickAccess: 'Quick access',

		quizDescription: 'Check your practical preparedness knowledge.',
		progressDescription: 'Review your mission completion, points, and earned achievements.',
		locationDescription: 'Change the location used for the local preparedness guidance.',

		profileAction: 'Profile',
		profileDescription: 'Manage your preferences and accessibility settings.',
		createAccountDescription: 'Save progress and preferences across devices.',

		guestProgressTitle: 'Save your preparedness progress',
		guestProgressDescription:
			'Sign in to track completed tasks, points, and achievements.',

		progressUnavailable: 'Mission progress is unavailable right now.',
	},

	// Location setup and location-management text.
	location: {
		title: 'Your location',

		subtitle:
			'Choose the Saudi location Ihtiyat should use for local hazards and preparedness guidance.',

		currentLocationTitle:
			'Current location',

		noLocationSelected:
			'You have not selected a location yet.',

		useCurrentLocation:
			'Use my current location',

		useCurrentLocationDescription:
			'Ihtiyat will use your device location once to find the closest supported Saudi location.',

		detectingLocation:
			'Finding your location…',

		chooseManually:
			'Choose manually',

		manualDescription:
			'Search Ihtiyat’s curated Saudi location catalogue.',

		searchLabel:
			'Search locations',

		searchPlaceholder:
			'Search by location name',

		loadingLocations:
			'Loading available locations…',

		locationLoadError:
			'Available locations could not be loaded. Please try again.',

		noSearchResults:
			'No supported locations match your search.',

		detectedLocationTitle:
			'Detected location',

		selectedLocationTitle:
			'Selected location',

		confirmLocation:
			'Confirm location',

		savingLocation:
			'Saving location…',

		saveSuccess:
			'Your location has been updated.',

		saveError:
			'Your location could not be saved. Please try again.',

		localCacheWarning:
			'Your account location was saved, but the offline copy could not be updated.',

		servicesDisabled:
			'Device location services are turned off. Choose your location manually or enable location services.',

		permissionDenied:
			'Location permission is unavailable. You can still choose your location manually.',

		positionUnavailable:
			'Your current position could not be determined. Choose your location manually.',

		reverseGeocodingFailed:
			'Your position was found, but Ihtiyat could not identify the location. Check your connection or choose manually.',

		unsupportedLocation:
			'Ihtiyat could not match your current position to a supported location. Choose manually instead.',

		jeddahPilot:
			'Jeddah pilot location',

		locationCode:
			'Location code',
		automaticLocationError:
			'Your location could not be resolved right now. Please try again.',
	},

	// Preparedness mission labels.
	preparedness: {
		title: 'Preparedness Missions',
		subtitle: 'Complete practical checklists to build your preparedness.',
		loading: 'Loading preparedness missions…',
		loadError: 'Preparedness missions could not be loaded. Please try again.',
		retry: 'Try again',
		noMissions: 'No preparedness missions are available right now.',
		progress: 'Mission completion',
		tasksCompleted: 'Tasks completed',
		readinessPoints: 'Readiness points',
		points: 'points',
		pendingSync: 'Pending sync',
		signInToSave: 'Sign in to save checklist progress and unlock achievements.',
		signIn: 'Sign in to save progress',
		progressLoadError:
			'Your saved mission progress could not be loaded. You can still read the preparedness guidance.',
		progressLoading: 'Loading saved progress…',
		locationRequired:
			'Choose a location to see the hazard-specific tasks for this mission.',
		chooseLocation: 'Choose location',
		taskSaveError:
			'This checklist change could not be saved. Please try again.',

		relatedGuidance:
			'Related guidance',

		primaryGuidance:
			'Primary guidance',

		supportingGuidance:
			'Supporting guidance',
	},

	// Preparedness Quiz labels and feedback.
	quiz: {
		title:
			'Preparedness Quiz',

		subtitle:
			'Check your understanding of practical preparedness guidance.',

		loading:
			'Loading preparedness questions…',

		loadError:
			'Preparedness questions could not be loaded. Please try again.',

		retry:
			'Try again',

		noQuestions:
			'No preparedness questions are available right now.',

		singleSelectInstruction:
			'Choose one answer.',

		multiSelectInstruction:
			'Choose all answers that apply.',

		checkAnswer:
			'Check answer',

		checkingAnswer:
			'Checking answer…',

		correct:
			'Correct',

		incorrect:
			'Incorrect',

		correctAnswer:
			'Correct answer',

		correctAnswers:
			'Correct answers',

		signInToSave:
			'Sign in to save quiz progress and attempts.',

		signIn:
			'Sign in to save quiz progress',

		progressLoading:
			'Loading saved quiz progress…',

		progressLoadError:
			'Your saved quiz progress could not be loaded. You can still answer preparedness questions.',

		solved:
			'Solved',

		attempts:
			'Attempts',

		connectionRequired:
			'A connection is required to check this answer. Your selection has been kept so you can try again.',

		reviewRelatedGuidance:
			'Review related guidance',

		relatedGuidanceExplanation:
			'Use the reviewed guidance below to reinforce what you have just learned.',

		primaryGuidance:
			'Primary guidance',

		supportingGuidance:
			'Supporting guidance',
	},

	// Labels used by the main application navigation.
	navigation: {
		home: 'Home',
		missions: 'Missions',
		quiz: 'Preparedness Quiz',
		alerts: 'Alerts',
		resources: 'Resources',
	},

	// Preparedness achievement catalogue and private earned-progress labels.
	achievements: {
		title: 'Progress & Achievements',

		subtitle:
			'Track preparedness milestones earned through missions and quiz progress.',

		loading:
			'Loading achievements…',

		loadError:
			'Achievements could not be loaded. Please try again.',

		retry:
			'Try again',

		noAchievements:
			'No achievements are available right now.',

		signInToView:
			'Sign in to track and view your earned achievements.',

		signIn:
			'Sign in to view achievements',

		progressLoading:
			'Loading your earned achievements…',

		progressLoadError:
			'Your earned achievements could not be loaded. You can still view the available milestones.',

		earnedAchievements:
			'Earned achievements',

		earned:
			'Earned',

		notEarned:
			'Not earned yet',

		missionProgress:
			'Mission progress',

		missionProgressLoading:
			'Loading your mission progress…',

		missionProgressLoadError:
			'Your saved mission progress could not be loaded. Your achievements remain available.',

		preparednessUnavailable:
			'Current mission information could not be loaded. Your achievements remain available.',

		missionCompletion:
			'Mission completion',

		tasksCompleted:
			'Tasks completed',

		missionsCompleted:
			'Missions completed',

		pendingSync:
			'Changes waiting to sync',

		completionDisclaimer:
			'Mission completion reflects the preparedness tasks you have completed. It is not a measure or guarantee of household safety.',

		recentAchievements:
			'Recent achievements',

		earnedOn:
			'Earned on',
	},

	// Language-selection labels.
	language: {
		english: 'English',
		arabic: 'Arabic',
		switchToArabic: 'العربية',
		switchToEnglish: 'English',
	},

	// Authentication and account-access text.
	authentication: {
		registerTitle: 'Create your account',
		registerSubtitle:
			'Save your preparedness progress and preferences across devices.',
		emailLabel: 'Email address',
		emailPlaceholder: 'name@example.com',
		passwordLabel: 'Password',
		passwordPlaceholder: 'Enter your password',
		confirmPasswordLabel: 'Confirm password',
		confirmPasswordPlaceholder: 'Re-enter your password',
		createAccount: 'Create account',
		noAccountYet: 'Don’t have an account?',
		emailConfirmationNotice:
			'Use a valid email address when creating an account. You must confirm that address before you can sign in.',
		
		signIn: 'Sign in',
		alreadyHaveAccount: 'Already have an account?',
		requiredFields:
			'Please complete all required fields.',
		passwordMismatch:
			'The passwords do not match.',
		passwordTooShort:
			'Your password must contain at least 8 characters.',
		registrationError:
			'We could not create your account. Please try again.',
		checkEmailTitle: 'Check your email',
		checkEmailMessage:
			'Your account has been created. Confirm your email address before signing in.',

		confirmationProcessingTitle: 'Confirming your email',
		confirmationProcessingMessage:
			'Please wait while Ihtiyat completes your account confirmation.',
		confirmationSuccessTitle: 'Email confirmed',
		confirmationSuccessMessage:
			'Your email has been confirmed successfully.',
		confirmationErrorTitle: 'Unable to confirm email',
		confirmationErrorMessage:
			'This confirmation link is invalid or has expired. Please return to Ihtiyat and try again.',
		returnToApp: 'Return to Ihtiyat',

		signInTitle: 'Sign in',
		signInSubtitle:
			'Access your saved preparedness progress and preferences.',
		invalidCredentials:
			'The email address or password is incorrect.',
		signInError:
			'Unable to sign in right now. Please try again.',
		signOut: 'Sign out',

		forgotPassword: 'Forgot password?',
		resetPasswordTitle: 'Reset your password',
		resetPasswordSubtitle:
			'Enter the email address linked to your Ihtiyat account.',
		sendResetLink: 'Send reset link',
		recoveryRouteTitle: 'Password recovery',
		recoveryRouteMessage:
			'Your password recovery link has opened successfully in Ihtiyat.',
		returnToSignIn: 'Return to sign in',

		resetEmailSentTitle: 'Check your email',
		resetEmailSentMessage:
			'If an Ihtiyat account is linked to this email address, a password reset link has been sent to it.',
		resetRequestError:
			'Unable to send a password reset link right now. Please try again.',

		recoveryProcessingTitle:
			'Checking recovery link',
		recoveryProcessingMessage:
			'Please wait while Ihtiyat verifies your password recovery link.',

		newPasswordTitle:
			'Choose a new password',
		newPasswordSubtitle:
			'Enter a new password for your Ihtiyat account.',

		newPasswordLabel:
			'New password',
		newPasswordPlaceholder:
			'Enter your new password',

		confirmNewPasswordLabel:
			'Confirm new password',
		confirmNewPasswordPlaceholder:
			'Re-enter your new password',

		updatePassword:
			'Update password',

		newPasswordTooShort:
			'Your new password must be at least 8 characters.',
		newPasswordsDoNotMatch:
			'The passwords do not match.',

		passwordUpdateError:
			'Unable to update your password right now. Please try again.',

		recoveryInvalidTitle:
			'Unable to reset password',
		recoveryInvalidMessage:
			'This password recovery link is invalid or has expired. Please request a new link.',

		passwordUpdatedTitle:
			'Password updated',
		passwordUpdatedMessage:
			'Your password has been updated successfully. You can now sign in with your new password.',
	},

	profile: {
		open: 'Profile & preferences',

		title: 'Profile & preferences',

		subtitle:
			'Save the information Ihtiyat can use to personalise preparedness guidance.',

		loading:
			'Loading your saved profile and available settings…',

		loadError:
			'Your profile could not be loaded. Please try again.',

		retry:
			'Try again',

		accountTitle: 'Your account',

		emailLabel: 'Email',

		locationTitle:
			'Your location',

		locationDescription:
			'Choose the Saudi administrative area that Ihtiyat should use for location-aware guidance.',

		locationCoverageNotice:
			'Detailed hazard-specific coverage is currently implemented for the Jeddah pilot. Other listed regions support the wider Saudi configuration without implying the same level of local hazard coverage.',

		locationRequired:
		'Choose a location before saving your preferences.',

		jeddahPilot:
			'Jeddah pilot location',

		regionLocation:
			'Saudi administrative region',

		householdTitle:
			'Household information',

		householdDescription:
			'Optional household counts help Ihtiyat tailor later preparedness guidance. Leave all four fields blank if you do not want to provide this information.',

		childrenLabel:
			'Children (under 18)',

		adultsLabel:
			'Adults (18–64)',

		olderAdultsLabel:
			'Older adults (65+)',

		petsLabel:
			'Pets',

		householdPrivacyNotice:
			'Ihtiyat stores household counts only. Names, dates of birth and medical information are not requested.',

		householdRequired:
			'Complete all household counts, or leave all four blank.',

		householdWholeNumber:
			'Enter a whole number of zero or more.',

		householdRange25:
			'Enter a value from 0 to 25.',

		householdRange10:
			'Enter a value from 0 to 10.',

		householdAtLeastOnePerson:
			'Household information must include at least one person.',

		householdTotal25:
			'The combined number of people cannot exceed 25.',

		languageTitle:
			'Language',

		languageDescription:
			'Choose the language Ihtiyat should use for your account.',

		textSizeTitle:
			'Text size',

		textSizeDescription:
			'Choose how Ihtiyat should display text. System keeps your device accessibility scaling, while Large adds extra sizing within Ihtiyat.',

		textSizeSystem:
			'Use system setting',

		textSizeSystemDescription:
			'Follow your device text-size and accessibility settings.',

		textSizeLarge:
			'Large',

		textSizeLargeDescription:
			'Use larger text in Ihtiyat in addition to supported system accessibility scaling.',

		savePreferences:
			'Save preferences',

		savingPreferences:
			'Saving preferences…',

		saveSuccess:
			'Your preferences have been saved successfully.',

		saveError:
			'Your preferences could not be saved. Please try again.',
	},

	alerts: {
		title:
			'Alerts',

		currentLocation:
			'Current location',

		noLocation:
			'No location selected',

		simulationHeading:
			"Ihtiyat's simulated alert scenarios",

		simulationMessage:
			'These are just preparedness simulations. They are not official emergency warnings.',

		simulationSeverity:
			'Simulation severity',

		level1:
			'Level 1',

		level2:
			'Level 2',

		level3:
			'Level 3',

		level1AccessibilityLabel:
			'Simulation severity Level 1, caution severity',

		level2AccessibilityLabel:
			'Simulation severity Level 2, elevated severity',

		level3AccessibilityLabel:
			'Simulation severity Level 3, critical severity',

		selected:
			'Selected',

		severityAccessibilityHint:
			'Changes the simulated alert severity used for the emergency action plan.',

		simulationSeverityNotice:
			'A simulation severity only, this is not an official warning level.',

		alertsForLocation:
			'Alerts for your location',

		simulationBadge:
			'SIMULATION',

		viewActionPlan:
			'View emergency action plan',

		actionPlanPreparing:
			'Preparing your action plan context…',

		source:
			'Source',

		remoteSource:
			'Remote simulation catalogue',

		cacheSource:
			'Offline copy — previously downloaded simulation data for the app',

		catalogueStatus: 'Status',

		refresh:
			'Refresh alerts',

		loading:
			'Loading alert scenarios…',

		noAlertsTitle:
			'No applicable alert scenarios',

		noAlertsMessage:
			'No simulated alert scenarios currently apply to your selected location.',

		errorTitle:
			'Unable to load alert scenarios',

		errorMessage:
			'Ihtiyat could not load the alert catalogue from the network or its offline cache.',

		tryAgain:
			'Try again',

		sendSimulationNotification:
			'Send simulated notification',

		sendSimulationNotificationHint:
			'Sends this preparedness simulation as a local notification.',

		notificationSending:
			'Sending simulated notification…',

		notificationSent:
			'Simulation notification sent. Tap it to open the matching action plan.',

		notificationPermissionDenied:
			'Notification permission was not granted. You can still open the action plan in Ihtiyat.',

		notificationError:
			'Unable to send the simulated notification. Please try again.',
	},

	actionPlan: {
		title:
			'Emergency Action Plan',

		preparing:
			'Preparing your emergency action plan…',

		simulationBadge:
			'SIMULATION',

		simulationNotice:
			'Preparedness simulation — not an official emergency warning.',

		currentLocation:
			'Current location',

		severity:
			'Scenario severity',

		source:
			'Source',

		remoteSource:
			'Remote simulation catalogue',

		cacheSource:
			'Offline copy — previously downloaded Ihtiyat simulation data',

		rankedActions:
			'What to do now',

		priority:
			'Priority',

		whyThisAction:
			'Why this action',

		noActionsTitle:
			'No actions are currently recommended',

		noActionsMessage:
			'No action rules currently apply to this scenario and preparedness context.',

		unavailableTitle:
			'Action plan unavailable',

		unavailableMessage:
			'Ihtiyat could not prepare this action plan from the current alert context.',

		officialGuidance:
			'In a real emergency, follow current instructions from official Saudi authorities.',
	},

	resourceHub: {
		title: 'Resource Hub',
		subtitle:
			'Browse reviewed safety guidance from trusted sources.',

		loading:
			'Loading safety resources…',

		errorTitle:
			'Resource Hub unavailable',

		errorMessage:
			'Safety resources could not be loaded from the network or the saved offline copy.',

		tryAgain:
			'Try again',

		refresh:
			'Refresh resources',

		currentLocation:
			'Current location',

		noLocation:
			'No location selected',

		relevantHazards:
			'Relevant hazards',

		noHazardContext:
			'No location-specific hazard context is available right now.',

		catalogueSource:
			'Resource status',

		updatedOnline:
			'Updated online',

		offlineCopy:
			'Offline copy',

		offlineNotice:
			'You are viewing the last saved Resource Hub copy. The guidance remains available while you are offline.',

		relevantTitle:
			'Relevant to your location',

		relevantDescription:
			'Guidance linked to hazards relevant to your current preparedness location.',

		browseTitle:
			'Browse all guidance',

		filterTitle:
			'Filter by topic',

		allResources:
			'All guidance',

		noRelevantResources:
			'No resources are specifically linked to your current location or hazard profile.',

		noResources:
			'No published safety resources are available right now.',

		readGuidance:
			'Read guidance',

		lastReviewed:
			'Last reviewed',

		reviewDateUnavailable:
			'Review date unavailable',

		sourceContext:
			'Ihtiyat presents reviewed preparedness guidance and links back to its sources. Official emergency services and authorities remain authoritative.',

		detailLoading:
			'Loading guidance…',

		detailUnavailableTitle:
			'Guidance unavailable',

		detailUnavailableMessage:
			'This Resource Hub entry is not available in the current catalogue.',

		backToResourceHub:
			'Back to Resource Hub',

		guidance:
			'Guidance',

		topics:
			'Topics',

		primaryTopic:
			'Primary topic',

		additionalTopic:
			'Related topic',

		sources:
			'Sources',

		sourcesDescription:
			'Ihtiyat links reviewed guidance back to its original sources so you can check the authoritative information directly.',

		noSources:
			'No external source links are available for this resource.',

		officialSource:
			'Official source',

		referenceSource:
			'Reference source',

		publisher:
			'Publisher',

		sourceChecked:
			'Source checked',

		openOfficialSource:
			'Open official source',

		openSource:
			'Open source',

		sourceOpenError:
			'The source could not be opened on this device. Please try again later.',

		unsafeSourceLink:
			'This source link could not be opened because its address is not considered safe.',

		detailOfflineNotice:
			'This guidance is being shown from the last saved offline Resource Hub copy.',

		resourceStatus:
			'Resource status',
	},

} as const;

export default english_translation_dict;