'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient, isConfigured } from '@/lib/supabase/client';
import type { Profile, Wish } from '@/types';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
type Context = {
  user: User | null;
  profile: Profile | null;
  wishes: Wish[];
  loading: boolean;
  refresh: () => Promise<void>;
  toast: (message: string, error?: boolean) => void;
};
const AppContext = createContext<Context>({
  user: null,
  profile: null,
  wishes: [],
  loading: true,
  refresh: async () => {},
  toast: () => {},
});
export function useApp() {
  return useContext(AppContext);
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [wishes, setWishes] = useState<Wish[]>([]),
    [loading, setLoading] = useState(isConfigured);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const toast = useCallback((message: string, error = false) => setNotice({ message, error }), []);
  const load = useCallback(async (nextUser: User | null) => {
    setUser(nextUser);
    const client = createClient();
    if (!nextUser || !client) {
      setProfile(null);
      setWishes([]);
      setLoading(false);
      return;
    }
    const [p, w] = await Promise.all([
      client.from('profiles').select('*').eq('id', nextUser.id).single(),
      client.from('wishlists').select('*').eq('user_id', nextUser.id),
    ]);
    setProfile(p.data);
    setWishes(w.data || []);
    setLoading(false);
  }, []);
  const refresh = useCallback(async () => {
    const client = createClient();
    if (client) {
      const { data } = await client.auth.getUser();
      await load(data.user);
    }
  }, [load]);
  useEffect(() => {
    const client = createClient();
    if (!client) return;
    let alive = true;
    client.auth
      .getUser()
      .then(({ data }) => {
        if (alive) void load(data.user);
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          toast('Não foi possível verificar sua sessão. Tente atualizar a página.', true);
        }
      });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (alive) setTimeout(() => void load(session?.user || null), 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [load]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  return (
    <AppContext.Provider value={{ user, profile, wishes, loading, refresh, toast }}>
      {children}
      {notice && (
        <div className={`toast ${notice.error ? 'toast-error' : ''}`} role="status">
          {notice.error ? <CircleAlert size={20} /> : <CheckCircle2 size={20} />}
          <span>{notice.message}</span>
          <button aria-label="Fechar notificação" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
