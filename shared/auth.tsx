import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../services/supabase";
import { needsTotpChallenge, verifyTotpCode } from "./totpMfa";

const VALID_USER_ROLES = new Set(["citizen", "responder"]);
export const MFA_CHALLENGE_REQUIRED = "MFA_CHALLENGE_REQUIRED";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  password_reset_required: boolean;
  avatar_path: string | null;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isAuthReady: boolean;
  userRole: string | null;
  userName: string | null;
  userId: string | null;
  avatarUrl: string | null;
  signIn: (
    email: string,
    password: string,
    pushToken?: string | null,
  ) => Promise<string>;
  completeTotpSignIn: (
    factorId: string,
    code: string,
    pushToken?: string | null,
  ) => Promise<string>;
  updateAvatarUrl: (avatarUrl: string | null) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUserRole(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return VALID_USER_ROLES.has(normalized) ? normalized : null;
}

function getAvatarUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

async function getActiveProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, role, status, password_reset_required, avatar_path",
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new Error("Could not load your Supabase profile. Please try again.");
  }

  const role = normalizeUserRole(data.role);
  if (data.status?.toLowerCase() !== "active") {
    throw new Error("Your account is not active. Please contact an administrator.");
  }
  if (data.password_reset_required) {
    throw new Error("Your account needs a password reset before you can sign in.");
  }
  if (!role) {
    throw new Error("This account role is not available in the mobile app.");
  }

  return { ...data, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const sessionVersion = useRef(0);

  const clearUser = useCallback(() => {
    setIsLoggedIn(false);
    setUserRole(null);
    setUserName(null);
    setUserId(null);
    setAvatarUrl(null);
  }, []);

  const applySession = useCallback(
    async (session: Session | null) => {
      const version = ++sessionVersion.current;
      if (!session?.user) {
        clearUser();
        setIsAuthReady(true);
        return;
      }

      try {
        const profile = await getActiveProfile(session.user.id);
        if (version !== sessionVersion.current) return;
        if (await needsTotpChallenge(supabase)) {
          clearUser();
          return;
        }
        if (version !== sessionVersion.current) return;
        setUserId(profile.id);
        setUserRole(profile.role);
        setUserName(
          `${profile.first_name} ${profile.last_name}`.trim() ||
            session.user.email ||
            "User",
        );
        setAvatarUrl(getAvatarUrl(profile.avatar_path));
        setIsLoggedIn(true);
      } catch (error) {
        if (version !== sessionVersion.current) return;
        console.error("Could not restore the Supabase user profile:", error);
        clearUser();
      } finally {
        if (version === sessionVersion.current) setIsAuthReady(true);
      }
    },
    [clearUser],
  );

  useEffect(() => {
    let active = true;
    const syncSession = (session: Session | null) => {
      setTimeout(() => {
        if (active) void applySession(session);
      }, 0);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      syncSession(session);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        syncSession(data.session);
      })
      .catch((error: unknown) => {
        console.error("Could not restore the Supabase session:", error);
        if (active) {
          clearUser();
          setIsAuthReady(true);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession, clearUser]);

  const signIn = async (
    email: string,
    password: string,
    pushToken?: string | null,
  ) => {
    if (!isAuthReady) {
      throw new Error("Please wait for session initialization and try again.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!data.session?.user) {
      throw new Error("Supabase did not return a valid login session.");
    }

    let profile: Profile;
    try {
      profile = await getActiveProfile(data.session.user.id);
    } catch (profileError) {
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (signOutError) {
        console.error("Could not clear an unapproved Supabase session:", signOutError);
      }
      throw profileError;
    }

    if (await needsTotpChallenge(supabase)) {
      throw new Error(MFA_CHALLENGE_REQUIRED);
    }

    if (pushToken) {
      const { error: pushTokenError } = await supabase
        .from("profiles")
        .update({ push_token: pushToken })
        .eq("id", profile.id);
      if (pushTokenError) {
        console.warn("Could not save the push notification token:", pushTokenError);
      }
    }

    setUserId(profile.id);
    setUserRole(profile.role);
    setUserName(
      `${profile.first_name} ${profile.last_name}`.trim() ||
        data.session.user.email ||
        "User",
    );
    setAvatarUrl(getAvatarUrl(profile.avatar_path));
    setIsLoggedIn(true);
    return profile.role;
  };

  const completeTotpSignIn = async (
    factorId: string,
    code: string,
    pushToken?: string | null,
  ) => {
    await verifyTotpCode(supabase, factorId, code);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Could not verify the signed-in account.");
    }
    const profile = await getActiveProfile(user.id);
    if (pushToken) {
      const { error } = await supabase
        .from("profiles")
        .update({ push_token: pushToken })
        .eq("id", profile.id);
      if (error) console.warn("Could not save push token after MFA:", error);
    }
    setUserId(profile.id);
    setUserRole(profile.role);
    setUserName(
      `${profile.first_name} ${profile.last_name}`.trim() ||
        user.email ||
        "User",
    );
    setAvatarUrl(getAvatarUrl(profile.avatar_path));
    setIsLoggedIn(true);
    return profile.role;
  };

  const updateAvatarUrl = useCallback(async (url: string | null) => {
    setAvatarUrl(url);
  }, []);

  const signOut = async () => {
    const { stopResponderLocation } = await import("../services/responderLocation");
    try {
      await stopResponderLocation();
    } catch (error) {
      console.error("Could not fully stop location sharing during sign out:", error);
      throw new Error("Could not stop location sharing. Check your connection and try signing out again.");
    }
    if (userId) {
      const { error: pushTokenError } = await supabase
        .from("profiles")
        .update({ push_token: null })
        .eq("id", userId);
      if (pushTokenError) {
        console.warn("Could not clear the signed-out device push token:", pushTokenError);
      }
    }
    const { error } = await supabase.auth.signOut({ scope: "local" });
    clearUser();
    if (error) {
      throw new Error("Could not sign out of your Supabase session.");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAuthReady,
        userRole,
        userName,
        userId,
        avatarUrl,
        signIn,
        completeTotpSignIn,
        updateAvatarUrl,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
