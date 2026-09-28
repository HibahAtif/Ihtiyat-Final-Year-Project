import "expo-sqlite/localStorage/install";
import "react-native-url-polyfill/auto";

import type { Database } from "@/types/database.types";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase project configuration exposed through Expo's public environment
 * variable system.
 *
 * Only the project URL and publishable client key belong in the mobile app.
 * Privileged server credentials must never be included here.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Fail immediately during development if the required configuration is
 * missing rather than allowing authentication/database calls to fail later
 * with less useful errors.
 */
if (!supabaseUrl) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL environment variable.");
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable.",
  );
}

/**
 * Canonical Supabase client for Ihtiyat.
 *
 * Expo SQLite installs a localStorage-compatible implementation that allows
 * Supabase Auth to persist the user's session between application restarts.
 * createClient<Database> makes it a database aware client.
 */
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
