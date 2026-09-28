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
	View,
} from 'react-native';

import {
	loadResourceHubFeature,
} from '@/features/resource-hub/resource-hub-feature-loader';

import type {
	ResourceHubLoadResult,
} from '@/features/resource-hub/resource-hub-feature-loader';

import {
	ResourceHubProvider,
	useResourceHub,
} from '@/features/resource-hub/ResourceHubProvider';

import type {
	ResourceHubCatalogue,
} from '@/features/resource-hub/resource-hub-types';


jest.mock(
	'@/features/resource-hub/resource-hub-feature-loader',
	() => ({
		loadResourceHubFeature:
			jest.fn(),
	}),
);


const loadResourceHubFeatureMock =
	jest.mocked(
		loadResourceHubFeature,
	);


const remoteCatalogue: ResourceHubCatalogue = {
	topics: [
		{
			id: 1,
			code: 'first_aid',
			name_en: 'First Aid',
			name_ar: 'الإسعافات الأولية',
			description_en: 'Reviewed first-aid guidance.',
			description_ar: 'إرشادات إسعافات أولية تمت مراجعتها.',
			sort_order: 10,
			is_active: true,
		},
	],

	resources: [
		{
			id: 101,
			code: 'remote_resource',
			title_en: 'Remote resource',
			title_ar: 'مورد متصل',
			summary_en: 'Remote summary.',
			summary_ar: 'ملخص متصل.',
			content_en: 'Remote guidance.',
			content_ar: 'إرشادات متصلة.',
			publication_status: 'published',
			sort_order: 10,
			last_reviewed_on: '2026-09-22',
			published_at: '2026-09-22T00:00:00+00:00',
		},
	],

	sources: [],
	topicLinks: [],
	hazardLinks: [],
	locationLinks: [],
	missionTaskLinks: [],
	quizQuestionLinks: [],
};


const cachedCatalogue: ResourceHubCatalogue = {
	...remoteCatalogue,

	resources: [
		{
			...remoteCatalogue.resources[0],
			id: 102,
			code: 'cached_resource',
			title_en: 'Cached resource',
			title_ar: 'مورد مخزن',
		},
	],
};


const remoteLoadResult: ResourceHubLoadResult = {
	catalogue:
		remoteCatalogue,

	source:
		'remote',
};


const cacheLoadResult: ResourceHubLoadResult = {
	catalogue:
		cachedCatalogue,

	source:
		'cache',
};


type Deferred<T> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
};


function createDeferred<T>():
	Deferred<T> {
	let resolve:
		(value: T) => void =
			() => undefined;

	let reject:
		(reason?: unknown) => void =
			() => undefined;


	const promise =
		new Promise<T>(
			(
				resolvePromise,
				rejectPromise,
			) => {
				resolve =
					resolvePromise;

				reject =
					rejectPromise;
			},
		);


	return {
		promise,
		resolve,
		reject,
	};
}


function ResourceHubConsumer() {
	const {
		catalogue,
		source,
		status,
		isLoading,
		refresh,
	} = useResourceHub();


	return (
		<View>
			<Text testID="status">
				{status}
			</Text>

			<Text testID="loading">
				{String(isLoading)}
			</Text>

			<Text testID="source">
				{source ?? 'none'}
			</Text>

			<Text testID="resource-codes">
				{catalogue?.resources
					.map(
						(resource) =>
							resource.code,
					)
					.join(',')
					?? ''}
			</Text>

			<Pressable
				testID="refresh"
				onPress={() => {
					void refresh();
				}}
			>
				<Text>
					Refresh
				</Text>
			</Pressable>
		</View>
	);
}


async function renderProvider():
	Promise<void> {
	await render(
		<ResourceHubProvider>
			<ResourceHubConsumer />
		</ResourceHubProvider>,
	);
}


describe(
	'ResourceHubProvider',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();

			loadResourceHubFeatureMock
				.mockResolvedValue(
					remoteLoadResult,
				);
		});

        test(
            'exposes loading state while the initial Resource Hub request is still pending',
            async () => {
                const request =
                    createDeferred<ResourceHubLoadResult>();

                loadResourceHubFeatureMock
                    .mockReset()
                    .mockImplementation(
                        () => request.promise,
                    );

                await renderProvider();

                expect(
                    screen.getByTestId('status').props.children,
                ).toBe('loading');

                expect(
                    screen.getByTestId('loading').props.children,
                ).toBe('true');

                expect(
                    screen.getByTestId('source').props.children,
                ).toBe('none');

                expect(
                    screen.getByTestId('resource-codes').props.children,
                ).toBe('');

                await act(async () => {
                    request.resolve(
                        remoteLoadResult,
                    );

                    await Promise.resolve();
                });

                await waitFor(() => {
                    expect(
                        screen.getByTestId('status').props.children,
                    ).toBe('ready');
                });

                expect(
                    screen.getByTestId('source').props.children,
                ).toBe('remote');
            },
        );


		test(
			'loads the public Resource Hub catalogue immediately and exposes its remote source',
			async () => {
				await renderProvider();


                await waitFor(() => {
                    expect(
                        screen.getByTestId('status').props.children,
                    ).toBe('ready');
                });

                expect(
                    screen.getByTestId('loading').props.children,
                ).toBe('false');

                expect(
                    screen.getByTestId('source').props.children,
                ).toBe('remote');

                expect(
                    screen.getByTestId('resource-codes').props.children,
                ).toBe('remote_resource');

                expect(
                    loadResourceHubFeatureMock,
                ).toHaveBeenCalledTimes(1);
            },		
        );

		test(
			'exposes a coherent SQLite-restored catalogue and cache source',
			async () => {
				loadResourceHubFeatureMock
					.mockResolvedValueOnce(
						cacheLoadResult,
					);


				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'cache',
					);
				});


				expect(
					screen.getByTestId(
						'resource-codes',
					).props.children,
				).toBe(
					'cached_resource',
				);
			},
		);


		test(
			'refreshes through the shared loader and replaces the accepted catalogue',
			async () => {
				loadResourceHubFeatureMock
					.mockReset()
					.mockResolvedValueOnce(
						remoteLoadResult,
					)
					.mockResolvedValueOnce(
						cacheLoadResult,
					);


				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'remote',
					);
				});


				await fireEvent.press(
					screen.getByTestId(
						'refresh',
					),
				);


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'cache',
					);
				});


				expect(
					screen.getByTestId(
						'resource-codes',
					).props.children,
				).toBe(
					'cached_resource',
				);

				expect(
					loadResourceHubFeatureMock,
				).toHaveBeenCalledTimes(
					2,
				);
			},
		);


		test(
			'ignores an older catalogue request that finishes after a newer refresh',
			async () => {
				const firstRequest =
					createDeferred<ResourceHubLoadResult>();


				loadResourceHubFeatureMock
					.mockReset()
					.mockImplementationOnce(
						() =>
							firstRequest.promise,
					)
					.mockResolvedValueOnce(
						cacheLoadResult,
					);


				await renderProvider();


				expect(
					screen.getByTestId(
						'status',
					).props.children,
				).toBe(
					'loading',
				);


				await fireEvent.press(
					screen.getByTestId(
						'refresh',
					),
				);


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'cache',
					);
				});


				await act(
					async () => {
						firstRequest.resolve(
							remoteLoadResult,
						);

						await Promise.resolve();
					},
				);


				expect(
					screen.getByTestId(
						'source',
					).props.children,
				).toBe(
					'cache',
				);

				expect(
					screen.getByTestId(
						'resource-codes',
					).props.children,
				).toBe(
					'cached_resource',
				);
			},
		);


		test(
			'exposes error state and removes stale catalogue data when neither remote nor cache can produce a result',
			async () => {
				loadResourceHubFeatureMock
					.mockReset()
					.mockResolvedValueOnce(
						remoteLoadResult,
					)
					.mockRejectedValueOnce(
						new Error(
							'Resource Hub unavailable',
						),
					);


				await renderProvider();


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'source',
						).props.children,
					).toBe(
						'remote',
					);
				});


				await fireEvent.press(
					screen.getByTestId(
						'refresh',
					),
				);


				await waitFor(() => {
					expect(
						screen.getByTestId(
							'status',
						).props.children,
					).toBe(
						'error',
					);
				});


				expect(
					screen.getByTestId(
						'source',
					).props.children,
				).toBe(
					'none',
				);

				expect(
					screen.getByTestId(
						'resource-codes',
					).props.children,
				).toBe(
					'',
				);
			},
		);
	},
);