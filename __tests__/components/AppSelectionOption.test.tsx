/// <reference types="jest" />


import {
    fireEvent,
    render,
    screen,
} from '@testing-library/react-native';


import {
    AppMultiSelectionOption,
    AppSelectionOption,
} from '@/components/AppSelectionOption';


jest.mock(
    '@/localization/AppLanguageProvider',
    () => ({
        useAppLanguage:
            jest.fn(
                () => ({
                    language:
                        'en',

                    direction:
                        'ltr',

                    isRTL:
                        false,

                    setLanguage:
                        jest.fn(),

                    toggleLanguage:
                        jest.fn(),

                    translate:
                        (
                            key: string,
                        ): string =>
                            key,
                }),
            ),
    }),
);


jest.mock(
    '@/accessibility/AppTextSizeProvider',
    () => ({
        useAppTextSize:
            jest.fn(
                () => ({
                    textSizePreference:
                        'system',
                }),
            ),
    }),
);


describe(
    'AppSelectionOption',
    () => {
        test(
            'preserves radio semantics for the existing single-selection component',
            async () => {
                const onPress =
                    jest.fn();


                await render(
                    <AppSelectionOption
                        label="English"
                        selected
                        onPress={onPress}
                    />,
                );


                const option =
                    screen.getByRole(
                        'radio',
                        {
                            name:
                                'English',
                        },
                    );


                expect(
                    option.props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        selected:
                            true,

                        disabled:
                            false,
                    }),
                );


                await fireEvent.press(
                    option,
                );


                expect(
                    onPress,
                ).toHaveBeenCalledTimes(
                    1,
                );
            },
        );


        test(
            'uses checkbox semantics for the reusable multi-selection component',
            async () => {
                const onPress =
                    jest.fn();


                await render(
                    <AppMultiSelectionOption
                        label="Store drinking water"
                        checked
                        onPress={onPress}
                    />,
                );


                const option =
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Store drinking water',
                        },
                    );


                expect(
                    option.props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        checked:
                            true,

                        disabled:
                            false,
                    }),
                );


                await fireEvent.press(
                    option,
                );


                expect(
                    onPress,
                ).toHaveBeenCalledTimes(
                    1,
                );
            },
        );


        test(
            'prevents interaction when a multi-selection option is disabled',
            async () => {
                const onPress =
                    jest.fn();


                await render(
                    <AppMultiSelectionOption
                        label="Prepare a flashlight"
                        checked={false}
                        disabled
                        onPress={onPress}
                    />,
                );


                const option =
                    screen.getByRole(
                        'checkbox',
                        {
                            name:
                                'Prepare a flashlight',
                        },
                    );


                expect(
                    option.props
                        .accessibilityState,
                ).toEqual(
                    expect.objectContaining({
                        checked:
                            false,

                        disabled:
                            true,
                    }),
                );


                await fireEvent.press(
                    option,
                );


                expect(
                    onPress,
                ).not.toHaveBeenCalled();
            },
        );
    },
);