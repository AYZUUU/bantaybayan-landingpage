import React, { useState } from "react";
import {
  LuShieldAlert,
  LuMail,
  LuLock,
  LuEye,
  LuEyeOff,
  LuCircleAlert,
  LuLoaderCircle
} from "react-icons/lu";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import {
  getVerifiedTotpFactor,
  needsTotpChallenge,
  startTotpEnrollment,
  verifyTotpCode,
  verifyNewTotpFactor,
} from "../../../shared/totpMfa";
import "./index.css";

interface AdminProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  password_reset_required: boolean;
  avatar_path: string | null;
}

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [totpEnrollment, setTotpEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);

  const navigate = useNavigate();

  const finishLogin = (profile: AdminProfile, accountEmail?: string) => {
    const safeRole = profile.role.toLowerCase().trim();
    const userName =
      `${profile.first_name} ${profile.last_name}`.trim() ||
      accountEmail ||
      "Admin";
    const avatarUrl = profile.avatar_path
      ? supabase.storage
          .from("avatars")
          .getPublicUrl(profile.avatar_path).data.publicUrl
      : null;
    localStorage.setItem("userId", profile.id);
    localStorage.setItem("userRole", safeRole);
    localStorage.setItem("userName", userName);
    if (avatarUrl) {
      localStorage.setItem("userAvatarUrl", avatarUrl);
    } else {
      localStorage.removeItem("userAvatarUrl");
    }
    navigate(safeRole === "superadmin" ? "/superadmin" : "/dashboard");
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
      if (authError) throw authError;
      if (!authData.user) {
        throw new Error("Supabase did not return a valid user session.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, role, status, password_reset_required, avatar_path",
        )
        .eq("id", authData.user.id)
        .single();
      if (profileError) throw profileError;
      if (profile.status.toLowerCase() !== "active") {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("Your account is not active. Contact an administrator.");
      }
      if (profile.password_reset_required) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("Your account needs a password reset before signing in.");
      }

      const safeRole = profile.role.toLowerCase().trim();
      if (safeRole !== "superadmin" && safeRole !== "admin") {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("This portal is for administrators only.");
      }

      const factor = await getVerifiedTotpFactor(supabase);
      if (factor && (await needsTotpChallenge(supabase))) {
        setMfaFactorId(factor.id);
        return;
      }
      if (!factor) {
        setTotpEnrollment(
          await startTotpEnrollment(supabase, "BantayBayan administrator"),
        );
        return;
      }

      finishLogin(profile, authData.user.email);
    } catch (err) {
      console.error("Login Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!mfaFactorId && !totpEnrollment) || !/^\d{6}$/.test(mfaCode.trim())) {
      setError("Enter the current 6-digit code from your authenticator app.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (totpEnrollment) {
        await verifyNewTotpFactor(
          supabase,
          totpEnrollment.factorId,
          mfaCode,
        );
      } else {
        if (!mfaFactorId) throw new Error("No authenticator is configured.");
        await verifyTotpCode(supabase, mfaFactorId, mfaCode);
      }
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Could not verify the account.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, role, status, password_reset_required, avatar_path",
        )
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      if (profile.status.toLowerCase() !== "active") {
        throw new Error("Your account is not active. Contact an administrator.");
      }
      if (profile.password_reset_required) {
        throw new Error("Your account needs a password reset before signing in.");
      }
      const safeRole = profile.role.toLowerCase().trim();
      if (safeRole !== "superadmin" && safeRole !== "admin") {
        throw new Error("This portal is for administrators only.");
      }
      finishLogin(profile, user.email);
      setTotpEnrollment(null);
    } catch (verificationError) {
      console.error("Authenticator verification failed:", verificationError);
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Could not verify the authenticator code.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat relative font-sans p-4"
      style={{

        backgroundImage: `url('https://staycations.ph/wp-content/uploads/2023/05/Ilocos-Sur.jpg')`,
      }}
    >

      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs" />

      {/* Main Glassmorphism Card */}
      <div className="login-card max-w-md w-full bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/40 z-10 transition-all">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="mx-auto bg-blue-600/10 w-16 h-16 rounded-2xl border border-blue-200 flex items-center justify-center mb-4 shadow-sm">
            <LuShieldAlert size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">BantayBayan</h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mt-1">
            Province of Ilocos Sur
          </p>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Command & Emergency Response Portal
          </p>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="bg-rose-50/90 text-rose-600 p-3.5 rounded-xl text-xs font-semibold mb-6 flex items-start gap-2.5 border border-rose-200 shadow-xs">
            <LuCircleAlert size={18} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <LuMail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-xs"
                placeholder="admin@ilocossur.gov.ph"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <LuLock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-xs"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || Boolean(mfaFactorId)}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/25 active:scale-[0.99] transition-all flex justify-center items-center gap-2 cursor-pointer mt-2 ${
              loading ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <>
                <LuLoaderCircle size={18} className="animate-spin" />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <span>Log In</span>
            )}
          </button>
        </form>

        {mfaFactorId && (
          <form onSubmit={handleVerifyTotp} className="mt-5 space-y-3">
            <label
              htmlFor="authenticator-code"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Authenticator code
            </label>
            <input
              id="authenticator-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={mfaCode}
              onChange={(event) =>
                setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600"
              placeholder="000000"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-60"
            >
              {loading ? "Verifying…" : "Verify and sign in"}
            </button>
          </form>
        )}
        {totpEnrollment && (
          <form onSubmit={handleVerifyTotp} className="mt-5 space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              Set up an authenticator app to secure your administrator account.
            </p>
            <img
              src={totpEnrollment.qrCode}
              alt="Scan this QR code with your authenticator app"
              className="mx-auto h-48 w-48 rounded-lg border border-slate-200 bg-white p-2"
            />
            <p className="break-all text-xs text-slate-600">
              Manual setup key: <strong className="font-mono">{totpEnrollment.secret}</strong>
            </p>
            <label
              htmlFor="authenticator-setup-code"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Enter the 6-digit code to finish setup
            </label>
            <input
              id="authenticator-setup-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={mfaCode}
              onChange={(event) =>
                setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg tracking-[0.4em]"
              placeholder="000000"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white disabled:opacity-60"
            >
              {loading ? "Verifying…" : "Verify and enable"}
            </button>
          </form>
        )}

        {/* Footer Info Note */}
        <p className="text-center text-xs text-slate-400 mt-8 font-medium">
          Authorized personnel only. All access attempts are logged.
        </p>
        <Link
          to="/"
          className="mt-4 flex items-center justify-center text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900"
        >
          Return to BantayBayan home
        </Link>
      </div>
    </div>
  );
}