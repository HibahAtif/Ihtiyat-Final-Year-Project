/// <reference types="jest" />

import {
	act,
	render,
} from '@testing-library/react-native';

import * as Notifications from 'expo-notifications';

import {
	AlertsNotificationResponseObserver,
} from '@/features/alerts/AlertsNotificationResponseObserver';

import {
	ALERT_NOTIFICATION_KIND,
} from '@/features/alerts/alerts-notification-types';

const mockRouterPush = jest.fn();

jest.mock( 'expo-router', () => ({
		useRouter: () => ({
            push: mockRouterPush,
        })
	}),
);


jest.mock( 'expo-notifications', () => ({
        DEFAULT_ACTION_IDENTIFIER:
			'expo.modules.notifications.actions.DEFAULT',

		getLastNotificationResponse:
			jest.fn(),

		clearLastNotificationResponse:
			jest.fn(),

		addNotificationResponseReceivedListener:
			jest.fn(),
	}),
);

const getLastNotificationResponseMock = jest.mocked(
	Notifications.getLastNotificationResponse,
);

const clearLastNotificationResponseMock = jest.mocked(
	Notifications.clearLastNotificationResponse,
);

const addNotificationResponseReceivedListenerMock = jest.mocked(
	Notifications.addNotificationResponseReceivedListener,
);

const removeListenerMock =
	jest.fn();


let responseListener:
	| ((
			response:
				Notifications.NotificationResponse,
	  ) => void)
	| null;


function createNotificationResponse({
	identifier =
		'notification-101',

	actionIdentifier =
		Notifications.DEFAULT_ACTION_IDENTIFIER,

	data = {
		kind:
			ALERT_NOTIFICATION_KIND,

		alertId:
			101,

		severity:
			2,
	},
}: {
	identifier?: string;
	actionIdentifier?: string;
	data?: Record<string, unknown>;
} = {}):
	Notifications.NotificationResponse {
	return {
		actionIdentifier,

		notification: {
			request: {
				identifier,

				content: {
					data,
				},
			},
		},
	} as Notifications.NotificationResponse;
}


beforeEach(() => {
	jest.clearAllMocks();

	responseListener = null;

	getLastNotificationResponseMock.mockReturnValue(null);

	addNotificationResponseReceivedListenerMock.mockImplementation(
        (listener) => {
            responseListener = listener;

            return {
                remove: removeListenerMock,
            };
        },
    );
});


describe(
	'AlertsNotificationResponseObserver',
	() => {
		test(
			'registers a notification-response listener and removes it on unmount',
			async () => {
				const {
					unmount,
				} =
					await render(
						<AlertsNotificationResponseObserver />,
					);


				expect(
					addNotificationResponseReceivedListenerMock,
				).toHaveBeenCalledTimes(
					1,
				);


				expect(
					responseListener,
				).not.toBeNull();


				await unmount();


				expect(
					removeListenerMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'routes a valid live notification tap to the matching Emergency Action Plan',
			async () => {
				await render(
					<AlertsNotificationResponseObserver />,
				);


				const response =
					createNotificationResponse({
						data: {
							kind:
								ALERT_NOTIFICATION_KIND,

							alertId:
								101,

							severity:
								2,
						},
					});


				await act(
					() => {
						responseListener?.(
							response,
						);
					},
				);


				expect(
					mockRouterPush,
				).toHaveBeenCalledTimes(
					1,
				);


				expect(
					mockRouterPush,
				).toHaveBeenCalledWith({
					pathname:
						'/emergency-action-plan',

					params: {
						alertId:
							'101',

						severity:
							'2',
					},
				});


				expect(
					clearLastNotificationResponseMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'processes a valid notification response that launched the app from a terminated state',
			async () => {
				const coldStartResponse =
					createNotificationResponse({
						identifier:
							'cold-start-101',

						data: {
							kind:
								ALERT_NOTIFICATION_KIND,

							alertId:
								101,

							severity:
								3,
						},
					});


				getLastNotificationResponseMock
					.mockReturnValue(
						coldStartResponse,
					);


				await render(
					<AlertsNotificationResponseObserver />,
				);


				expect(
					getLastNotificationResponseMock,
				).toHaveBeenCalledTimes(
					1,
				);


				expect(
					mockRouterPush,
				).toHaveBeenCalledWith({
					pathname:
						'/emergency-action-plan',

					params: {
						alertId:
							'101',

						severity:
							'3',
					},
				});


				expect(
					clearLastNotificationResponseMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'ignores notification responses with invalid or unrelated payload data',
			async () => {
				await render(
					<AlertsNotificationResponseObserver />,
				);


				const invalidResponse =
					createNotificationResponse({
						data: {
							kind:
								'unrelated-notification',

							alertId:
								101,

							severity:
								2,
						},
					});


				await act(
					() => {
						responseListener?.(
							invalidResponse,
						);
					},
				);


				expect(
					mockRouterPush,
				).not.toHaveBeenCalled();


				expect(
					clearLastNotificationResponseMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'ignores non-default notification actions',
			async () => {
				await render(
					<AlertsNotificationResponseObserver />,
				);


				const response =
					createNotificationResponse({
						actionIdentifier:
							'custom-action',
					});


				await act(
					() => {
						responseListener?.(
							response,
						);
					},
				);


				expect(
					mockRouterPush,
				).not.toHaveBeenCalled();


				expect(
					clearLastNotificationResponseMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'does not navigate twice when the same notification response is observed more than once',
			async () => {
				const response =
					createNotificationResponse({
						identifier:
							'duplicate-notification-101',
					});


				getLastNotificationResponseMock
					.mockReturnValue(
						response,
					);


				await render(
					<AlertsNotificationResponseObserver />,
				);


				expect(
					mockRouterPush,
				).toHaveBeenCalledTimes(
					1,
				);


				await act(
					() => {
						responseListener?.(
							response,
						);
					},
				);


				expect(
					mockRouterPush,
				).toHaveBeenCalledTimes(
					1,
				);


				expect(
					clearLastNotificationResponseMock,
				).toHaveBeenCalledTimes(
					1,
				);
			},
		);


		test(
			'allows different notification identifiers to navigate independently',
			async () => {
				await render(
					<AlertsNotificationResponseObserver />,
				);


				const firstResponse =
					createNotificationResponse({
						identifier:
							'notification-101',

						data: {
							kind:
								ALERT_NOTIFICATION_KIND,

							alertId:
								101,

							severity:
								1,
						},
					});


				const secondResponse =
					createNotificationResponse({
						identifier:
							'notification-102',

						data: {
							kind:
								ALERT_NOTIFICATION_KIND,

							alertId:
								102,

							severity:
								3,
						},
					});


				await act(
					() => {
						responseListener?.(
							firstResponse,
						);

						responseListener?.(
							secondResponse,
						);
					},
				);


				expect(
					mockRouterPush,
				).toHaveBeenCalledTimes(
					2,
				);


				expect(
					mockRouterPush,
				).toHaveBeenNthCalledWith(
					1,
					{
						pathname:
							'/emergency-action-plan',

						params: {
							alertId:
								'101',

							severity:
								'1',
						},
					},
				);


				expect(
					mockRouterPush,
				).toHaveBeenNthCalledWith(
					2,
					{
						pathname:
							'/emergency-action-plan',

						params: {
							alertId:
								'102',

							severity:
								'3',
						},
					},
				);
			},
		);
	},
);