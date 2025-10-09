/**
 * Application configuration
 * Loads environment variables and provides type-safe access
 */

export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "Aegis",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    env: process.env.NODE_ENV || "development",
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    enabled: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  },
  features: {
    analytics: false, // Can be enabled in future
    cloudSync: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  },
} as const;

export default config;
