/**
 * Geoapify configuration used for reverse geocoding.
 *
 * The API key is exposed through Expo's public environment-variable system
 * because reverse geocoding is performed by the mobile client.
 *
 * It must not be treated as a privileged server-side secret.
*/
const configuredGeoapifyApiKey = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

if (!configuredGeoapifyApiKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_GEOAPIFY_API_KEY environment variable.",
  );
}

/**
 * The runtime guard to guarantee exported value is a string.
*/
export const geoapifyApiKey: string = configuredGeoapifyApiKey;