import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Profile } from "../lib/types";
import { api, clearToken, getToken, setToken } from "../lib/api";

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  login: (employeeId: string, pin: string) => Promise<void>;
  signup: (fullName: string, pin: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    try {
      const { profile } = await api.get<{ profile: Profile }>("/me");
      setProfile(profile);
    } catch {
      clearToken();
      setProfile(null);
    }
  }

  useEffect(() => {
    if (getToken()) {
      refreshProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(employeeId: string, pin: string) {
    const { token, profile } = await api.post<{ token: string; profile: Profile }>("/login", {
      employeeId,
      pin,
    });
    setToken(token);
    setProfile(profile);
  }

  async function signup(fullName: string, pin: string) {
    const { token, profile } = await api.post<{ token: string; profile: Profile }>("/signup", {
      fullName,
      pin,
    });
    setToken(token);
    setProfile(profile);
  }

  function signOut() {
    clearToken();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ profile, loading, login, signup, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
