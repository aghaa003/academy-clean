import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// In development, Vite proxies /api to localhost:3000, so we use relative URLs.
// In production or if VITE_API_URL is explicitly set, prepend it.

export interface CurrentUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string;
  emailAddresses: { emailAddress: string }[];
  username: string | null;
  publicMetadata: Record<string, unknown>;
  createdAt: number;
  imageUrl: string;
  role: "user" | "creator" | "admin";
  profileVersion?: number;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isLoaded: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoaded: false,
  signOut: async () => {},
  refreshUser: async () => {},
});

function rawToUser(raw: {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email: string;
  username?: string | null;
  imageUrl?: string | null;
  publicMetadata?: Record<string, unknown>;
  createdAt?: number | null;
  role?: string | null;
  profileVersion?: number | null;
}): CurrentUser {
  const first = raw.firstName ?? null;
  const last = raw.lastName ?? null;
  const full = raw.fullName ?? ([first, last].filter(Boolean).join(" ") || null);
  const username = raw.username ?? raw.email.split("@")[0] ?? null;
  return {
    id: raw.id,
    firstName: first,
    lastName: last,
    fullName: full,
    email: raw.email,
    emailAddresses: [{ emailAddress: raw.email }],
    username,
    publicMetadata: raw.publicMetadata ?? {},
    createdAt: raw.createdAt ?? Date.now(),
    imageUrl: raw.imageUrl ?? "",
    role: (raw.role as "user" | "creator" | "admin") ?? "user",
    profileVersion: raw.profileVersion ?? 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/auth/me`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { user: Parameters<typeof rawToUser>[0] };
        const nextUser = rawToUser(data.user);
        setUser(nextUser);
        window.dispatchEvent(new CustomEvent("academy:user-updated", { detail: nextUser }));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    await fetch(`/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
    window.location.href = BASE + "/sign-in";
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoaded, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(AuthContext);
}
