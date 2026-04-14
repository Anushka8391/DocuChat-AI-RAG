export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in_at: string | null;
  system_prompt?: string | null;
}
