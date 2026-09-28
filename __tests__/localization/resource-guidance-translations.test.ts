/// <reference types="jest" />

import englishTranslations from '@/localization/translations/en';
import arabicTranslations from '@/localization/translations/ar';


describe(
	'Resource guidance production translations',
	() => {
		test(
			'contains the English Quiz Resource Hub guidance labels',
			() => {
				expect(
					englishTranslations.quiz.reviewRelatedGuidance,
				).toBe(
					'Review related guidance',
				);

				expect(
					englishTranslations.quiz.relatedGuidanceExplanation,
				).toBe(
					'Use the reviewed guidance below to reinforce what you have just learned.',
				);

				expect(
					englishTranslations.quiz.primaryGuidance,
				).toBe(
					'Primary guidance',
				);

				expect(
					englishTranslations.quiz.supportingGuidance,
				).toBe(
					'Supporting guidance',
				);
			},
		);


		test(
			'contains the Arabic Quiz Resource Hub guidance labels',
			() => {
				expect(
					arabicTranslations.quiz.reviewRelatedGuidance,
				).toBe(
					'راجع الإرشادات ذات الصلة',
				);

				expect(
					arabicTranslations.quiz.relatedGuidanceExplanation,
				).toBe(
					'استخدم الإرشادات التي تمت مراجعتها أدناه لتعزيز ما تعلمته للتو.',
				);

				expect(
					arabicTranslations.quiz.primaryGuidance,
				).toBe(
					'إرشادات رئيسية',
				);

				expect(
					arabicTranslations.quiz.supportingGuidance,
				).toBe(
					'إرشادات داعمة',
				);
			},
		);
	},
);