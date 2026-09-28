/// <reference types="jest" />

import { render, waitFor } from "@testing-library/react-native";

import { Text } from "react-native";

import { useAppTextSize } from "../../src/accessibility/AppTextSizeProvider";

import { useAppLanguage } from "../../src/localization/AppLanguageProvider";

import { ProfilePreferencesSynchronizer } from "../../src/profile/ProfilePreferencesSynchronizer";

import { useProfilePreferences } from "../../src/profile/ProfilePreferencesProvider";

import type { ProfilePreferences } from "../../src/profile/profile-types";

jest.mock("../../src/accessibility/AppTextSizeProvider", () => ({
  useAppTextSize: jest.fn(),
}));

jest.mock("../../src/localization/AppLanguageProvider", () => ({
  useAppLanguage: jest.fn(),
}));

jest.mock("../../src/profile/ProfilePreferencesProvider", () => ({
  useProfilePreferences: jest.fn(),
}));

const useAppTextSizeMock = useAppTextSize as jest.MockedFunction<
  typeof useAppTextSize
>;

const useAppLanguageMock = useAppLanguage as jest.MockedFunction<
  typeof useAppLanguage
>;

const useProfilePreferencesMock = useProfilePreferences as jest.MockedFunction<
  typeof useProfilePreferences
>;

const setLanguageMock = jest.fn();

const setTextSizePreferenceMock = jest.fn();

const refreshMock = jest.fn();

const savePreferencesMock = jest.fn();

const ACCOUNT_A_ID = "11111111-1111-1111-1111-111111111111";

const ACCOUNT_B_ID = "22222222-2222-2222-2222-222222222222";

const accountAProfile: ProfilePreferences = {
  id: ACCOUNT_A_ID,
  active_location_id: 14,
  preferred_language_code: "ar",
  text_size_preference: "large",
  children_count: 1,
  adults_count: 2,
  older_adults_count: 0,
  pets_count: 1,
};

const accountBProfile: ProfilePreferences = {
  id: ACCOUNT_B_ID,
  active_location_id: 2,
  preferred_language_code: "en",
  text_size_preference: "system",
  children_count: 0,
  adults_count: 1,
  older_adults_count: 1,
  pets_count: 0,
};

let currentProfile: ProfilePreferences | null = null;

/**
 * Makes the mocked profile hook expose whichever account profile the
 * individual test currently needs.
 */
const configureProfileContext = (): void => {
  useProfilePreferencesMock.mockImplementation(
    () =>
      ({
        profile: currentProfile,

        locations: [],

        supportedLanguages: [],

        status: currentProfile ? "ready" : "idle",

        isLoading: false,

        refresh: refreshMock,

        savePreferences: savePreferencesMock,
      }) as ReturnType<typeof useProfilePreferences>,
  );
};

describe("ProfilePreferencesSynchronizer", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    currentProfile = null;

    configureProfileContext();

    useAppLanguageMock.mockReturnValue({
      language: "en",

      direction: "ltr",

      isRTL: false,

      setLanguage: setLanguageMock,

      toggleLanguage: jest.fn(),

      translate: (key: string) => key,
    });

    useAppTextSizeMock.mockReturnValue({
      textSizePreference: "system",

      setTextSizePreference: setTextSizePreferenceMock,
    });
  });

  test("applies Arabic and large text from a loaded authenticated profile", async () => {
    currentProfile = accountAProfile;

    const rendered = await render(
      <ProfilePreferencesSynchronizer>
        <Text>Application content</Text>
      </ProfilePreferencesSynchronizer>,
    );

    expect(rendered.getByText("Application content")).toBeTruthy();

    await waitFor(() => {
      expect(setLanguageMock).toHaveBeenCalledWith("ar");

      expect(setTextSizePreferenceMock).toHaveBeenCalledWith("large");
    });
  });

  test("applies English and system text from a loaded authenticated profile", async () => {
    currentProfile = accountBProfile;

    await render(
      <ProfilePreferencesSynchronizer>
        <Text>Application content</Text>
      </ProfilePreferencesSynchronizer>,
    );

    await waitFor(() => {
      expect(setLanguageMock).toHaveBeenCalledWith("en");

      expect(setTextSizePreferenceMock).toHaveBeenCalledWith("system");
    });
  });

  test("does not apply presentation settings when no authenticated profile is loaded", async () => {
    currentProfile = null;

    await render(
      <ProfilePreferencesSynchronizer>
        <Text>Application content</Text>
      </ProfilePreferencesSynchronizer>,
    );

    await waitFor(() => {
      expect(setLanguageMock).not.toHaveBeenCalled();

      expect(setTextSizePreferenceMock).not.toHaveBeenCalled();
    });
  });

  test("ignores unsupported backend presentation values", async () => {
    currentProfile = {
      ...accountAProfile,

      preferred_language_code: "fr",

      text_size_preference: "extra-large",
    };

    await render(
      <ProfilePreferencesSynchronizer>
        <Text>Application content</Text>
      </ProfilePreferencesSynchronizer>,
    );

    await waitFor(() => {
      expect(setLanguageMock).not.toHaveBeenCalled();

      expect(setTextSizePreferenceMock).not.toHaveBeenCalled();
    });
  });

  test("applies the new account preferences when the authenticated profile changes", async () => {
    currentProfile = accountAProfile;

    const { rerender } = await render(
      <ProfilePreferencesSynchronizer>
        <Text>Application content</Text>
      </ProfilePreferencesSynchronizer>,
    );

    await waitFor(() => {
      expect(setLanguageMock).toHaveBeenLastCalledWith("ar");

      expect(setTextSizePreferenceMock).toHaveBeenLastCalledWith("large");
    });

    /*
     * Simulate signing into another account whose persisted
     * presentation preferences differ from Account A.
     */
    currentProfile = accountBProfile;

    await rerender(
      <ProfilePreferencesSynchronizer>
        <Text>Application content</Text>
      </ProfilePreferencesSynchronizer>,
    );

    await waitFor(() => {
      expect(setLanguageMock).toHaveBeenLastCalledWith("en");

      expect(setTextSizePreferenceMock).toHaveBeenLastCalledWith("system");
    });
  });
});
