// @ts-nocheck
import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { qa, profiles } from './fixtures';
const Context = createContext(null);
export function useApp() {
  return useContext(Context);
}
export function Providers({ children }) {
  const [game, updateGame] = useState(qa.game),
    [version, bump] = useState(0),
    [notice, setNotice] = useState(null);
  const setGame = useCallback((next) => {
    qa.game = next;
    updateGame(next);
  }, []);
  const toast = useCallback((message, error = false) => {
    setNotice({ message, error });
    setTimeout(() => setNotice(null), 5000);
  }, []);
  const refresh = useCallback(async () => bump((v) => v + 1), []);
  useEffect(() => {
    const changed = () => bump((v) => v + 1);
    window.addEventListener('duelink-qa-auth', changed);
    return () => window.removeEventListener('duelink-qa-auth', changed);
  }, []);
  const value = useMemo(
    () => ({
      game,
      setGame,
      role: qa.role === 'admin' ? 'admin' : 'user',
      isAdmin: qa.role === 'admin',
      user:
        qa.role === 'guest'
          ? null
          : { id: qa.role === 'admin' ? 'qa-admin' : 'qa-user', email: 'qa@example.test' },
      profile:
        qa.role === 'guest'
          ? null
          : qa.tables.profiles.find((p) => p.id === (qa.role === 'admin' ? 'qa-admin' : 'qa-user')),
      wishes: qa.tables.wishlists.filter(
        (w) => w.user_id === (qa.role === 'admin' ? 'qa-admin' : 'qa-user'),
      ),
      loading: qa.state === 'auth-loading',
      refresh,
      toast,
    }),
    [game, version, refresh, toast],
  );
  return (
    <Context.Provider value={value}>
      {children}
      {notice && (
        <div className={`toast ${notice.error ? 'toast-error' : ''}`} role="status">
          <span>{notice.message}</span>
          <button aria-label="Fechar notificação" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
