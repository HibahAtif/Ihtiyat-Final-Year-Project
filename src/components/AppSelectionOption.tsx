import {
    useMemo,
} from 'react';

import type {
    ReactNode,
} from 'react';

import {
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import {
    AppText,
} from './AppText';

import {
    responsiveSize,
} from '@/utils/responsive-sizing';


type AppSelectionOptionProps = {
    label:
        string;

    description?:
        string;

    selected:
        boolean;

    onPress:
        () => void;

    disabled?:
        boolean;
};


type AppMultiSelectionOptionProps = {
    label:
        string;

    description?:
        string;

    checked:
        boolean;

    onPress:
        () => void;

    disabled?:
        boolean;
};


type SharedSelectionOptionProps = {
    label:
        string;

    description?:
        string;

    active:
        boolean;

    onPress:
        () => void;

    disabled:
        boolean;

    role:
        'radio'
        | 'checkbox';
};


/**
 * WHAT:
 * Renders the common visual and interaction structure used by Ihtiyat's
 * single-select and multi-select options.
 *
 * WHY:
 * Radio options and checkbox options share the same card-like presentation,
 * responsive spacing, text handling and pressed/disabled behaviour. Keeping
 * that presentation in one private renderer prevents the two public
 * components from drifting apart.
 *
 * Their accessibility semantics remain deliberately different:
 *
 * - radio    -> accessibilityState.selected
 * - checkbox -> accessibilityState.checked
 *
 * HOW:
 * The public wrappers map their domain-specific state into `active` and select
 * the correct accessibility role. This renderer then applies the appropriate
 * accessibility state and indicator shape.
 */
function SharedSelectionOption({
    label,
    description,
    active,
    onPress,
    disabled,
    role,
}: SharedSelectionOptionProps):
    ReactNode {
    const {
        width,
        height,
    } = useWindowDimensions();


    const styles =
        useMemo(
            () =>
                createStyles(
                    width,
                    height,
                ),
            [
                width,
                height,
            ],
        );


    const accessibilityState =
        role === 'checkbox'
            ? {
                checked:
                    active,

                disabled,
            }
            : {
                selected:
                    active,

                disabled,
            };


    return (
        <Pressable
            accessibilityRole={role}
            accessibilityLabel={label}
            accessibilityState={accessibilityState}
            disabled={disabled}
            onPress={onPress}
            style={({
                pressed,
            }) => [
                styles.option,

                active
                    ? styles.activeOption
                    : undefined,

                disabled
                    ? styles.disabledOption
                    : undefined,

                pressed
                && !disabled
                    ? styles.pressedOption
                    : undefined,
            ]}
        >
            <View
                style={styles.textContainer}
            >
                <AppText
                    variant="body"
                >
                    {label}
                </AppText>

                {
                    description
                        ? (
                            <AppText
                                variant="caption"
                                tone="muted"
                            >
                                {description}
                            </AppText>
                        )
                        : null
                }
            </View>

            <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={[
                    styles.indicator,

                    role === 'radio'
                        ? styles.radioIndicator
                        : styles.checkboxIndicator,

                    active
                        ? styles.activeIndicator
                        : undefined,

                    disabled
                        ? styles.disabledIndicator
                        : undefined,
                ]}
            >
                {
                    active
                        ? (
                            <View
                                style={[
                                    styles.activeIndicatorMark,

                                    role === 'radio'
                                        ? styles.radioIndicatorMark
                                        : styles.checkboxIndicatorMark,
                                ]}
                            />
                        )
                        : null
                }
            </View>
        </Pressable>
    );
}


/**
 * WHAT:
 * Represents one option in a single-selection group.
 *
 * WHY:
 * Existing profile preferences such as language, location and accessibility
 * settings allow only one active choice and therefore require radio semantics.
 *
 * HOW:
 * `selected` is mapped into the shared renderer while retaining
 * accessibilityRole="radio" and accessibilityState.selected.
 */
export function AppSelectionOption({
    label,
    description,
    selected,
    onPress,
    disabled = false,
}: AppSelectionOptionProps):
    ReactNode {
    return (
        <SharedSelectionOption
            label={label}
            description={description}
            active={selected}
            onPress={onPress}
            disabled={disabled}
            role="radio"
        />
    );
}


/**
 * WHAT:
 * Represents one option in a multi-selection group.
 *
 * WHY:
 * Quiz questions may allow several answers simultaneously. Those controls are
 * checkboxes rather than radio buttons and must expose the corresponding
 * semantics to assistive technology.
 *
 * HOW:
 * `checked` is mapped into the same shared visual renderer while using
 * accessibilityRole="checkbox" and accessibilityState.checked.
 */
export function AppMultiSelectionOption({
    label,
    description,
    checked,
    onPress,
    disabled = false,
}: AppMultiSelectionOptionProps):
    ReactNode {
    return (
        <SharedSelectionOption
            label={label}
            description={description}
            active={checked}
            onPress={onPress}
            disabled={disabled}
            role="checkbox"
        />
    );
}


const createStyles = (
    width:
        number,
    height:
        number,
) =>
    StyleSheet.create({
        option: {
            flexDirection:
                'row',

            alignItems:
                'center',

            gap:
                responsiveSize(
                    width,
                    height,
                    0.03,
                ),

            padding:
                responsiveSize(
                    width,
                    height,
                    0.035,
                ),

            borderWidth:
                responsiveSize(
                    width,
                    height,
                    0.0025,
                ),

            borderColor:
                '#CBD5E1',

            borderRadius:
                responsiveSize(
                    width,
                    height,
                    0.025,
                ),

            backgroundColor:
                '#FFFFFF',
        },

        activeOption: {
            borderColor:
                '#176B66',

            backgroundColor:
                '#F0FDFA',
        },

        disabledOption: {
            opacity:
                0.55,
        },

        pressedOption: {
            opacity:
                0.8,
        },

        textContainer: {
            flex:
                1,

            gap:
                responsiveSize(
                    width,
                    height,
                    0.008,
                ),
        },

        indicator: {
            width:
                responsiveSize(
                    width,
                    height,
                    0.045,
                ),

            height:
                responsiveSize(
                    width,
                    height,
                    0.045,
                ),

            borderWidth:
                responsiveSize(
                    width,
                    height,
                    0.004,
                ),

            borderColor:
                '#64748B',

            alignItems:
                'center',

            justifyContent:
                'center',
        },

        radioIndicator: {
            borderRadius:
                responsiveSize(
                    width,
                    height,
                    0.023,
                ),
        },

        checkboxIndicator: {
            borderRadius:
                responsiveSize(
                    width,
                    height,
                    0.007,
                ),
        },

        activeIndicator: {
            borderColor:
                '#176B66',
        },

        disabledIndicator: {
            borderColor:
                '#94A3B8',
        },

        activeIndicatorMark: {
            backgroundColor:
                '#176B66',
        },

        radioIndicatorMark: {
            width:
                responsiveSize(
                    width,
                    height,
                    0.023,
                ),

            height:
                responsiveSize(
                    width,
                    height,
                    0.023,
                ),

            borderRadius:
                responsiveSize(
                    width,
                    height,
                    0.012,
                ),
        },

        checkboxIndicatorMark: {
            width:
                responsiveSize(
                    width,
                    height,
                    0.025,
                ),

            height:
                responsiveSize(
                    width,
                    height,
                    0.025,
                ),

            borderRadius:
                responsiveSize(
                    width,
                    height,
                    0.004,
                ),
        },
    });