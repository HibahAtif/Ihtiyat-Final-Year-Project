/// <reference types="jest" />

import { ALERT_NOTIFICATION_KIND } from '@/features/alerts/alerts-notification-types';

import {
	getAlertNotificationRoute,
} from '@/features/alerts/alerts-notification-routing';


describe(
	'alerts-notification-routing',
	() => {
		test(
			'creates the Emergency Action Plan route from valid notification data',
			() => {
				const route =
					getAlertNotificationRoute({
						kind:
							ALERT_NOTIFICATION_KIND,

						alertId:
							101,

						severity:
							2,
					});

				expect(route).toEqual({
					pathname:
						'/emergency-action-plan',

					params: {
						alertId:
							'101',

						severity:
							'2',
					},
				});
			},
		);


		test(
			'rejects notification data belonging to another notification kind',
			() => {
				expect(
					getAlertNotificationRoute({
						kind:
							'something-else',

						alertId:
							101,

						severity:
							3,
					}),
				).toBeNull();
			},
		);


		test.each([
			0,
			-1,
			1.5,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			'101',
		])(
			'rejects invalid alert identifiers: %p',
			(alertId) => {
				expect(
					getAlertNotificationRoute({
						kind:
							ALERT_NOTIFICATION_KIND,

						alertId,

						severity:
							3,
					}),
				).toBeNull();
			},
		);


		test.each([
			0,
			4,
			-1,
			'1',
			'3',
			null,
			undefined,
		])(
			'rejects invalid severity values: %p',
			(severity) => {
				expect(
					getAlertNotificationRoute({
						kind:
							ALERT_NOTIFICATION_KIND,

						alertId:
							101,

						severity,
					}),
				).toBeNull();
			},
		);


		test.each([
			null,
			undefined,
			'notification',
			101,
			[],
		])(
			'rejects malformed notification data: %p',
			(data) => {
				expect(
					getAlertNotificationRoute(
						data,
					),
				).toBeNull();
			},
		);


		test(
			'ignores unrelated additional notification data while preserving the trusted route fields',
			() => {
				expect(
					getAlertNotificationRoute({
						kind:
							ALERT_NOTIFICATION_KIND,

						alertId:
							101,

						severity:
							1,

						unrelated:
							'ignored',
					}),
				).toEqual({
					pathname:
						'/emergency-action-plan',

					params: {
						alertId:
							'101',

						severity:
							'1',
					},
				});
			},
		);
	},
);