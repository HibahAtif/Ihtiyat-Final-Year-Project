import type {
	ActionPlanSeverity,
} from './action-plan-types';

export const ALERT_NOTIFICATION_KIND =
	'ihtiyat-simulated-alert';

export type AlertNotificationData = {
	kind: typeof ALERT_NOTIFICATION_KIND;
	alertId: number;
	severity: ActionPlanSeverity;
};