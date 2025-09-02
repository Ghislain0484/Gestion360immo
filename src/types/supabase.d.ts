import { User as SupabaseUser } from '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface User extends SupabaseUser {
    user_metadata?: {
      role?: string;
      [key: string]: any;
    };
  }
}