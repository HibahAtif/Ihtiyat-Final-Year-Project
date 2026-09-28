/// <reference types="jest" />

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react-native';
import {
	Pressable,
	Text,
} from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import {
	AppLanguageProvider,
	useAppLanguage,
} from '../../src/localization/AppLanguageProvider';
import i18n from '../../src/localization/i18n';

/**
 * Jest does not provide Expo's native SQLite database.
 *
 * The application continues to use the real SQLite-backed key-value store
 * on Android. Only this unit-test environment replaces it with predictable
 * mock functions.
 */
jest.mock('expo-sqlite/kv-store', () => ({
	__esModule: true,
	default: {
		getItem: jest.fn(),
		setItem: jest.fn(),
	},
}));

/**
 * Give localisation tests a deterministic English device locale.
 */
jest.mock('expo-localization', () => ({
	getLocales: jest.fn(() => [
		{
			languageCode: 'en',
		},
	]),
}));

const mockedGetItem =
	Storage.getItem as jest.MockedFunction<
		typeof Storage.getItem
	>;

const mockedSetItem =
	Storage.setItem as jest.MockedFunction<
		typeof Storage.setItem
	>;

type StoredLanguage =
	| string
	| null;

/**
 * Allows the test to decide exactly when the mocked SQLite preference
 * lookup completes.
 *
 * Resolving the promise inside act() ensures that the provider's
 * resulting React state update is flushed before assertions are made.
 */
const createDeferredStoredLanguage = () => {
	let resolvePromise:
		| ((value: StoredLanguage) => void)
		| undefined;

	const promise =
		new Promise<StoredLanguage>(
			(resolve) => {
				resolvePromise =
					resolve;
			},
		);

	return {
		promise,
		resolve: (
			value: StoredLanguage,
		) => {
			if (!resolvePromise) {
				throw new Error(
					'Deferred language resolver is unavailable.',
				);
			}

			resolvePromise(value);
		},
	};
};

/**
 * Minimal consumer used to exercise the public localisation-provider API.
 */
function LanguageProbe() {
	const {
		language,
		direction,
		toggleLanguage,
		translate,
	} = useAppLanguage();

	return (
		<>
			<Text>{language}</Text>

			<Text>{direction}</Text>

			<Text>
				{translate('common.appName')}
			</Text>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Toggle language"
				onPress={toggleLanguage}
			>
				<Text>
					Toggle language
				</Text>
			</Pressable>
		</>
	);
}

describe(
	'AppLanguageProvider',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();

			i18n.locale = 'en';

			mockedSetItem.mockResolvedValue(
				undefined,
			);
		});

		test(
			'switches from English/LTR to Arabic/RTL and persists the preference',
			async () => {
				const deferredLanguage =
					createDeferredStoredLanguage();

				mockedGetItem
					.mockReturnValue(
						deferredLanguage.promise,
					);

				await render(
					<AppLanguageProvider>
						<LanguageProbe />
					</AppLanguageProvider>,
				);

				/*
				 * Resolve the initial storage lookup as empty.
				 * The provider should therefore fall back to the
				 * deterministic English device locale.
				 */
				await act(async () => {
					deferredLanguage.resolve(
						null,
					);

					await deferredLanguage.promise;
				});

				await waitFor(() => {
					expect(
						mockedGetItem,
					).toHaveBeenCalledWith(
						'ihtiyat.preferred-language',
					);
				});

				expect(
					screen.getByText(
						'Ihtiyat',
					),
				).toBeTruthy();

				expect(
					screen.getByText('ltr'),
				).toBeTruthy();

				await fireEvent.press(
					screen.getByRole(
						'button',
						{
							name:
								'Toggle language',
						},
					),
				);

				await waitFor(() => {
					expect(
						screen.getByText(
							'احتياط',
						),
					).toBeTruthy();

					expect(
						screen.getByText(
							'rtl',
						),
					).toBeTruthy();
				});

				expect(
					mockedSetItem,
				).toHaveBeenCalledWith(
					'ihtiyat.preferred-language',
					'ar',
				);
			},
		);

		test(
			'restores a previously saved Arabic preference',
			async () => {
				const deferredLanguage =
					createDeferredStoredLanguage();

				mockedGetItem
					.mockReturnValue(
						deferredLanguage.promise,
					);

				await render(
					<AppLanguageProvider>
						<LanguageProbe />
					</AppLanguageProvider>,
				);

				/*
				 * Resolve the startup preference lookup with Arabic
				 * so the provider restores the persisted language.
				 */
				await act(async () => {
					deferredLanguage.resolve(
						'ar',
					);

					await deferredLanguage.promise;
				});

				await waitFor(() => {
					expect(
						screen.getByText(
							'احتياط',
						),
					).toBeTruthy();

					expect(
						screen.getByText(
							'rtl',
						),
					).toBeTruthy();
				});

				expect(
					mockedGetItem,
				).toHaveBeenCalledWith(
					'ihtiyat.preferred-language',
				);
			},
		);
	},
);