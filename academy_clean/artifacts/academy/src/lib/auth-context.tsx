import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { apiFetch } from "@/lib/api-fetch";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

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
  avatar_url: string | null;
  bio: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  phone: string | null;
  country: string | null;
  skills: string[] | null;
  role: "user" | "creator" | "employer" | "admin";
  points: number;
  global_rank: number | null;
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

function rawToUser(raw: any): CurrentUser {
  const first = raw.firstName ?? raw.name?.split(" ")[0] ?? null;
  const last  = raw.lastName  ?? raw.name?.split(" ").slice(1).join(" ") ?? null;
const full  = raw.fullName  ?? raw.name ?? ([first, last].filter(Boolean).join(" ") || null);
  return {
    id:             raw.id,
    firstName:      first,
    lastName:       last,
    fullName:       full,
    email:          raw.email,
    emailAddresses: [{ emailAddress: raw.email }],
    username:       raw.username ?? raw.email?.split("@")[0] ?? null,
    publicMetadata: raw.publicMetadata ?? {},
    createdAt:      raw.createdAt ?? Date.now(),
    // ✅ Fix 4: map imageUrl from either imageUrl or avatar_url
    imageUrl:       raw.imageUrl ?? raw.avatar_url ?? "",
    avatar_url:     raw.avatar_url ?? null,
    bio:            raw.bio ?? null,
    github_url:     raw.github_url ?? null,
    linkedin_url:   raw.linkedin_url ?? null,
    website_url:    raw.website_url ?? null,
    phone:          raw.phone ?? null,
    country:        raw.country ?? null,
    skills:         raw.skills ?? null,
    role:           (raw.role as CurrentUser["role"]) ?? "user",
    points:         raw.points ?? 0,
    global_rank:    raw.global_rank ?? null,
    profileVersion: raw.profileVersion ?? 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<CurrentUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
const res = await apiFetch(`/api/auth/me`);      if (res.ok) {
        const data = await res.json();
        // ✅ Fix 1: handle both { user: {...} } and flat {...} shapes
        const raw      = data.user ?? data;
        const nextUser = rawToUser(raw);
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
    // ✅ Fix 2: correct logout URL
await apiFetch(`/api/logout`, { method: "POST" });    setUser(null);
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