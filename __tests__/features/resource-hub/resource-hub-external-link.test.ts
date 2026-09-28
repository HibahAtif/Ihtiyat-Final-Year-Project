/// <reference types="jest" />

import {
	Linking,
} from 'react-native';

import {
	isSafeResourceSourceUrl,
	openResourceSourceUrl,
} from '@/features/resource-hub/resource-hub-external-link';


jest.mock(
	'react-native/Libraries/Linking/Linking',
	() => ({
        __esModule: true,
        default: {openURL: jest.fn()},
	}),
);

const openURLMock = jest.mocked( Linking.openURL,);

describe(
	'Resource Hub external source links',
	() => {
		beforeEach(() => {
			jest.clearAllMocks();

			openURLMock.mockResolvedValue(
				undefined,
			);
		});


		test.each([
			'https://www.example.gov.sa/guidance',
			'https://example.gov.sa',
			'  https://example.gov.sa/resource  ',
		])(
			'accepts a normal HTTPS source URL: %s',
			(url) => {
				expect(
					isSafeResourceSourceUrl(
						url,
					),
				).toBe(
					true,
				);
			},
		);


		test.each([
			'http://example.gov.sa',
			'javascript:alert(1)',
			'file:///storage/resource.txt',
			'tel:911',
			'mailto:test@example.com',
			'example.gov.sa/resource',
			'https://user:password@example.gov.sa/resource',
			'not a URL',
			'',
		])(
			'rejects an unsupported or unsafe source URL: %s',
			(url) => {
				expect(
					isSafeResourceSourceUrl(
						url,
					),
				).toBe(
					false,
				);
			},
		);


		test(
			'opens a trimmed valid HTTPS source URL',
			async () => {
				await expect(
					openResourceSourceUrl(
						'  https://example.gov.sa/guidance  ',
					),
				).resolves.toBe(
					'opened',
				);

				expect(
					openURLMock,
				).toHaveBeenCalledWith(
					'https://example.gov.sa/guidance',
				);
			},
		);


		test(
			'does not pass an invalid URL to the operating system',
			async () => {
				await expect(
					openResourceSourceUrl(
						'javascript:alert(1)',
					),
				).resolves.toBe(
					'invalid-url',
				);

				expect(
					openURLMock,
				).not.toHaveBeenCalled();
			},
		);


		test(
			'reports an operating-system opening failure without throwing it into the UI',
			async () => {
				openURLMock.mockRejectedValue(
					new Error(
						'No browser available',
					),
				);

				await expect(
					openResourceSourceUrl(
						'https://example.gov.sa/guidance',
					),
				).resolves.toBe(
					'open-failed',
				);
			},
		);
	},
);