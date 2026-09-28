import { ALERT_NOTIFICATION_KIND } from './alerts-notification-types';

import type { ActionPlanSeverity } from './action-plan-types';


export type AlertNotificationRoute = {
	pathname: '/emergency-action-plan';
	params: {
		alertId: string;
		severity: string;
	};
};


function isActionPlanSeverity(
	value: unknown,
): value is ActionPlanSeverity {
	return value === 1
		|| value === 2
		|| value === 3;
}


/**
 * Converts trusted Ihtiyat notification data into the existing
 * Emergency Action Plan route.
 *
 * Native notification data is still treated as an external boundary and
 * validated before it is allowed to control application navigation.
*/
export function getAlertNotificationRoute(
	data: unknown,
): AlertNotificationRoute | null {
	if (
		typeof data !== 'object'
		|| data === null
		|| Array.isArray(data)
	) {
		return null;
	}

	const notificationData =
		data as Record<string, unknown>;

	const {
		kind,
		alertId,
		severity,
	} = notificationData;

	if (
		kind !== ALERT_NOTIFICATION_KIND
		|| typeof alertId !== 'number'
		|| !Number.isSafeInteger(alertId)
		|| alertId <= 0
		|| !isActionPlanSeverity(severity)
	) {
		return null;
	}

	return {
		pathname: '/emergency-action-plan',

		params: {
			alertId: String(alertId),
			severity: String(severity),
		},
	};
}