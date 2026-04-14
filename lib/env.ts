function getEnvValue(name: keyof NodeJS.ProcessEnv, fallback = "") {
  switch (name) {
    case "NODE_ENV":
      return process.env.NODE_ENV ?? fallback;
    case "NEXT_PUBLIC_APP_URL":
      return process.env.NEXT_PUBLIC_APP_URL ?? fallback;
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL ?? fallback;
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fallback;
    case "SUPABASE_SERVICE_ROLE_KEY":
      return process.env.SUPABASE_SERVICE_ROLE_KEY ?? fallback;
    case "OPENAI_API_KEY":
      return process.env.OPENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? fallback;
    case "OPENAI_MODEL":
      return process.env.OPENAI_MODEL ?? process.env.GEMINI_MODEL ?? fallback;
    default:
      return fallback;
  }
}

function requireEnv(name: keyof NodeJS.ProcessEnv) {
  const value = getEnvValue(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  NODE_ENV: getEnvValue("NODE_ENV", "development"),
  NEXT_PUBLIC_APP_URL: getEnvValue("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: getEnvValue("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: getEnvValue("SUPABASE_SERVICE_ROLE_KEY"),
  OPENAI_API_KEY: getEnvValue("OPENAI_API_KEY"),
  OPENAI_MODEL: getEnvValue("OPENAI_MODEL", "gpt-4o-mini"),
} as const;

export const isProduction = env.NODE_ENV === "production";

export function getSupabaseEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
