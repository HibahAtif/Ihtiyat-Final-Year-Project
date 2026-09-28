import {
	Platform,
} from 'react-native';

import * as Notifications from 'expo-notifications';

import type {
	SupportedLanguage,
} from '@/localization/i18n';

import type {
	ActionPlanSeverity,
} from './action-plan-types';

import type {
	AlertsActionAlert,
} from './alerts-action-catalogue-service';

import {
	ALERT_NOTIFICATION_KIND,
	type AlertNotificationData,
} from './alerts-notification-types';


export const ALERT_NOTIFICATION_CHANNEL_ID =
	'ihtiyat-simulated-alerts';


export type SimulatedAlertNotificationInput = {
	alert: AlertsActionAlert;
	severity: ActionPlanSeverity;
	language: SupportedLanguage;
};


export type AlertNotificationResult =
	| {
			status: 'sent';
			notificationId: string;
	  }
	| {
			status: 'permission-denied';
			canAskAgain: boolean;
	  };


/**
 * Controls how notifications are presented while Ihtiyat is already open.
 *
 * This is application-wide configuration and must therefore be registered
 * centrally rather than inside an individual screen.
 */
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldPlaySound: true,
		shouldSetBadge: false,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});


/**
 * Creates the Android channel used only for Ihtiyat preparedness simulations.
 *
 * The name deliberately describes these as simulated alerts so the channel
 * itself cannot be confused with an official emergency-warning service.
 */
export async function ensureAlertNotificationChannel():
	Promise<void> {
	if (
		Platform.OS !== 'android'
	) {
		return;
	}


	await Notifications.setNotificationChannelAsync(
		ALERT_NOTIFICATION_CHANNEL_ID,
		{
			name:
				'Ihtiyat Simulated Alerts',

			description:
				'Preparedness simulation notifications from Ihtiyat.',

			importance:
				Notifications.AndroidImportance.HIGH,
		},
	);
}


/**
 * Checks existing notification permission first and asks only when necessary.
 *
 * Android 13 requires a notification channel to exist before its notification
 * permission prompt can be shown reliably.
 */
export async function ensureAlertNotificationPermission():
	Promise<{
		granted: boolean;
		canAskAgain: boolean;
	}> {
	await ensureAlertNotificationChannel();


	const existingPermission =
		await Notifications.getPermissionsAsync();


	if (
		existingPermission.status
		=== 'granted'
	) {
		return {
			granted: true,
			canAskAgain:
				existingPermission.canAskAgain,
		};
	}


	const requestedPermission =
		await Notifications.requestPermissionsAsync();


	return {
		granted:
			requestedPermission.status
			=== 'granted',

		canAskAgain:
			requestedPermission.canAskAgain,
	};
}


/**
 * Builds the private navigation context carried with a simulated notification.
 *
 * This contains identifiers only. No household information, account details or
 * other personal data are placed in the Android notification payload.
 */
export function buildAlertNotificationData(
	alertId: number,
	severity: ActionPlanSeverity,
): AlertNotificationData {
	return {
		kind:
			ALERT_NOTIFICATION_KIND,

		alertId,

		severity,
	};
}


/**
 * Displays one immediate Ihtiyat preparedness-simulation notification.
 *
 * Only canonical simulated alerts may cross this boundary. This prevents a
 * future non-simulated row from accidentally being presented through the
 * application's simulation notification path.
 */
export async function presentSimulatedAlertNotification({
	alert,
	severity,
	language,
}: SimulatedAlertNotificationInput):
	Promise<AlertNotificationResult> {
	if (
		alert.origin_type
		!== 'simulated'
	) {
		throw new Error(
			'Only simulated alerts may use the local simulation notification service.',
		);
	}


	const permission =
		await ensureAlertNotificationPermission();


	if (
		!permission.granted
	) {
		return {
			status:
				'permission-denied',

			canAskAgain:
				permission.canAskAgain,
		};
	}


	const alertTitle =
		language === 'ar'
			? alert.title_ar
			: alert.title_en;


	const alertMessage =
		language === 'ar'
			? alert.message_ar
			: alert.message_en;


	const simulationLabel =
		language === 'ar'
			? 'محاكاة'
			: 'SIMULATION';


	const notificationId =
		await Notifications.scheduleNotificationAsync({
			content: {
				title:
					`${simulationLabel} — ${alertTitle}`,

				body:
					alertMessage,

				data:
					buildAlertNotificationData(
						alert.id,
						severity,
					),

				sound:
					'default',
			},

			trigger:
				Platform.OS === 'android'
					? {
							channelId:
								ALERT_NOTIFICATION_CHANNEL_ID,
						}
					: null,
		});


	return {
		status:
			'sent',

		notificationId,
	};
}