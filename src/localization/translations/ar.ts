/**
 * Arabic translations used throughout Ihtiyat.
 *
 * This file mirrors the structure of the English translation file so the
 * application can switch languages without duplicating UI components.
 */
const arabic_translation_dict = {
	
	// Text reused across multiple parts of the application.
	common: {
		appName: 'احتياط',
		continue: 'متابعة',
		back: 'رجوع',
		save: 'حفظ',
		cancel: 'إلغاء',
	},

	// Main Home screen content.
	home: {
		title: 'الاستعداد يبدأ قبل حالة الطوارئ',
		subtitle:
			'عزّز استعدادك، وتعرّف على المخاطر المحلية، واطّلع على إرشادات السلامة الموثوقة.',
			readyToday: 'استعدادك اليوم',
		progressTitle: 'تقدمك في المهام',
		continuePreparing: 'واصل الاستعداد',
		quickAccess: 'وصول سريع',

		quizDescription: 'اختبر معرفتك العملية بإرشادات الاستعداد.',
		progressDescription: 'راجع تقدمك ونقاطك والإنجازات التي حققتها.',
		locationDescription: 'غيّر الموقع المستخدم لإرشادات الاستعداد المحلية.',

		profileAction: 'الملف الشخصي',
		profileDescription: 'أدر تفضيلاتك وإعدادات إمكانية الوصول.',
		createAccountDescription: 'احفظ تقدمك وتفضيلاتك عبر الأجهزة.',

		guestProgressTitle: 'احفظ تقدمك في الاستعداد',
		guestProgressDescription:
			'سجّل الدخول لتتبع المهام المكتملة والنقاط والإنجازات.',

		progressUnavailable: 'تقدم المهام غير متاح حالياً.',
	},

	// Location setup and location-management text.
	location: {
		title: 'موقعك',

		subtitle:
			'اختر الموقع في المملكة الذي سيستخدمه احتياط لتحديد المخاطر المحلية وإرشادات الاستعداد.',

		currentLocationTitle:
			'الموقع الحالي',

		noLocationSelected:
			'لم تختر موقعاً بعد.',

		useCurrentLocation:
			'استخدام موقعي الحالي',

		useCurrentLocationDescription:
			'سيستخدم احتياط موقع جهازك مرة واحدة للعثور على أقرب موقع سعودي مدعوم.',

		detectingLocation:
			'جارٍ تحديد موقعك…',

		chooseManually:
			'الاختيار يدوياً',

		manualDescription:
			'ابحث في قائمة المواقع السعودية المعتمدة في احتياط.',

		searchLabel:
			'البحث عن موقع',

		searchPlaceholder: 
			'ابحث باسم الموقع',

		loadingLocations:
			'جارٍ تحميل المواقع المتاحة…',

		locationLoadError:
			'تعذر تحميل المواقع المتاحة. يرجى المحاولة مرة أخرى.',

		noSearchResults:
			'لا توجد مواقع مدعومة تطابق بحثك.',

		detectedLocationTitle:
			'الموقع المكتشف',

		selectedLocationTitle:
			'الموقع المحدد',

		confirmLocation:
			'تأكيد الموقع',

		savingLocation:
			'جارٍ حفظ الموقع…',

		saveSuccess:
			'تم تحديث موقعك.',

		saveError:
			'تعذر حفظ موقعك. يرجى المحاولة مرة أخرى.',

		localCacheWarning:
			'تم حفظ موقع حسابك، ولكن تعذر تحديث النسخة المحلية للاستخدام دون اتصال.',

		servicesDisabled:
			'خدمات الموقع في الجهاز متوقفة. اختر موقعك يدوياً أو فعّل خدمات الموقع.',

		permissionDenied:
			'إذن الوصول إلى الموقع غير متاح. لا يزال بإمكانك اختيار موقعك يدوياً.',

		positionUnavailable:
			'تعذر تحديد موقعك الحالي. اختر موقعك يدوياً.',

		reverseGeocodingFailed:
			'تم العثور على موقع جهازك، لكن تعذر على احتياط تحديد المنطقة. تحقق من الاتصال أو اختر الموقع يدوياً.',

		unsupportedLocation:
			'تعذر على احتياط مطابقة موقعك الحالي مع موقع مدعوم. اختر موقعك يدوياً.',

		jeddahPilot:
			'موقع جدة التجريبي',

		locationCode:
			'رمز الموقع',

		automaticLocationError:
			'تعذر تحديد موقعك حالياً. يرجى المحاولة مرة أخرى.',
	},

	// Preparedness mission labels.
	preparedness: {
		title:
			'مهام الاستعداد',

		subtitle:
			'أكمل قوائم عملية لتعزيز استعدادك.',

		loading:
			'جارٍ تحميل مهام الاستعداد…',

		loadError:
			'تعذر تحميل مهام الاستعداد. يرجى المحاولة مرة أخرى.',

		retry:
			'المحاولة مرة أخرى',

		noMissions:
			'لا توجد مهام استعداد متاحة حالياً.',

		progress:
			'إكمال المهمة',

		tasksCompleted:
			'المهام المكتملة',

		readinessPoints:
			'نقاط الاستعداد',

		points:
			'نقاط',

		pendingSync:
			'بانتظار المزامنة',

		signInToSave:
			'سجّل الدخول لحفظ تقدم قائمة المهام وفتح الإنجازات.',

		signIn:
			'تسجيل الدخول لحفظ التقدم',

		progressLoadError:
			'تعذر تحميل تقدم المهمة المحفوظ. لا يزال بإمكانك قراءة إرشادات الاستعداد.',

		progressLoading:
			'جارٍ تحميل التقدم المحفوظ…',

		locationRequired:
			'اختر موقعاً لعرض المهام الخاصة بالمخاطر لهذه المهمة.',

		chooseLocation:
			'اختر الموقع',

		taskSaveError:
			'تعذر حفظ هذا التغيير في قائمة المهام. يرجى المحاولة مرة أخرى.',
	},

	// تسميات اختبار الاستعداد ورسائل التغذية الراجعة.
	quiz: {
		title:
			'اختبار الاستعداد',

		subtitle:
			'تحقق من فهمك لإرشادات الاستعداد العملية.',

		loading:
			'جارٍ تحميل أسئلة الاستعداد…',

		loadError:
			'تعذر تحميل أسئلة الاستعداد. يرجى المحاولة مرة أخرى.',

		retry:
			'المحاولة مرة أخرى',

		noQuestions:
			'لا توجد أسئلة استعداد متاحة حالياً.',

		singleSelectInstruction:
			'اختر إجابة واحدة.',

		multiSelectInstruction:
			'اختر جميع الإجابات المناسبة.',

		checkAnswer:
			'تحقق من الإجابة',

		checkingAnswer:
			'جارٍ التحقق من الإجابة…',

		correct:
			'صحيح',

		incorrect:
			'غير صحيح',

		correctAnswer:
			'الإجابة الصحيحة',

		correctAnswers:
			'الإجابات الصحيحة',

		signInToSave:
			'سجّل الدخول لحفظ تقدم الاختبار وعدد المحاولات.',

		signIn:
			'تسجيل الدخول لحفظ تقدم الاختبار',

		progressLoading:
			'جارٍ تحميل تقدم الاختبار المحفوظ…',

		progressLoadError:
			'تعذر تحميل تقدم الاختبار المحفوظ. لا يزال بإمكانك الإجابة عن أسئلة الاستعداد.',

		solved:
			'تم الحل',

		attempts:
			'المحاولات',

		connectionRequired:
			'يلزم الاتصال بالإنترنت للتحقق من هذه الإجابة. تم الاحتفاظ باختيارك لتتمكن من المحاولة مرة أخرى.',

		reviewRelatedGuidance:
			'راجع الإرشادات ذات الصلة',

		relatedGuidanceExplanation:
			'استخدم الإرشادات التي تمت مراجعتها أدناه لتعزيز ما تعلمته للتو.',

		primaryGuidance:
			'إرشادات رئيسية',

		supportingGuidance:
			'إرشادات داعمة',
	},

	// تسميات الإنجازات وتقدم الإنجازات الخاصة بالحساب.
	achievements: {
		title:
			'التقدم والإنجازات',

		subtitle:
			'تابع إنجازات الاستعداد التي تكتسبها من المهام واختبار الاستعداد.',

		loading:
			'جارٍ تحميل الإنجازات…',

		loadError:
			'تعذر تحميل الإنجازات. يرجى المحاولة مرة أخرى.',

		retry:
			'المحاولة مرة أخرى',

		noAchievements:
			'لا توجد إنجازات متاحة حالياً.',

		signInToView:
			'سجّل الدخول لمتابعة الإنجازات التي حققتها وعرضها.',

		signIn:
			'تسجيل الدخول لعرض الإنجازات',

		progressLoading:
			'جارٍ تحميل إنجازاتك…',

		progressLoadError:
			'تعذر تحميل إنجازاتك. لا يزال بإمكانك عرض الإنجازات المتاحة.',

		earnedAchievements:
			'الإنجازات المكتسبة',

		earned:
			'تم الإنجاز',

		notEarned:
			'لم يتحقق بعد',

		missionProgress:
			'تقدم المهام',

		missionProgressLoading:
			'جارٍ تحميل تقدمك في المهام…',

		missionProgressLoadError:
			'تعذر تحميل تقدمك المحفوظ في المهام. لا تزال إنجازاتك متاحة.',

		preparednessUnavailable:
			'تعذر تحميل معلومات المهام الحالية. لا تزال إنجازاتك متاحة.',

		missionCompletion:
			'إكمال المهام',

		tasksCompleted:
			'المهام المكتملة',

		missionsCompleted:
			'المهمات المكتملة',

		pendingSync:
			'تغييرات بانتظار المزامنة',

		completionDisclaimer:
			'يعكس إكمال المهام مهام الاستعداد التي أنجزتها، ولا يمثل مقياساً أو ضماناً لسلامة المنزل.',

		recentAchievements:
			'الإنجازات الأخيرة',

		earnedOn:
			'تم تحقيقه في',
	},

	// Labels used by the main application navigation.
	navigation: {
		home: 'الرئيسية',
		missions: 'المهام',
		alerts: 'التنبيهات',
		quiz: 'اختبار الاستعداد',
		resources: 'المصادر',
	},

	// Language-selection labels.
	language: {
		english: 'الإنجليزية',
		arabic: 'العربية',
		switchToArabic: 'العربية',
		switchToEnglish: 'English',
	},

	// نصوص المصادقة والوصول إلى الحساب.
	authentication: {
		registerTitle: 'إنشاء حسابك',
		registerSubtitle:
			'احفظ تقدمك في الاستعداد وتفضيلاتك عبر أجهزتك.',
		emailLabel: 'البريد الإلكتروني',
		emailPlaceholder: 'name@example.com',
		passwordLabel: 'كلمة المرور',
		passwordPlaceholder: 'أدخل كلمة المرور',
		confirmPasswordLabel: 'تأكيد كلمة المرور',
		confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور',
		createAccount: 'إنشاء حساب',
		noAccountYet: 'ليس لديك حساب؟',
		
		emailConfirmationNotice:
			'استخدم عنوان بريد إلكتروني صالحاً عند إنشاء الحساب. يجب تأكيد عنوان البريد الإلكتروني قبل أن تتمكن من تسجيل الدخول.',
		
		signIn: 'تسجيل الدخول',
		
		alreadyHaveAccount: 'لديك حساب بالفعل؟',
		requiredFields:
			'يرجى إكمال جميع الحقول المطلوبة.',
		passwordMismatch:
			'كلمتا المرور غير متطابقتين.',
		passwordTooShort:
			'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.',
		registrationError:
			'تعذر إنشاء حسابك. يرجى المحاولة مرة أخرى.',
		checkEmailTitle: 'تحقق من بريدك الإلكتروني',
		checkEmailMessage:
			'تم إنشاء حسابك. أكد عنوان بريدك الإلكتروني قبل تسجيل الدخول.',

		confirmationProcessingTitle: 'جارٍ تأكيد بريدك الإلكتروني',
		confirmationProcessingMessage:
			'يرجى الانتظار بينما يكمل تطبيق احتياط تأكيد حسابك.',
		confirmationSuccessTitle: 'تم تأكيد البريد الإلكتروني',
		confirmationSuccessMessage:
			'تم تأكيد بريدك الإلكتروني بنجاح.',
		confirmationErrorTitle: 'تعذر تأكيد البريد الإلكتروني',
		confirmationErrorMessage:
			'رابط التأكيد غير صالح أو انتهت صلاحيته. يرجى العودة إلى احتياط والمحاولة مرة أخرى.',
		returnToApp: 'العودة إلى احتياط',

		signInTitle: 'تسجيل الدخول',
		signInSubtitle:
			'يمكنك الوصول إلى تقدمك المحفوظ في الاستعداد وتفضيلاتك.',
		invalidCredentials:
			'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
		signInError:
			'تعذر تسجيل الدخول حالياً. يرجى المحاولة مرة أخرى.',
		signOut: 'تسجيل الخروج',

		forgotPassword: 'هل نسيت كلمة المرور؟',
		resetPasswordTitle: 'إعادة تعيين كلمة المرور',
		resetPasswordSubtitle:
			'أدخل عنوان البريد الإلكتروني المرتبط بحسابك في احتياط.',
		sendResetLink: 'إرسال رابط إعادة التعيين',
		recoveryRouteTitle: 'استعادة كلمة المرور',
		recoveryRouteMessage:
			'تم فتح رابط استعادة كلمة المرور بنجاح في احتياط.',
		returnToSignIn: 'العودة إلى تسجيل الدخول',

		resetEmailSentTitle: 'تحقق من بريدك الإلكتروني',
		resetEmailSentMessage:
			'إذا كان هناك حساب احتياط مرتبط بهذا البريد الإلكتروني، فقد تم إرسال رابط لإعادة تعيين كلمة المرور.',
		resetRequestError:
			'تعذر إرسال رابط إعادة تعيين كلمة المرور حالياً. يرجى المحاولة مرة أخرى.',

		recoveryProcessingTitle:
			'جارٍ التحقق من رابط الاستعادة',
		recoveryProcessingMessage:
			'يرجى الانتظار بينما يتحقق تطبيق احتياط من رابط استعادة كلمة المرور.',

		newPasswordTitle:
			'اختر كلمة مرور جديدة',
		newPasswordSubtitle:
			'أدخل كلمة مرور جديدة لحسابك في احتياط.',

		newPasswordLabel:
			'كلمة المرور الجديدة',
		newPasswordPlaceholder:
			'أدخل كلمة المرور الجديدة',

		confirmNewPasswordLabel:
			'تأكيد كلمة المرور الجديدة',
		confirmNewPasswordPlaceholder:
			'أعد إدخال كلمة المرور الجديدة',

		updatePassword:
			'تحديث كلمة المرور',

		newPasswordTooShort:
			'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
		newPasswordsDoNotMatch:
			'كلمتا المرور غير متطابقتين.',

		passwordUpdateError:
			'تعذر تحديث كلمة المرور حالياً. يرجى المحاولة مرة أخرى.',

		recoveryInvalidTitle:
			'تعذر إعادة تعيين كلمة المرور',
		recoveryInvalidMessage:
			'رابط استعادة كلمة المرور غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد.',

		passwordUpdatedTitle:
			'تم تحديث كلمة المرور',
		passwordUpdatedMessage:
			'تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.',
	},

	profile: {
		open: 'الملف الشخصي والتفضيلات',

		title: 'الملف الشخصي والتفضيلات',


		subtitle:
			'احفظ المعلومات التي يمكن لتطبيق احتياط استخدامها لتخصيص إرشادات الاستعداد.',

		loading:
			'جارٍ تحميل ملفك الشخصي المحفوظ والإعدادات المتاحة…',

		loadError:
			'تعذر تحميل ملفك الشخصي. يرجى المحاولة مرة أخرى.',

		retry:
			'المحاولة مرة أخرى',

		accountTitle: 'حسابك',

		emailLabel: 'البريد الإلكتروني',

		locationTitle:
			'موقعك',

		locationDescription:
			'اختر المنطقة الإدارية السعودية التي سيستخدمها احتياط لتقديم إرشادات مرتبطة بالموقع.',

		locationCoverageNotice:
			'التغطية التفصيلية الخاصة بالمخاطر مطبقة حالياً ضمن نموذج جدة التجريبي. أما المناطق الأخرى المدرجة فتدعم إعداد احتياط على مستوى المملكة دون الإشارة إلى توفر المستوى نفسه من التغطية المحلية للمخاطر.',

		locationRequired:
			'اختر موقعاً قبل حفظ تفضيلاتك.',

		jeddahPilot:
			'موقع جدة التجريبي',

		regionLocation:
			'منطقة إدارية سعودية',

		householdTitle:
			'معلومات الأسرة',

		householdDescription:
			'تساعد أعداد أفراد الأسرة الاختيارية تطبيق احتياط على تخصيص إرشادات الاستعداد لاحقاً. اترك الحقول الأربعة فارغة إذا كنت لا ترغب في تقديم هذه المعلومات.',

		childrenLabel:
			'الأطفال (أقل من 18 سنة)',

		adultsLabel:
			'البالغون (18–64 سنة)',

		olderAdultsLabel:
			'كبار السن (65 سنة فأكثر)',

		petsLabel:
			'الحيوانات الأليفة',

		householdPrivacyNotice:
			'يخزن احتياط أعداد أفراد الأسرة فقط. ولا يطلب الأسماء أو تواريخ الميلاد أو المعلومات الطبية.',

		householdRequired:
			'أكمل جميع أعداد الأسرة أو اترك الحقول الأربعة فارغة.',

		householdWholeNumber:
			'أدخل عدداً صحيحاً يساوي صفراً أو أكثر.',

		householdRange25:
			'أدخل قيمة من 0 إلى 25.',

		householdRange10:
			'أدخل قيمة من 0 إلى 10.',

		householdAtLeastOnePerson:
			'يجب أن تتضمن معلومات الأسرة شخصاً واحداً على الأقل.',

		householdTotal25:
			'لا يمكن أن يتجاوز العدد الإجمالي للأشخاص 25.',

		languageTitle:
			'اللغة',

		languageDescription:
			'اختر اللغة التي سيستخدمها تطبيق احتياط لحسابك.',

		textSizeTitle:
			'حجم النص',

		textSizeDescription:
			'اختر طريقة عرض النص في احتياط. يتبع خيار إعداد النظام إعدادات إمكانية الوصول في جهازك، بينما يضيف خيار كبير حجماً إضافياً داخل احتياط.',

		textSizeSystem:
			'استخدام إعداد النظام',

		textSizeSystemDescription:
			'اتبع إعدادات حجم النص وإمكانية الوصول في جهازك.',

		textSizeLarge:
			'كبير',

		textSizeLargeDescription:
			'استخدم نصاً أكبر داخل احتياط بالإضافة إلى دعم إعدادات إمكانية الوصول في النظام.',

		savePreferences:
			'حفظ التفضيلات',

		savingPreferences:
			'جارٍ حفظ التفضيلات…',

		saveSuccess:
			'تم حفظ تفضيلاتك بنجاح.',

		saveError:
			'تعذر حفظ تفضيلاتك. يرجى المحاولة مرة أخرى.',
	},

	alerts: {
		title:
			'التنبيهات',

		currentLocation:
			'الموقع الحالي',

		noLocation:
			'لم يتم اختيار موقع',

		simulationHeading:
			'سيناريوهات تنبيهات احتياط المحاكية',

		simulationMessage:
			'هذه محاكاة لأغراض الاستعداد وليست تحذيرات طوارئ رسمية.',

		simulationSeverity:
			'مستوى شدة المحاكاة',

		level1:
			'المستوى 1',

		level2:
			'المستوى 2',

		level3:
			'المستوى 3',

		level1AccessibilityLabel:
			'مستوى شدة المحاكاة 1، مستوى احترازي',

		level2AccessibilityLabel:
			'مستوى شدة المحاكاة 2، شدة مرتفعة',

		level3AccessibilityLabel:
			'مستوى شدة المحاكاة 3، شدة حرجة',

		selected:
			'المحدد',

		severityAccessibilityHint:
			'يغيّر مستوى شدة التنبيه المحاكى المستخدم في خطة إجراءات الطوارئ.',

		simulationSeverityNotice:
			'هذا مستوى محاكاة من احتياط فقط — وليس مستوى تحذير رسميًا.',

		alertsForLocation:
			'التنبيهات المناسبة لموقعك',

		simulationBadge:
			'محاكاة',

		viewActionPlan:
			'عرض خطة إجراءات الطوارئ',

		actionPlanPreparing:
			'جارٍ تجهيز بيانات خطة إجراءات الطوارئ…',

		source:
			'المصدر',

		remoteSource:
			'كتالوج محاكاة احتياط',

		cacheSource:
			'نسخة دون اتصال — بيانات محاكاة احتياط تم تنزيلها سابقًا',

		catalogueStatus: 'حالة',

		refresh:
			'تحديث التنبيهات',

		loading:
			'جارٍ تحميل سيناريوهات التنبيه…',

		noAlertsTitle:
			'لا توجد سيناريوهات تنبيه مناسبة',

		noAlertsMessage:
			'لا تنطبق حاليًا أي سيناريوهات تنبيه محاكية على موقعك المحدد.',

		errorTitle:
			'تعذر تحميل سيناريوهات التنبيه',

		errorMessage:
			'تعذر على احتياط تحميل كتالوج التنبيهات من الشبكة أو من النسخة المخزنة دون اتصال.',

		tryAgain:
			'المحاولة مرة أخرى',

		sendSimulationNotification:
			'إرسال إشعار محاكاة',

		sendSimulationNotificationHint:
			'يرسل سيناريو الاستعداد هذا كإشعار محلي.',

		notificationSending:
			'جارٍ إرسال إشعار المحاكاة…',

		notificationSent:
			'تم إرسال إشعار المحاكاة. اضغط عليه لفتح خطة الإجراءات المطابقة.',

		notificationPermissionDenied:
			'لم يتم منح إذن الإشعارات. لا يزال بإمكانك فتح خطة الإجراءات داخل احتياط.',

		notificationError:
			'تعذر إرسال إشعار المحاكاة. يرجى المحاولة مرة أخرى.',
	},

	actionPlan: {
		title:
			'خطة إجراءات الطوارئ',

		preparing:
			'جارٍ إعداد خطة إجراءات الطوارئ…',

		simulationBadge:
			'محاكاة',

		simulationNotice:
			'محاكاة لأغراض الاستعداد — وليست تحذيراً رسمياً للطوارئ.',

		currentLocation:
			'الموقع الحالي',

		severity:
			'شدة السيناريو',

		source:
			'المصدر',

		remoteSource:
			'كتالوج محاكاة احتياط',

		cacheSource:
			'نسخة دون اتصال — بيانات محاكاة احتياط تم تنزيلها سابقاً',

		rankedActions:
			'ما يجب فعله الآن',

		priority:
			'الأولوية',

		whyThisAction:
			'سبب أولوية هذا الإجراء',

		noActionsTitle:
			'لا توجد إجراءات موصى بها حالياً',

		noActionsMessage:
			'لا تنطبق حالياً أي قواعد إجراءات على هذا السيناريو وسياق الاستعداد.',

		unavailableTitle:
			'خطة إجراءات الطوارئ غير متاحة',

		unavailableMessage:
			'تعذر على احتياط إعداد خطة الإجراءات من سياق التنبيه الحالي.',

		officialGuidance:
			'في حالة طوارئ حقيقية، اتبع التعليمات الحالية الصادرة عن الجهات الرسمية السعودية.',
	},

	resourceHub: {
		title: 'مركز الموارد',
		subtitle:
			'استعرض إرشادات سلامة تمت مراجعتها من مصادر موثوقة.',

		loading:
			'جارٍ تحميل موارد السلامة…',

		errorTitle:
			'مركز الموارد غير متاح',

		errorMessage:
			'تعذر تحميل موارد السلامة من الشبكة أو من النسخة المحفوظة للاستخدام دون اتصال.',

		tryAgain:
			'المحاولة مرة أخرى',

		refresh:
			'تحديث الموارد',

		currentLocation:
			'الموقع الحالي',

		noLocation:
			'لم يتم اختيار موقع',

		relevantHazards:
			'المخاطر ذات الصلة',

		noHazardContext:
			'لا يتوفر حالياً سياق مخاطر خاص بالموقع.',

		catalogueSource:
			'حالة الموارد',

		updatedOnline:
			'تم التحديث عبر الإنترنت',

		offlineCopy:
			'نسخة محفوظة دون اتصال',

		offlineNotice:
			'أنت تعرض آخر نسخة محفوظة من مركز الموارد. تظل الإرشادات متاحة أثناء عدم الاتصال بالإنترنت.',

		relevantTitle:
			'إرشادات مرتبطة بموقعك',

		relevantDescription:
			'إرشادات مرتبطة بالمخاطر أو المواقع ذات الصلة بسياق استعدادك الحالي.',

		browseTitle:
			'استعراض جميع الإرشادات',

		filterTitle:
			'التصفية حسب الموضوع',

		allResources:
			'جميع الإرشادات',

		noRelevantResources:
			'لا توجد موارد مرتبطة بشكل خاص بموقعك الحالي أو ملف المخاطر.',

		noResources:
			'لا توجد موارد سلامة منشورة متاحة حالياً.',

		readGuidance:
			'قراءة الإرشادات',

		lastReviewed:
			'آخر مراجعة',

		reviewDateUnavailable:
			'تاريخ المراجعة غير متاح',

		sourceContext:
			'يعرض احتياط إرشادات استعداد تمت مراجعتها ويوفر روابط إلى مصادرها. وتظل الجهات الرسمية وخدمات الطوارئ هي المرجع المعتمد.',

		detailLoading:
			'جارٍ تحميل الإرشادات…',

		detailUnavailableTitle:
			'الإرشادات غير متاحة',

		detailUnavailableMessage:
			'هذا المورد غير متاح في الكتالوج الحالي لمركز الموارد.',

		backToResourceHub:
			'العودة إلى مركز الموارد',

		guidance:
			'الإرشادات',

		topics:
			'الموضوعات',

		primaryTopic:
			'الموضوع الرئيسي',

		additionalTopic:
			'موضوع ذو صلة',

		sources:
			'المصادر',

		sourcesDescription:
			'يربط احتياط الإرشادات التي تمت مراجعتها بمصادرها الأصلية حتى تتمكن من الرجوع إلى المعلومات المعتمدة مباشرة.',

		noSources:
			'لا تتوفر روابط خارجية لمصادر هذا المورد.',

		officialSource:
			'مصدر رسمي',

		referenceSource:
			'مصدر مرجعي',

		publisher:
			'الناشر',

		sourceChecked:
			'آخر تحقق من المصدر',

		openOfficialSource:
			'فتح المصدر الرسمي',

		openSource:
			'فتح المصدر',

		sourceOpenError:
			'تعذر فتح المصدر على هذا الجهاز. يرجى المحاولة مرة أخرى لاحقاً.',

		unsafeSourceLink:
			'تعذر فتح رابط المصدر لأن عنوانه لا يستوفي متطلبات الأمان.',

		detailOfflineNotice:
			'يتم عرض هذه الإرشادات من آخر نسخة محفوظة دون اتصال لمركز الموارد.',

		resourceStatus:
			'حالة المورد',

		relatedGuidance:
			'إرشادات ذات صلة',

		primaryGuidance:
			'إرشادات رئيسية',

		supportingGuidance:
			'إرشادات داعمة',
	},

} as const;

export default arabic_translation_dict;