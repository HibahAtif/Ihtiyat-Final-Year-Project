/// <reference types="jest" />

import {
	Platform,
} from 'react-native';

import * as Notifications from 'expo-notifications';

import type {
	AlertsActionAlert,
} from '@/features/alerts/alerts-action-catalogue-service';

import {
	ALERT_NOTIFICATION_CHANNEL_ID,
	buildAlertNotificationData,
	ensureAlertNotificationChannel,
	ensureAlertNotificationPermission,
	presentSimulatedAlertNotification,
} from '@/features/alerts/alerts-notification-service';

import {
	ALERT_NOTIFICATION_KIND,
} from '@/features/alerts/alerts-notification-types';


/**
 * expo-notifications is a native boundary.
 *
 * These tests verify Ihtiyat's application logic around that boundary rather
 * than attempting to display real Android notifications inside Jest.
*/
jest.mock(
	'expo-notifications',
	() => ({
		AndroidImportance: {
			HIGH:
				4,
		},

		setNotificationHandler:
			jest.fn(),

		setNotificationChannelAsync:
			jest.fn(),

		getPermissionsAsync:
			jest.fn(),

		requestPermissionsAsync:
			jest.fn(),

		scheduleNotificationAsync:
			jest.fn(),
	}),
);


const setNotificationChannelAsyncMock = jest.mocked(
	Notifications.setNotificationChannelAsync,
);

const getPermissionsAsyncMock = jest.mocked(
	Notifications.getPermissionsAsync,
);

const requestPermissionsAsyncMock = jest.mocked(
	Notifications.requestPermissionsAsync,
);

const scheduleNotificationAsyncMock = jest.mocked(
	Notifications.scheduleNotificationAsync,
);

/**
 * Representative canonical simulated alert.
 *
 * This mirrors the same alert structure already exercised by alerts.test.tsx,
 * so the notification tests do not introduce an unrelated fake data model.
*/
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


/**
 * Builds a permission result without coupling every test to Expo's full native
 * permission-response structure.
*/
function createPermissionResult(
	status:
		| 'granted'
		| 'denied',
	canAskAgain = true,
): Awaited<
	ReturnType<
		typeof Notifications.getPermissionsAsync
	>
> {
	return {
		status,
		granted:
			status === 'granted',

		canAskAgain,

		expires:
			'never',
	} as Awaited<
		ReturnType<
			typeof Notifications.getPermissionsAsync
		>
	>;
}


const originalPlatformOS =
	Platform.OS;


/**
 * This feature is currently being verified for Android as Ihtiyat's tested
 * delivery platform.
*/
beforeAll(() => {
	Object.defineProperty(
		Platform,
		'OS',
		{
			configurable:
				true,

			value:
				'android',
		},
	);
});


afterAll(() => {
	Object.defineProperty(
		Platform,
		'OS',
		{
			configurable:
				true,

			value:
				originalPlatformOS,
		},
	);
});


beforeEach(() => {
	jest.clearAllMocks();


	setNotificationChannelAsyncMock
		.mockResolvedValue(
			null,
		);


	getPermissionsAsyncMock
		.mockResolvedValue(
			createPermissionResult(
				'granted',
			),
		);


	requestPermissionsAsyncMock
		.mockResolvedValue(
			createPermissionResult(
				'granted',
			),
		);


	scheduleNotificationAsyncMock
		.mockResolvedValue(
			'notification-101',
		);
});


describe(
	'alerts-notification-service',
	() => {
		test(
			'builds notification navigation data from the alert identity and selected severity',
			() => {
				expect(
					buildAlertNotificationData(
						101,
						2,
					),
				).toEqual({
					kind:
						ALERT_NOTIFICATION_KIND,

					alertId:
						101,

					severity:
						2,
				});
			},
		);


		test(
			'creates the dedicated high-importance Android notification channel',
			async () => {
				await ensureAlertNotificationChannel();


				expect(
					setNotificationChannelAsyncMock,
				).toHaveBeenCalledTimes(
					1,
				);


				expect(
					setNotificationChannelAsyncMock,
				).toHaveBeenCalledWith(
					ALERT_NOTIFICATION_CHANNEL_ID,
					expect.objectContaining({
						name:
							'Ihtiyat Simulated Alerts',

						importance:
							Notifications
								.AndroidImportance
								.HIGH,
					}),
				);
			},
		);


		test(
			'does not request notification permission again when permission is already granted',
			async () => {
				getPermissionsAsyncMock
					.mockResolvedValue(
						createPermissionResult(
							'granted',
						),
					);


				const result =
					await ensureAlertNotificationPermission();


				expect(
					result,
				).toEqual({
					granted:
						true,

					canAskAgain:
						true,
				});


				expect(
					requestPermissionsAsyncMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'requests notification permission when it has not already been granted',
			async () => {
				getPermissionsAsyncMock
					.mockResolvedValue(
						createPermissionResult(
							'denied',
							true,
						),
					);


				requestPermissionsAsyncMock
					.mockResolvedValue(
						createPermissionResult(
							'granted',
							true,
						),
					);


				const result =
					await ensureAlertNotificationPermission();


				expect(
					requestPermissionsAsyncMock,
				).toHaveBeenCalledTimes(
					1,
				);


				expect(
					result,
				).toEqual({
					granted:
						true,

					canAskAgain:
						true,
				});
			},
		);


		test(
			'returns permission-denied and does not schedule a notification when permission is refused',
			async () => {
				getPermissionsAsyncMock
					.mockResolvedValue(
						createPermissionResult(
							'denied',
							false,
						),
					);


				requestPermissionsAsyncMock
					.mockResolvedValue(
						createPermissionResult(
							'denied',
							false,
						),
					);


				const result =
					await presentSimulatedAlertNotification({
						alert:
							floodAlert,

						severity:
							3,

						language:
							'en',
					});


				expect(
					result,
				).toEqual({
					status:
						'permission-denied',

					canAskAgain:
						false,
				});


				expect(
					scheduleNotificationAsyncMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'creates an English simulated notification with alert routing context',
			async () => {
				const result =
					await presentSimulatedAlertNotification({
						alert:
							floodAlert,

						severity:
							2,

						language:
							'en',
					});


				expect(
					scheduleNotificationAsyncMock,
				).toHaveBeenCalledTimes(
					1,
				);


				expect(
					scheduleNotificationAsyncMock,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						content:
							expect.objectContaining({
								title:
									'SIMULATION — Severe flood scenario',

								body:
									'A severe flood scenario is being simulated for Jeddah.',

								data: {
									kind:
										ALERT_NOTIFICATION_KIND,

									alertId:
										101,

									severity:
										2,
								},

								sound:
									'default',
							}),
					}),
				);


				expect(
					result,
				).toEqual({
					status:
						'sent',

					notificationId:
						'notification-101',
				});
			},
		);


		test(
			'creates an Arabic simulated notification with Arabic visible content',
			async () => {
				await presentSimulatedAlertNotification({
					alert:
						floodAlert,

					severity:
						3,

					language:
						'ar',
				});


				expect(
					scheduleNotificationAsyncMock,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						content:
							expect.objectContaining({
								title:
									'محاكاة — سيناريو سيول شديدة',

								body:
									'تتم محاكاة سيناريو سيول شديدة في جدة.',

								data: {
									kind:
										ALERT_NOTIFICATION_KIND,

									alertId:
										101,

									severity:
										3,
								},
							}),
					}),
				);
			},
		);


		test(
			'uses the dedicated Android alert notification channel',
			async () => {
				await presentSimulatedAlertNotification({
					alert:
						floodAlert,

					severity:
						3,

					language:
						'en',
				});


				expect(
					scheduleNotificationAsyncMock,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						trigger:
							expect.objectContaining({
								channelId:
									ALERT_NOTIFICATION_CHANNEL_ID,
							}),
					}),
				);
			},
		);


		test(
			'rejects a non-simulated alert before requesting permission or scheduling a local simulation notification',
			async () => {
				const managedAlert:
					AlertsActionAlert = {
						...floodAlert,

						origin_type:
							'ihtiyat_managed',
					};


				await expect(
					presentSimulatedAlertNotification({
						alert:
							managedAlert,

						severity:
							3,

						language:
							'en',
					}),
				).rejects.toThrow(
					'Only simulated alerts may use the local simulation notification service.',
				);


				expect(
					getPermissionsAsyncMock,
				).not.toHaveBeenCalled();


				expect(
					requestPermissionsAsyncMock,
				).not.toHaveBeenCalled();


				expect(
					scheduleNotificationAsyncMock,
				).not.toHaveBeenCalled();
			},
		);
	},
);