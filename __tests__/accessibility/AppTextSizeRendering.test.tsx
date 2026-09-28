/// <reference types="jest" />

import {
	render,
} from '@testing-library/react-native';

import {
	StyleSheet,
} from 'react-native';

import {
	AppText,
} from '../../src/components/AppText';

import {
	AppTextInput,
} from '../../src/components/AppTextInput';

import {
	useAppLanguage,
} from '../../src/localization/AppLanguageProvider';

import {
	useAppTextSize,
} from '../../src/accessibility/AppTextSizeProvider';


jest.mock(
	'../../src/localization/AppLanguageProvider',
	() => ({
		useAppLanguage:
			jest.fn(),
	}),
);


jest.mock(
	'../../src/accessibility/AppTextSizeProvider',
	() => ({
		useAppTextSize:
			jest.fn(),
	}),
);


const useAppLanguageMock =
	useAppLanguage as jest.MockedFunction<
		typeof useAppLanguage
	>;


const useAppTextSizeMock =
	useAppTextSize as jest.MockedFunction<
		typeof useAppTextSize
	>;


const setTextSizePreferenceMock =
	jest.fn();


describe(
	'application text-size rendering',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();

			useAppLanguageMock
				.mockReturnValue({
					language: 'en',
					direction: 'ltr',
					isRTL: false,

					setLanguage:
						jest.fn(),

					toggleLanguage:
						jest.fn(),

					translate: (
						key: string,
					) => key,
				});
		});


		test(
			'AppText renders larger typography when the large preference is active',
			async () => {
				useAppTextSizeMock
					.mockReturnValue({
						textSizePreference:
							'system',

						setTextSizePreference:
							setTextSizePreferenceMock,
					});

				const systemRender =
					await render(
						<AppText>
							System text
						</AppText>,
					);

				const systemStyle =
					StyleSheet.flatten(
						systemRender
							.getByText(
								'System text',
							)
							.props.style,
					);

				await systemRender.unmount();

				useAppTextSizeMock
					.mockReturnValue({
						textSizePreference:
							'large',

						setTextSizePreference:
							setTextSizePreferenceMock,
					});
                const largeRender =
                    await render(
                        <AppText>
                            Large text
                        </AppText>,
                    );

				const largeStyle =
					StyleSheet.flatten(
						largeRender
							.getByText(
								'Large text',
							)
							.props.style,
					);


				expect(
					largeStyle.fontSize,
				).toBeGreaterThan(
					systemStyle.fontSize,
				);

				expect(
					largeStyle.lineHeight,
				).toBeGreaterThan(
					systemStyle.lineHeight,
				);
			},
		);


		test(
			'AppTextInput renders larger editable text when the large preference is active',
			async () => {
				useAppTextSizeMock
					.mockReturnValue({
						textSizePreference:
							'system',

						setTextSizePreference:
							setTextSizePreferenceMock,
					});

				const systemRender =
					await render(
						<AppTextInput
							label="Household count"
							value=""
							onChangeText={
								jest.fn()
							}
						/>,
					);

				const systemInput =
					systemRender
						.getByLabelText(
							'Household count',
						);

				const systemStyle =
					StyleSheet.flatten(
						systemInput.props.style,
					);

				await systemRender.unmount();


				useAppTextSizeMock
					.mockReturnValue({
						textSizePreference:
							'large',

						setTextSizePreference:
							setTextSizePreferenceMock,
					});

                const largeRender =
                    await render(
                        <AppTextInput
                            label="Household count"
                            value=""
                            onChangeText={
                                jest.fn()
                            }
                        />,
                    );

				const largeInput =
					largeRender.getByLabelText(
						'Household count',
					);

				const largeStyle =
					StyleSheet.flatten(
						largeInput.props.style,
					);


				expect(
					largeStyle.fontSize,
				).toBeGreaterThan(
					systemStyle.fontSize,
				);

				expect(
					largeInput.props
						.allowFontScaling,
				).toBe(true);
			},
		);
	},
);