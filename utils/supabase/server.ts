import {createServerClient, type CookieOptions} from '@supabase/ssr';
import {createClient as createJsClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(items: {name: string; value: string; options: CookieOptions}[]) {
          try {
            items.forEach(({name, value, options}) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot always write cookies; middleware refreshes them.
          }
        },
      },
    },
  );
}

export function createAdminClient() {
  if (process.env.SUPABASE_SCHEMA_READY !== 'true') return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClientBase(url, key);
}

function createClientBase(url: string, key: string) {
  return createJsClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
