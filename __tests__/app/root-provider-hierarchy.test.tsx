/// <reference types="jest" />

import type {
	ReactNode,
} from 'react';

import {
	render,
	screen,
	within,
} from '@testing-library/react-native';

import RootLayout from '@/app/_layout';


type ProviderProps = {
	children: ReactNode;
};


jest.mock(
	'expo-router',
	() => {
		const React =
			jest.requireActual(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual(
				'react-native',
			);


		const Stack =
			Object.assign(
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						View,
						{
							testID:
								'root-navigator',
						},
						children,
					),
				{
					Protected:
						({
							children,
						}: ProviderProps) =>
							React.createElement(
								React.Fragment,
								null,
								children,
							),

					Screen:
						() =>
							null,
				},
			);


		return {
			Stack,
		};
	},
);


jest.mock(
	'react-native-safe-area-context',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			SafeAreaProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'react-native-keyboard-controller',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			KeyboardProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/auth/AuthenticationProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			AuthenticationProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),

			useAuth:
				() => ({
					isAuthenticated:
						true,

					isLoading:
						false,
				}),
		};
	},
);

jest.mock(
	'@/features/resource-hub/ResourceHubProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual(
				'react-native',
			);


		return {
			ResourceHubProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						View,
						{
							testID:
								'resource-hub-provider',
						},
						children,
					),
		};
	},
);


jest.mock(
	'@/features/achievements/AchievementProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			AchievementProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/features/preparedness/QuizDataProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			QuizDataProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/localization/AppLanguageProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			AppLanguageProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/accessibility/AppTextSizeProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			AppTextSizeProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/profile/ProfilePreferencesProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual(
				'react-native',
			);


		return {
			ProfilePreferencesProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						View,
						{
							testID:
								'profile-preferences-provider',
						},
						children,
					),
		};
	},
);


jest.mock(
	'@/profile/ProfilePreferencesSynchronizer',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			ProfilePreferencesSynchronizer:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/location/ActiveLocationProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual(
				'react-native',
			);


		return {
			ActiveLocationProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						View,
						{
							testID:
								'active-location-provider',
						},
						children,
					),
		};
	},
);


jest.mock(
	'@/features/preparedness/PreparednessDataProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);


		return {
			PreparednessDataProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						React.Fragment,
						null,
						children,
					),
		};
	},
);


jest.mock(
	'@/features/preparedness/MissionProgressProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual(
				'react-native',
			);


		return {
			MissionProgressProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						View,
						{
							testID:
								'mission-progress-provider',
						},
						children,
					),
		};
	},
);


jest.mock(
	'@/features/alerts/AlertsActionPlanProvider',
	() => {
		const React =
			jest.requireActual(
				'react',
			);

		const {
			View,
		} =
			jest.requireActual(
				'react-native',
			);


		return {
			AlertsActionPlanProvider:
				({
					children,
				}: ProviderProps) =>
					React.createElement(
						View,
						{
							testID:
								'alerts-action-plan-provider',
						},
						children,
					),
		};
	},
);

jest.mock(
	'@/features/alerts/AlertsNotificationResponseObserver',
	() => ({
		AlertsNotificationResponseObserver:
			() => null,
	}),
);


describe(
	'root provider hierarchy',
	() => {
		test(
			'mounts AlertsActionPlanProvider inside all providers required by alert and Action Plan coordination',
			async () => {
				await render(
					<RootLayout />,
				);

				const profileProvider =
					screen.getByTestId(
						'profile-preferences-provider',
					);

				const resourceHubProvider =
					screen.getByTestId(
						'resource-hub-provider',
					);

				expect(
					within(
						resourceHubProvider,
					).getByTestId(
						'root-navigator',
					),
				).toBeTruthy();

				const activeLocationProvider =
					within(
						profileProvider,
					).getByTestId(
						'active-location-provider',
					);

				const missionProgressProvider =
					within(
						activeLocationProvider,
					).getByTestId(
						'mission-progress-provider',
					);

				const alertsActionPlanProvider =
					within(
						missionProgressProvider,
					).getByTestId(
						'alerts-action-plan-provider',
					);


				expect(
					within(
						alertsActionPlanProvider,
					).getByTestId(
						'root-navigator',
					),
				).toBeTruthy();
			},
		);
	},
);