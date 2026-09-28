/// <reference types="jest" />

import type {
	ReactNode,
} from 'react';

import {
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react-native';

import { StyleSheet, } from 'react-native';

import {
	router,
} from 'expo-router';

import AlertsScreen from '@/app/alerts';

import {
	useAlertsActionPlan,
} from '@/features/alerts/AlertsActionPlanProvider';

import {
	useAppLanguage,
} from '@/localization/AppLanguageProvider';

import { presentSimulatedAlertNotification } from '@/features/alerts/alerts-notification-service';

import type {
	AlertsActionAlert,
} from '@/features/alerts/alerts-action-catalogue-service';

import type {
	LocationRecord,
} from '@/profile/profile-types';


jest.mock(
	'expo-router',
	() => ({
		router: {
			push:
				jest.fn(),

			back:
				jest.fn(),
		},

		Stack: {
			Screen:
				() => null,
		},
	}),
);

const mockUseWindowDimensions =
	jest.fn();

jest.mock(
	'react-native/Libraries/Utilities/useWindowDimensions',
	() => ({
		__esModule: true,

		default:
			() =>
				mockUseWindowDimensions(),
	}),
);


jest.mock(
	'@/features/alerts/AlertsActionPlanProvider',
	() => ({
		useAlertsActionPlan:
			jest.fn(),
	}),
);


jest.mock(
	'@/localization/AppLanguageProvider',
	() => ({
		useAppLanguage:
			jest.fn(),
	}),
);


/**
 * Shared layout components already have their own responsibilities/tests.
 *
 * This suite isolates Alerts-screen behaviour rather than retesting safe-area,
 * responsive typography or card presentation.
*/
jest.mock(
	'@/components/AppScreen',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);


		return {
			AppScreen:
				({
					children,
				}: {
					children:
						ReactNode;
				}) =>
					React.createElement(
						View,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/components/AppHeader',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			Text,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);


		return {
			AppHeader:
				({
					title,
				}: {
					title?: string;
				}) =>
					React.createElement(
						Text,
						null,
						title,
					),
		};
	},
);


jest.mock(
	'@/components/AppCard',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);


		return {
			AppCard:
				({
					children,
				}: {
					children:
						ReactNode;
				}) =>
					React.createElement(
						View,
						null,
						children,
					),
		};
	},
);


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
			Text,
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
						ReactNode;
				}) =>
					React.createElement(
						Text,
						null,
						children,
					),
		};
	},
);



/**
 * AppButton itself has a focused variant/accessibility suite.
 *
 * this exposes the props supplied by AlertsScreen so its proven that the
 * screen maps Level 1/2/3 onto the correct reusable variants and selection
 * state without retesting AppButton's styling implementation.
*/
jest.mock(
	'@/components/AppButton',
	() => {
		const React =
			jest.requireActual<
				typeof import('react')
			>(
				'react',
			);

		const {
			Pressable,
			Text,
			View,
		} =
			jest.requireActual<
				typeof import('react-native')
			>(
				'react-native',
			);

		return {
			AppButton:
				({
					label,
					onPress,
					disabled = false,
					variant = 'primary',
					selected = false,
					icon,
					accessibilityHint,
					accessibilityLabel,
				}: {
					label: string;
					onPress: () => void;
					disabled?: boolean;
					variant?:
						| 'primary'
						| 'severity1'
						| 'severity2'
						| 'severity3';
					selected?: boolean;
					icon?: ReactNode;
					accessibilityHint?: string;
					accessibilityLabel?: string;
				}) =>
					React.createElement(
						Pressable,
						{
							accessibilityRole:
								'button',

							accessibilityHint,

							accessibilityLabel:
								accessibilityLabel
								?? label,

							accessibilityState: {
								disabled,
								selected,
							},

							disabled,
							onPress,

							testID:
								`app-button-${variant}`,
						},
						React.createElement(
							View,
							{
								testID:
									`app-button-${variant}-icon`,
							},
							icon,
						),

						React.createElement(
							Text,
							null,
							label,
						),
					),
		};
	},
);

jest.mock(
	'@/features/alerts/alerts-notification-service',
	() => ({
		presentSimulatedAlertNotification:
			jest.fn(),
	}),
);

jest.mock('@expo/vector-icons', () => ({
	Ionicons: () => null,
}));

jest.mock('@/components/AppBottomNavigation', () => ({
	AppBottomNavigation: () => null,
}));

const useAlertsActionPlanMock =
	useAlertsActionPlan as jest.MockedFunction<
		typeof useAlertsActionPlan
	>;

const useAppLanguageMock =
	useAppLanguage as jest.MockedFunction<
		typeof useAppLanguage
	>;

const routerPushMock =
	router.push as jest.MockedFunction<
		typeof router.push
	>;

const presentSimulatedAlertNotificationMock = jest.mocked(
	presentSimulatedAlertNotification,
);

const setSimulationSeverityMock =
	jest.fn();

const refreshMock =
	jest.fn<
		Promise<void>,
		[]
	>();


const JEDDAH_ID =
	201;


const jeddahLocation: LocationRecord = {
	id:
		JEDDAH_ID,

	parent_id:
		200,

	official_code:
		'0124',

	location_type:
		'governorate',

	name_en:
		'Jeddah',

	name_ar:
		'جدة',

	is_active:
		true,
};


const floodAlert: AlertsActionAlert = {
	id:
		101,

	code:
		'sim_flood_jeddah_severe',

	hazard_id:
		11,

	origin_type:
		'simulated',

	external_alert_id:
		null,

	severity:
		3,

	title_en:
		'Severe flood scenario',

	title_ar:
		'سيناريو سيول شديدة',

	message_en:
		'A severe flood scenario is being simulated for Jeddah.',

	message_ar:
		'تتم محاكاة سيناريو سيول شديدة في جدة.',

	starts_at:
		'2040-01-01T00:00:00.000Z',

	published_at:
		'2040-01-01T00:00:00.000Z',

	expires_at:
		'2099-12-31T23:59:59.000Z',

	publication_status:
		'published',

	sort_order:
		10,
};


const englishTranslations:
	Record<string, string> = {
		'alerts.title':
			'Alerts',

		'alerts.currentLocation':
			'Current location',

		'alerts.noLocation':
			'No location selected',

		'alerts.simulationHeading':
			'Ihtiyat simulated alert scenarios',

		'alerts.simulationMessage':
			'These are preparedness simulations and are not official emergency warnings.',

		'alerts.simulationSeverity':
			'Simulation severity',

		'alerts.level1':
			'Level 1',

		'alerts.level2':
			'Level 2',

		'alerts.level3':
			'Level 3',
        'alerts.level1AccessibilityLabel':
            'Simulation severity Level 1, caution severity',

        'alerts.level2AccessibilityLabel':
            'Simulation severity Level 2, elevated severity',

        'alerts.level3AccessibilityLabel':
            'Simulation severity Level 3, critical severity',

		'alerts.selected':
			'Selected',

		'alerts.simulationSeverityNotice':
			'Ihtiyat simulation severity only — not an official warning level.',

		'alerts.alertsForLocation':
			'Alerts for your location',

		'alerts.simulationBadge':
			'SIMULATION',

		'alerts.viewActionPlan':
			'View emergency action plan',

		'alerts.source':
			'Source',

		'alerts.remoteSource':
			'Ihtiyat simulation catalogue',

		'alerts.cacheSource':
			'Offline copy — previously downloaded Ihtiyat simulation data',

		'alerts.refresh':
			'Refresh alerts',

		'alerts.loading':
			'Loading alert scenarios…',

		'alerts.noAlertsTitle':
			'No applicable alert scenarios',

		'alerts.noAlertsMessage':
			'No simulated alert scenarios currently apply to your selected location.',

		'alerts.errorTitle':
			'Unable to load alert scenarios',

		'alerts.errorMessage':
			'Ihtiyat could not load the alert catalogue from the network or its offline cache.',

		'alerts.tryAgain':
			'Try again',

		'alerts.sendSimulationNotification':
			'Send simulated notification',

		'alerts.sendSimulationNotificationHint':
			'Sends this preparedness simulation as a local notification.',

		'alerts.notificationSending':
			'Sending simulated notification…',

		'alerts.notificationSent':
			'Simulation notification sent. Tap it to open the matching action plan.',

		'alerts.notificationPermissionDenied':
			'Notification permission was not granted. You can still open the action plan in Ihtiyat.',

		'alerts.notificationError':
			'Unable to send the simulated notification. Please try again.',
	};


function translateEnglish(
	key: string,
): string {
	return englishTranslations[
		key
	]
		?? key;
}


function mockLanguage(
	language:
		| 'en'
		| 'ar',
): void {
	useAppLanguageMock.mockReturnValue({
		language,

		direction:
			language === 'ar'
				? 'rtl'
				: 'ltr',

		isRTL:
			language === 'ar',

		setLanguage:
			jest.fn(),

		toggleLanguage:
			jest.fn(),

		translate:
			translateEnglish,
	});
}


function mockReadyProvider(
	overrides: Partial<
		ReturnType<
			typeof useAlertsActionPlan
		>
	> = {},
): void {
	useAlertsActionPlanMock.mockReturnValue({
		activeLocation:
			jeddahLocation,

		applicableAlerts: [
			floodAlert,
		],

		source:
			'remote',

		status:
			'ready',

		isLoading:
			false,

		isActionPlanContextLoading:
			false,

		simulationSeverity:
			3,

		setSimulationSeverity:
			setSimulationSeverityMock,

		getActionPlan:
			jest.fn(),

		refresh:
			refreshMock,

		...overrides,
	});
}


beforeEach(() => {
	jest.clearAllMocks();

	refreshMock.mockResolvedValue(
		undefined,
	);

	mockLanguage(
		'en',
	);

	mockReadyProvider();

    mockUseWindowDimensions.mockReturnValue({
		width: 390,
		height: 844,
		scale: 3,
		fontScale: 1,
	});

	presentSimulatedAlertNotificationMock.mockResolvedValue({
		status: 'sent',
		notificationId: 'notifcation-101'
	});
});


describe(
	'AlertsScreen',
	() => {
		test(
			'renders a clear loading state while the alert catalogue is restoring',
			async () => {
				mockReadyProvider({
					status:
						'loading',

					isLoading:
						true,

					applicableAlerts:
						[],
				});


				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByText(
						'Loading alert scenarios…',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders the simulation disclaimer, current location and three severity controls',
			async () => {
				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByText(
						'Alerts',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Jeddah',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Ihtiyat simulated alert scenarios',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'These are preparedness simulations and are not official emergency warnings.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Ihtiyat simulation severity only — not an official warning level.',
					),
				).toBeTruthy();


				const level1 =
					screen.getByTestId(
                        'app-button-severity1',
                    )

				const level2 =
					screen.getByTestId(
                        'app-button-severity2',
                    )

				const level3 =
					screen.getByTestId(
                        'app-button-severity3',
                    )


				expect(
					level1.props
						.accessibilityState
						.selected,
				).toBe(
					false,
				);

				expect(
					level2.props
						.accessibilityState
						.selected,
				).toBe(
					false,
				);

				expect(
					level3.props
						.accessibilityState
						.selected,
				).toBe(
					true,
				);
			},
		);


		test(
			'supplies a non-colour icon to every severity control',
			async () => {
				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByTestId(
						'app-button-severity1-icon',
					).props.children,
				).toBeTruthy();

				expect(
					screen.getByTestId(
						'app-button-severity2-icon',
					).props.children,
				).toBeTruthy();

				expect(
					screen.getByTestId(
						'app-button-severity3-icon',
					).props.children,
				).toBeTruthy();
			},
		);


		test(
			'changes the provider simulation severity when Level 1 or Level 2 is pressed',
			async () => {
				await render(
					<AlertsScreen />,
				);


				await fireEvent.press(
					screen.getByTestId(
                        'app-button-severity1',
                    )
				);

				expect(
					setSimulationSeverityMock,
				).toHaveBeenLastCalledWith(
					1,
				);


				await fireEvent.press(
					screen.getByTestId(
                        'app-button-severity2',
                    )
				);

				expect(
					setSimulationSeverityMock,
				).toHaveBeenLastCalledWith(
					2,
				);
			},
		);

        /**enlarged-text layout */
        test(
            'stacks severity controls vertically when Android text scaling makes the three-column layout too narrow',
            async () => {
                mockUseWindowDimensions.mockReturnValue({
                    width: 390,
                    height: 844,
                    scale: 3,
                    fontScale: 1.6,
                });

                await render(
                    <AlertsScreen />,
                );

                const severityControls =
                    screen.getByTestId(
                        'alert-severity-controls',
                    );

                expect(
                    StyleSheet.flatten(
                        severityControls.props.style,
                    ),
                ).toEqual(
                    expect.objectContaining({
                        flexDirection:
                            'column',
                    }),
                );
            },
        );

        test(
            'gives every severity control a descriptive simulation-specific TalkBack label',
            async () => {
                await render(
                    <AlertsScreen />,
                );

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Simulation severity Level 1, caution severity',
                        },
                    ),
                ).toBeTruthy();

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Simulation severity Level 2, elevated severity',
                        },
                    ),
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
			'renders English alert and location content from the canonical bilingual rows',
			async () => {
				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByText(
						'Severe flood scenario',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'A severe flood scenario is being simulated for Jeddah.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'Jeddah',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders Arabic alert and location content when Arabic is active',
			async () => {
				mockLanguage(
					'ar',
				);


				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByText(
						'سيناريو سيول شديدة',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'تتم محاكاة سيناريو سيول شديدة في جدة.',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'جدة',
					),
				).toBeTruthy();
			},
		);


		test(
			'labels a fresh remote catalogue without implying an official live warning feed',
			async () => {
				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByText(
						'Ihtiyat simulation catalogue',
					),
				).toBeTruthy();
			},
		);


		test(
			'clearly labels a catalogue restored from SQLite as an offline copy',
			async () => {
				mockReadyProvider({
					source:
						'cache',
				});


				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByText(
						'Offline copy — previously downloaded Ihtiyat simulation data',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders an explicit empty state when no alert scenario applies',
			async () => {
				mockReadyProvider({
					applicableAlerts:
						[],
				});


				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByText(
						'No applicable alert scenarios',
					),
				).toBeTruthy();

				expect(
					screen.getByText(
						'No simulated alert scenarios currently apply to your selected location.',
					),
				).toBeTruthy();
			},
		);


		test(
			'renders an error state and retries through the provider refresh boundary',
			async () => {
				mockReadyProvider({
					status:
						'error',

					source:
						null,

					applicableAlerts:
						[],
				});


				await render(
					<AlertsScreen />,
				);


				expect(
					screen.getByText(
						'Unable to load alert scenarios',
					),
				).toBeTruthy();


				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Try again',
						},
					),
				);


				expect(
					refreshMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'refreshes alert data through the shared provider',
			async () => {
				await render(
					<AlertsScreen />,
				);


				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Refresh alerts',
						},
					),
				);


				expect(
					refreshMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'navigates to the Emergency Action Plan with the selected alert and simulation severity',
			async () => {
				await render(
					<AlertsScreen />,
				);


				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'View emergency action plan',
						},
					),
				);


				expect(
					routerPushMock,
				).toHaveBeenCalledWith({
					pathname:
						'/emergency-action-plan',

					params: {
						alertId:
							String(
								floodAlert.id,
							),

						severity:
							'3',
					},
				});
			},
		);

		/** 
		 * prove the screen passes the runtime severity, alert and language correctly 
		 * canonical database alert currently carries severity 3, while the user can simulate 1, 2 or 3. 
		 * Must be proved that the notification gets the selected runtime severity, 
		 * just like the Action Plan does.
		*/
		test(
			'sends the selected simulated alert using the current runtime severity',
			async () => {
				mockReadyProvider({
					simulationSeverity: 2,
				});

				await render(
					<AlertsScreen />,
				);

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Send simulated notification',
						},
					),
				);

				await waitFor(() => {
					expect(
						presentSimulatedAlertNotificationMock,
					).toHaveBeenCalledWith({
						alert: floodAlert,
						severity: 2,
						language: 'en',
					});
				});

				expect(
					screen.getByText(
						'Simulation notification sent. Tap it to open the matching action plan.',
					),
				).toBeTruthy();
			},
		);

		test(
			'shows clear feedback when Android notification permission is denied',
			async () => {
				presentSimulatedAlertNotificationMock.mockResolvedValue({
					status: 'permission-denied',
					canAskAgain: false,
				});

				await render(
					<AlertsScreen />,
				);

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Send simulated notification',
						},
					),
				);

				await waitFor(() => {
					expect(
						screen.getByText(
							'Notification permission was not granted. You can still open the action plan in Ihtiyat.',
						),
					).toBeTruthy();
				});
			},
		);
	},
);