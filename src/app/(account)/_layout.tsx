import {
	Stack,
} from 'expo-router';

/**
 * Navigator for routes that require an authenticated Ihtiyat account.
 *
 * Access to this entire route group is guarded by the root navigator.
 */
export default function AccountLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		/>
	);
}