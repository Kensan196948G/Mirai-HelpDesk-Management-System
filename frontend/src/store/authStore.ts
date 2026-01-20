import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  user_id: string;
  email: string;
  display_name: string;
  department?: string;
  role: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  clearAuth: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken, user) =>
        set({ token, refreshToken, user }),
      clearAuth: () => set({ token: null, refreshToken: null, user: null }),
      checkAuth: () => {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          const { state } = JSON.parse(stored);
          if (state.token) {
            set({
              token: state.token,
              refreshToken: state.refreshToken,
              user: state.user,
            });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
