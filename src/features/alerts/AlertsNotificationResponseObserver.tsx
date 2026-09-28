import {
	useCallback,
	useEffect,
	useRef,
} from 'react';

import * as Notifications from 'expo-notifications';

import {
	useRouter,
} from 'expo-router';

import {
	getAlertNotificationRoute,
} from './alerts-notification-routing';


/**
 * Handles navigation caused by the user tapping an Ihtiyat notification.
 *
 * This component renders no UI. It is mounted beside the root Stack once
 * application startup/auth restoration has completed.
*/
export function AlertsNotificationResponseObserver() {
	const router =
		useRouter();

	const handledNotificationIdsRef =
		useRef(
			new Set<string>(),
		);


	const handleResponse =
		useCallback(
			(
				response:
					Notifications.NotificationResponse,
			): void => {
				if (
					response.actionIdentifier
					!== Notifications.DEFAULT_ACTION_IDENTIFIER
				) {
					return;
				}


				const notification =
					response.notification;

				const notificationId =
					notification.request.identifier;


				/*
				 * Startup response retrieval and the live response listener can
				 * observe the same tap. Prevent that tap navigating twice.
				*/
				if (
					handledNotificationIdsRef
						.current
						.has(
							notificationId,
						)
				) {
					return;
				}


				const route =
					getAlertNotificationRoute(
						notification
							.request
							.content
							.data,
					);


				if (
					route === null
				) {
					return;
				}


				handledNotificationIdsRef
					.current
					.add(
						notificationId,
					);


				router.push(
					route,
				);


				/*
				 * A handled cold-start response must not be replayed during a
				 * later render or application restart.
				*/
				void Notifications
					.clearLastNotificationResponse();
			},
			[
				router,
			],
		);


	useEffect(
		() => {
			let isActive =
				true;


			/*
			 * Handles a notification that launched the application from a
			 * previously terminated state.
			*/
            const response = Notifications.getLastNotificationResponse();
            if(
                isActive && response !== null
            ) {
                handleResponse(response);
            }

			// void Notifications
			// 	.getLastNotificationResponseAsync()
			// 	.then(
			// 		(response) => {
			// 			if (
			// 				isActive
			// 				&& response !== null
			// 			) {
			// 				handleResponse(
			// 					response,
			// 				);
			// 			}
			// 		},
			// 	);


			/*
			 * Handles notification taps while the application process is
			 * already available, including foreground/background transitions.
			*/
			const subscription =
				Notifications
					.addNotificationResponseReceivedListener(
						handleResponse,
					);


			return () => {
				isActive =
					false;

				subscription.remove();
			};
		},
		[
			handleResponse,
		],
	);


	return null;
}