/// <reference types="jest" />

import {
	fireEvent,
	render,
	screen,
} from '@testing-library/react-native';

import {
	StyleSheet,
	Text,
} from 'react-native';

import {
	AppButton,
} from '@/components/AppButton';


/**
 * AppText has its own typography/accessibility tests.
 *
 * This suite isolates AppButton's interaction and visual-variant contract so
 * failures here describe button behaviour rather than language/text-provider
 * setup.
 */
jest.mock(
	'@/components/AppText',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			Text: NativeText,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);


		return {
			AppText:
				({
					children,
				}: {
					children?:
						import('react').ReactNode;
				}) =>
					React.createElement(
						NativeText,
						null,
						children,
					),
		};
	},
);


function resolveUnpressedButtonStyle(
	button: ReturnType<
		typeof screen.getByRole
	>,
) {
	const styleProperty =
		button.props.style;


	return StyleSheet.flatten(
		typeof styleProperty
			=== 'function'
			? styleProperty({
					pressed:
						false,
				})
			: styleProperty,
	);
}


describe(
	'AppButton',
	() => {
		test(
			'preserves the existing primary button interaction when no variant is supplied',
			async () => {
				const onPress =
					jest.fn();


				await render(
					<AppButton
						label="Continue"
						onPress={onPress}
					/>,
				);


				const button =
					screen.getByRole(
						'button',
						{
							name:
								'Continue',
						},
					);


				expect(
					button.props
						.accessibilityState,
				).toEqual({
					disabled:
						false,
				});


				await fireEvent.press(
					button,
				);


				expect(
					onPress,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'preserves disabled behaviour for existing primary buttons',
			async () => {
				const onPress =
					jest.fn();


				await render(
					<AppButton
						label="Saving"
						disabled
						onPress={onPress}
					/>,
				);


				const button =
					screen.getByRole(
						'button',
						{
							name:
								'Saving',
						},
					);


				expect(
					button.props
						.accessibilityState,
				).toEqual({
					disabled:
						true,
				});


				await fireEvent.press(
					button,
				);


				expect(
					onPress,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'renders a supplied icon inside a severity button',
			async () => {
				await render(
					<AppButton
						label="Level 1"
						variant="severity1"
						icon={
							<Text
								testID="severity-icon"
							>
								!
							</Text>
						}
						onPress={
							jest.fn()
						}
					/>,
				);


				expect(
					screen.getByTestId(
						'severity-icon',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Level 1',
					),
				).toBeTruthy();
			},
		);


		test(
			'exposes selected state and an accessibility hint without relying on colour',
			async () => {
				await render(
					<AppButton
						label="Level 3"
						variant="severity3"
						selected
						accessibilityHint="Changes the simulated alert severity used for the action plan."
						onPress={
							jest.fn()
						}
					/>,
				);


				const button =
					screen.getByRole(
						'button',
						{
							name:
								'Level 3',
						},
					);


				expect(
					button.props
						.accessibilityState,
				).toEqual({
					disabled:
						false,

					selected:
						true,
				});

				expect(
					button.props
						.accessibilityHint,
				).toBe(
					'Changes the simulated alert severity used for the action plan.',
				);

				/*
				 * A visible checkmark is the selected-state cue that does not
				 * depend on yellow/orange/red colour perception.
				 */
				expect(
					screen.getByText(
						'✓',
					),
				).toBeTruthy();
			},
		);

        test(
            'allows a more descriptive screen-reader label without changing visible button text',
            async () => {
                await render(
                    <AppButton
                        label="Level 3"
                        variant="severity3"
                        accessibilityLabel="Simulation severity Level 3, critical severity"
                        onPress={jest.fn()}
                    />,
                );

                expect(
                    screen.getByText('Level 3'),
                ).toBeTruthy();

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Simulation severity Level 3, critical severity',
                        },
                    ),
                ).toBeTruthy();
            },
        );


		test(
			'uses the Level 1 yellow severity presentation',
			async () => {
				await render(
					<AppButton
						label="Level 1"
						variant="severity1"
						onPress={
							jest.fn()
						}
					/>,
				);


				const button =
					screen.getByRole(
						'button',
						{
							name:
								'Level 1',
						},
					);

				const style =
					resolveUnpressedButtonStyle(
						button,
					);


				expect(
					style,
				).toEqual(
					expect.objectContaining({
						backgroundColor:
							'#FACC15',
					}),
				);
			},
		);


		test(
			'uses the Level 2 orange severity presentation',
			async () => {
				await render(
					<AppButton
						label="Level 2"
						variant="severity2"
						onPress={
							jest.fn()
						}
					/>,
				);


				const button =
					screen.getByRole(
						'button',
						{
							name:
								'Level 2',
						},
					);

				const style =
					resolveUnpressedButtonStyle(
						button,
					);


				expect(
					style,
				).toEqual(
					expect.objectContaining({
						backgroundColor:
							'#C2410C',
					}),
				);
			},
		);


		test(
			'uses the Level 3 red severity presentation',
			async () => {
				await render(
					<AppButton
						label="Level 3"
						variant="severity3"
						onPress={
							jest.fn()
						}
					/>,
				);


				const button =
					screen.getByRole(
						'button',
						{
							name:
								'Level 3',
						},
					);

				const style =
					resolveUnpressedButtonStyle(
						button,
					);


				expect(
					style,
				).toEqual(
					expect.objectContaining({
						backgroundColor:
							'#B91C1C',
					}),
				);
			},
		);


		test(
			'still invokes the supplied action from a severity button',
			async () => {
				const onPress =
					jest.fn();


				await render(
					<AppButton
						label="Level 2"
						variant="severity2"
						onPress={onPress}
					/>,
				);


				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Level 2',
						},
					),
				);


				expect(
					onPress,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);
	},
);