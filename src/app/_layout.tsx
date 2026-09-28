import { Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppTextSizeProvider } from "@/accessibility/AppTextSizeProvider";
import { AuthenticationProvider, useAuth } from "@/auth/AuthenticationProvider";
import { ResourceHubProvider } from "@/features/resource-hub/ResourceHubProvider";
import { MissionProgressProvider } from "@/features/preparedness/MissionProgressProvider";
import { PreparednessDataProvider } from "@/features/preparedness/PreparednessDataProvider";
import { QuizDataProvider } from "@/features/preparedness/QuizDataProvider";
import { AlertsActionPlanProvider } from "@/features/alerts/AlertsActionPlanProvider";
import { AlertsNotificationResponseObserver } from "@/features/alerts/AlertsNotificationResponseObserver";
import { AppLanguageProvider } from "@/localization/AppLanguageProvider";
import { ProfilePreferencesProvider } from "@/profile/ProfilePreferencesProvider";
import { ProfilePreferencesSynchronizer } from "@/profile/ProfilePreferencesSynchronizer";
import { ActiveLocationProvider } from "@/location/ActiveLocationProvider";
import { AchievementProvider } from "@/features/achievements/AchievementProvider";

/**
 * Creating a custom Root Navigator.
 */
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Stack>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen
            name="(account)"
            options={{
              headerShown: false,
            }}
          />
        </Stack.Protected>
      </Stack>

      <AlertsNotificationResponseObserver />
    </>
  );
}

/**
 * Root layout for the Ihtiyat application.
 *
 * Global providers are placed here so every Expo Router screen can access
 * shared application services such as localisation and safe-area information.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <AuthenticationProvider>
          <ResourceHubProvider>
            <AchievementProvider>
              <QuizDataProvider>
                <AppLanguageProvider>
                  <AppTextSizeProvider>
                    <ProfilePreferencesProvider>
                      <ProfilePreferencesSynchronizer>
                        <ActiveLocationProvider>
                          <PreparednessDataProvider>
                            <MissionProgressProvider>
                              <AlertsActionPlanProvider>
                                <RootNavigator />
                              </AlertsActionPlanProvider>
                            </MissionProgressProvider>
                          </PreparednessDataProvider>
                        </ActiveLocationProvider>
                      </ProfilePreferencesSynchronizer>
                    </ProfilePreferencesProvider>
                  </AppTextSizeProvider>
                </AppLanguageProvider>
              </QuizDataProvider>
            </AchievementProvider>
          </ResourceHubProvider>
        </AuthenticationProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}