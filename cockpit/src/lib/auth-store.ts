import { create } from "zustand";
import {
  getToken,
  login,
  logout,
  me,
  register,
  setToken,
  type AuthUser,
} from "./api";

type AuthStatus = "loading" | "signedIn" | "signedOut";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** Validate any stored token at app boot (restore session or clear it). */
  boot: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,

  boot: async () => {
    const token = await getToken();
    if (!token) {
      set({ status: "signedOut", user: null });
      return;
    }
    try {
      const user = await me();
      set({ status: "signedIn", user });
    } catch {
      // Stale/revoked token — drop it and show the login screen.
      await setToken(null);
      set({ status: "signedOut", user: null });
    }
  },

  signIn: async (email, password) => {
    const { token, user } = await login(email, password);
    await setToken(token);
    set({ status: "signedIn", user });
  },

  signUp: async (email, password) => {
    const { token, user } = await register(email, password);
    await setToken(token);
    set({ status: "signedIn", user });
  },

  signOut: async () => {
    await logout().catch(() => {});
    await setToken(null);
    set({ status: "signedOut", user: null });
  },
}));