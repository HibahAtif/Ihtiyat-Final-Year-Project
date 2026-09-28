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
	AppTextSizeProvider,
	useAppTextSize,
} from '../../src/accessibility/AppTextSizeProvider';


jest.mock(
	'expo-sqlite/kv-store',
	() => ({
		__esModule: true,

		default: {
			getItem: jest.fn(),
			setItem: jest.fn(),
		},
	}),
);


const mockedGetItem =
	Storage.getItem as jest.MockedFunction<
		typeof Storage.getItem
	>;


const mockedSetItem =
	Storage.setItem as jest.MockedFunction<
		typeof Storage.setItem
	>;


/**
 * Minimal consumer used to exercise the public text-size-provider API.
 */
function TextSizeProbe() {
	const {
		textSizePreference,
		setTextSizePreference,
	} = useAppTextSize();

	return (
		<>
			<Text testID="text-size-preference">
				{textSizePreference}
			</Text>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Use large text"
				onPress={() => {
					setTextSizePreference(
						'large',
					);
				}}
			>
				<Text>
					Use large text
				</Text>
			</Pressable>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Use system text"
				onPress={() => {
					setTextSizePreference(
						'system',
					);
				}}
			>
				<Text>
					Use system text
				</Text>
			</Pressable>
		</>
	);
}


describe(
	'AppTextSizeProvider',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();

			mockedSetItem
				.mockResolvedValue(
					undefined,
				);
		});


		test(
			'falls back to the system preference when no saved value exists',
			async () => {
				mockedGetItem
					.mockResolvedValue(
						null,
					);

				await render(
					<AppTextSizeProvider>
						<TextSizeProbe />
					</AppTextSizeProvider>,
				);

				await waitFor(() => {
					expect(
						mockedGetItem,
					).toHaveBeenCalledWith(
						'ihtiyat.text-size-preference',
					);
				});

				expect(
					screen.getByTestId(
						'text-size-preference',
					).props.children,
				).toBe(
					'system',
				);
			},
		);


		test(
			'restores a previously saved large preference',
			async () => {
				mockedGetItem
					.mockResolvedValue(
						'large',
					);

				await render(
					<AppTextSizeProvider>
						<TextSizeProbe />
					</AppTextSizeProvider>,
				);

				await waitFor(() => {
					expect(
						screen.getByTestId(
							'text-size-preference',
						).props.children,
					).toBe(
						'large',
					);
				});

				expect(
					mockedGetItem,
				).toHaveBeenCalledWith(
					'ihtiyat.text-size-preference',
				);
			},
		);


		test(
			'persists and applies the large text preference',
			async () => {
				mockedGetItem
					.mockResolvedValue(
						null,
					);

				await render(
					<AppTextSizeProvider>
						<TextSizeProbe />
					</AppTextSizeProvider>,
				);

				await waitFor(() => {
					expect(
						mockedGetItem,
					).toHaveBeenCalledTimes(
						1,
					);
				});

				await act(async () => {
					await fireEvent.press(
						screen.getByRole(
							'button',
							{
								name:
									'Use large text',
							},
						),
					);
				});

				expect(
					screen.getByTestId(
						'text-size-preference',
					).props.children,
				).toBe(
					'large',
				);

				expect(
					mockedSetItem,
				).toHaveBeenCalledWith(
					'ihtiyat.text-size-preference',
					'large',
				);
			},
		);


		test(
			'can return from large text to the system preference and persists the change',
			async () => {
				mockedGetItem
					.mockResolvedValue(
						'large',
					);

				await render(
					<AppTextSizeProvider>
						<TextSizeProbe />
					</AppTextSizeProvider>,
				);

				await waitFor(() => {
					expect(
						screen.getByTestId(
							'text-size-preference',
						).props.children,
					).toBe(
						'large',
					);
				});

				await act(async () => {
					await fireEvent.press(
						screen.getByRole(
							'button',
							{
								name:
									'Use system text',
							},
						),
					);
				});

				expect(
					screen.getByTestId(
						'text-size-preference',
					).props.children,
				).toBe(
					'system',
				);

				expect(
					mockedSetItem,
				).toHaveBeenCalledWith(
					'ihtiyat.text-size-preference',
					'system',
				);
			},
		);
	},
);