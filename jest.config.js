/**
 * Jest configuration for Ihtiyat.
 *
 * jest-expo provides the Expo and React Native mocks required for unit and
 * component tests without requiring a physical device or native build.
 */
module.exports = {
	preset: 'jest-expo',
	setupFilesAfterEnv: [
		'<rootDir>/jest.setup.js',
	],
};