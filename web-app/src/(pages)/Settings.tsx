import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  LuUser,
  LuLock,
  LuBell,
  LuPalette,
  LuEye,
  LuEyeOff,
} from "react-icons/lu";

import AvatarCustomizer from "../components/AvatarCustomizer";
import { supabase } from "../utils/supabase";
import {
  getVerifiedTotpFactor,
  removeTotpFactor,
  startTotpEnrollment,
  verifyNewTotpFactor,
} from "../../../shared/totpMfa";

type Tab = "profile" | "security" | "notifications" | "preferences";
const WEB_PUSH_PUBLIC_KEY = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim();

function decodeVapidPublicKey(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(window.atob(base64), (character) =>
    character.charCodeAt(0),
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [contactNumber, setContactNumber] = useState("");

  // Store original fetched values to restore on 'Cancel'
  const [savedProfile, setSavedProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  const [avatarData, setAvatarData] = useState<{
    file: File | null;
    url: string | null;
  }>({ file: null, url: null });
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);
  const [savedAvatarPath, setSavedAvatarPath] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpEnrollment, setTotpEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isTotpBusy, setIsTotpBusy] = useState(false);

  const [pushNotifications, setPushNotifications] = useState(
    false,
  );
  const [isPushBusy, setIsPushBusy] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(
    () => localStorage.getItem("soundAlerts") === "true",
  );

  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system";
  });

  const handleThemeChange = (value: "light" | "dark" | "system") => {
    setTheme(value);
    localStorage.setItem("theme", value);
    window.dispatchEvent(
      new CustomEvent("bantaybayan-theme-change", { detail: value }),
    );
  };

  const handlePushNotificationsChange = async (enabled: boolean) => {
    if (isPushBusy) return;
    setIsPushBusy(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("Sign in again before changing notification settings.");
      }

      if (!enabled) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription =
          await registration?.pushManager.getSubscription();
        if (subscription) {
          const { error } = await supabase
            .from("web_push_subscriptions")
            .delete()
            .eq("user_id", userData.user.id)
            .eq("endpoint", subscription.endpoint);
          if (error) throw new Error(error.message);
          await subscription.unsubscribe();
        }
        setPushNotifications(false);
        localStorage.setItem("pushNotifications", "false");
        return;
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("This browser does not support background push notifications.");
      }
      if (!WEB_PUSH_PUBLIC_KEY) {
        throw new Error(
          "Web push is not configured. Set VITE_WEB_PUSH_PUBLIC_KEY and the matching Supabase VAPID secrets.",
        );
      }
      if (typeof Notification === "undefined") {
        throw new Error("Browser notifications are not supported.");
      }
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Allow notifications in your browser to enable alerts.");
      }
      await navigator.serviceWorker.register("/service-worker.js");
        await navigator.serviceWorker.register("/service-worker.js");
      const serviceWorker = await navigator.serviceWorker.ready;
      if (!serviceWorker.active) {
        throw new Error(
          "The notification service worker could not be activated. Refresh the page and try again.",
        );
      }
      const subscription = await serviceWorker.pushManager.getSubscription();
      const activeSubscription =
        subscription ??
        (await serviceWorker.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidPublicKey(WEB_PUSH_PUBLIC_KEY),
        }));
      const serialized = activeSubscription.toJSON();
      const p256dh = serialized.keys?.p256dh;
      const auth = serialized.keys?.auth;
      if (!activeSubscription.endpoint || !p256dh || !auth) {
        throw new Error("The browser returned an incomplete push subscription.");
      }

      const { error: saveError } = await supabase
        .from("web_push_subscriptions")
        .upsert(
          {
            user_id: userData.user.id,
            endpoint: activeSubscription.endpoint,
            p256dh,
            auth,
          },
          { onConflict: "user_id,endpoint" },
        );
      if (saveError) {
        await activeSubscription.unsubscribe();
        throw new Error(saveError.message);
      }
      setPushNotifications(true);
      localStorage.setItem("pushNotifications", "true");
      toast.success("Background browser notifications enabled.");
    } catch (error) {
      console.error("Failed to enable browser notifications:", error);
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Your browser's push service could not create a subscription. This can happen when the browser push provider is unavailable or blocks the request. Try Chrome or Edge, or check the browser's notification and network settings."
          : error instanceof Error
            ? error.message
            : "Could not update browser push notifications.";
      toast.error(
        message,
      );
    } finally {
      setIsPushBusy(false);
    }
  };

  const handleSoundAlertsChange = (enabled: boolean) => {
    setSoundAlerts(enabled);
    localStorage.setItem("soundAlerts", String(enabled));
  };

  useEffect(() => {
    let active = true;
    void getVerifiedTotpFactor(supabase)
      .then((factor) => {
        if (active) setTotpFactorId(factor?.id ?? null);
      })
      .catch((error: unknown) => {
        console.error("Could not load authenticator status:", error);
        if (active) toast.error("Could not load authenticator status.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => {
        if (active) {
          setPushNotifications(
            Boolean(subscription) &&
              typeof Notification !== "undefined" &&
              Notification.permission === "granted",
          );
        }
      })
      .catch((error: unknown) => {
        console.error("Could not inspect browser push subscription:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  const beginTotpEnrollment = async () => {
    setIsTotpBusy(true);
    try {
      setTotpEnrollment(
        await startTotpEnrollment(supabase, "BantayBayan account"),
      );
      setTotpCode("");
    } catch (error) {
      console.error("Could not start authenticator setup:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not start authenticator setup.",
      );
    } finally {
      setIsTotpBusy(false);
    }
  };

  const confirmTotpEnrollment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!totpEnrollment || !/^\d{6}$/.test(totpCode.trim())) {
      toast.error("Enter the current 6-digit authenticator code.");
      return;
    }
    setIsTotpBusy(true);
    try {
      await verifyNewTotpFactor(
        supabase,
        totpEnrollment.factorId,
        totpCode,
      );
      setTotpFactorId(totpEnrollment.factorId);
      setTotpEnrollment(null);
      setTotpCode("");
      toast.success("Authenticator app enabled.");
    } catch (error) {
      console.error("Could not verify authenticator setup:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not verify the code.",
      );
    } finally {
      setIsTotpBusy(false);
    }
  };

  const disableTotp = async () => {
    if (!totpFactorId) return;
    setIsTotpBusy(true);
    try {
      await removeTotpFactor(supabase, totpFactorId);
      setTotpFactorId(null);
      toast.success("Authenticator app disabled.");
    } catch (error) {
      console.error("Could not disable authenticator:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not disable the authenticator.",
      );
    } finally {
      setIsTotpBusy(false);
    }
  };

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    let active = true;
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, contact_number, avatar_path")
          .eq("id", userId)
          .single();
        if (error) throw new Error(error.message);
        if (active) {
          const loadedProfile = {
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            email: data.email || "",
            contactNumber: data.contact_number || "",
          };

          setFirstName(loadedProfile.firstName);
          setLastName(loadedProfile.lastName);
          setEmail(loadedProfile.email);
          setNewEmail(loadedProfile.email);
          setContactNumber(loadedProfile.contactNumber);
          setSavedProfile(loadedProfile);

          const loadedAvatarPath = data.avatar_path || null;
          const loadedAvatarUrl = loadedAvatarPath
            ? supabase.storage
                .from("avatars")
                .getPublicUrl(loadedAvatarPath).data.publicUrl
            : null;
          setSavedAvatarUrl(loadedAvatarUrl);
          setSavedAvatarPath(loadedAvatarPath);
          setAvatarData({ file: null, url: loadedAvatarUrl });
          localStorage.setItem(
            "userName",
            `${loadedProfile.firstName} ${loadedProfile.lastName}`.trim(),
          );
          if (loadedAvatarUrl) {
            localStorage.setItem("userAvatarUrl", loadedAvatarUrl);
          } else {
            localStorage.removeItem("userAvatarUrl");
          }
          window.dispatchEvent(new Event("bantaybayan-profile-update"));
        }
      } catch (error) {
        console.error("Failed to load profile details:", error);
        toast.error("Could not load your profile.");
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Saving profile...");
    const userId = localStorage.getItem("userId");

    if (!userId) {
      toast.error("User session not found.", { id: toastId });
      return;
    }

    try {
      let avatarPath = savedAvatarPath;
      if (avatarData.file) {
        avatarPath = `${userId}/admin_avatar_${Date.now()}.${
          avatarData.file.name.split(".").pop()?.toLowerCase() || "jpg"
        }`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(avatarPath, avatarData.file, {
            contentType: avatarData.file.type,
          });
        if (uploadError) throw new Error(uploadError.message);
      } else if (!avatarData.url) {
        avatarPath = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          contact_number: contactNumber,
          avatar_path: avatarPath,
        })
        .eq("id", userId);
      if (error) throw new Error(error.message);

      const requestedEmail = newEmail.trim().toLowerCase();
      const emailChangeRequested =
        requestedEmail !== savedProfile.email.trim().toLowerCase();
      if (emailChangeRequested) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: requestedEmail,
        });
        if (emailError) throw new Error(emailError.message);
        setPendingEmail(requestedEmail);
      }

      if (savedAvatarPath && savedAvatarPath !== avatarPath) {
        const { error: cleanupError } = await supabase.storage
          .from("avatars")
          .remove([savedAvatarPath]);
        if (cleanupError) {
          console.warn("Could not remove the previous avatar:", cleanupError);
        }
      }

      const updatedAvatarUrl = avatarPath
        ? supabase.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl
        : null;
      setSavedAvatarUrl(updatedAvatarUrl);
      setSavedAvatarPath(avatarPath);
      setAvatarData({ file: null, url: updatedAvatarUrl });
      localStorage.setItem("userName", `${firstName} ${lastName}`.trim());
      if (updatedAvatarUrl) {
        localStorage.setItem("userAvatarUrl", updatedAvatarUrl);
      } else {
        localStorage.removeItem("userAvatarUrl");
      }
      window.dispatchEvent(new Event("bantaybayan-profile-update"));

      toast.success(
        emailChangeRequested
          ? "Profile saved. Confirm the email change from the verification message."
          : "Profile updated successfully!",
        { id: toastId },
      );
      setSavedProfile({
        firstName,
        lastName,
        email: savedProfile.email,
        contactNumber,
      });
      setEmail(savedProfile.email);
      setNewEmail(savedProfile.email);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not save your profile.",
        { id: toastId },
      );
    }
  };

  const handleCancelEdit = () => {
    setFirstName(savedProfile.firstName);
    setLastName(savedProfile.lastName);
    setEmail(savedProfile.email);
    setNewEmail(savedProfile.email);
    setContactNumber(savedProfile.contactNumber);
    setAvatarData({ file: null, url: savedAvatarUrl });
    setIsEditing(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    const toastId = toast.loading("Updating password...");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !authData.user?.email) {
        throw new Error("Could not verify the current Supabase account.");
      }
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: authData.user.email,
        password: currentPassword,
      });
      if (verifyError) throw new Error("Current password is incorrect.");
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (passwordError) throw new Error(passwordError.message);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully.", {
        id: toastId,
      });
    } catch (error) {
      console.error("Failed to update password:", error);
      toast.error(
        error instanceof Error ? error.message : "Could not update password.",
        { id: toastId },
      );
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: LuUser },
    { id: "security", label: "Security & 2FA", icon: LuLock },
    { id: "notifications", label: "Notifications", icon: LuBell },
    { id: "preferences", label: "Preferences", icon: LuPalette },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
            Account center
          </p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Settings
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Manage your profile, security options, and app preferences.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div key={activeTab} className="settings-tab-enter">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="max-w-3xl space-y-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Personal Details
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep your account information up to date.
                  </p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Avatar Component */}
              <AvatarCustomizer
                initialAvatarUrl={avatarData.url}
                firstName={firstName}
                lastName={lastName}
                readOnly={!isEditing}
                onChange={(data) => setAvatarData(data)}
              />

              {!isEditing ? (
                /* VIEW MODE */
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        First Name
                    </p>
                    <p className="font-semibold text-slate-800">
                        {firstName || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Last Name
                    </p>
                    <p className="font-semibold text-slate-800">
                        {lastName || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:col-span-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Email Address
                    </p>
                    <p className="break-all font-semibold text-slate-800">
                      {email || "—"}
                    </p>
                  </div>
                  {pendingEmail && (
                    <p
                      className="text-sm text-amber-700 sm:col-span-2"
                      role="status"
                    >
                      Email confirmation is pending for {pendingEmail}. Your
                      current email stays active until verification is complete.
                    </p>
                  )}

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:col-span-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Contact Number
                    </p>
                    <p className="font-semibold text-slate-800">
                      {contactNumber || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                /* EDIT MODE */
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                  {pendingEmail && (
                    <p className="text-sm text-amber-700" role="status">
                      Email confirmation is pending for {pendingEmail}. Your
                      current email stays active until verification is complete.
                    </p>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      Save Profile
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="max-w-3xl space-y-7">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Security
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update your password to help keep your account secure.
                </p>
              </div>
              <form
                onSubmit={handleUpdatePassword}
                className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6"
              >
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Change Password
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter your current password, then choose a new one.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={visiblePasswords.current ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setVisiblePasswords((visible) => ({
                          ...visible,
                          current: !visible.current,
                        }))
                      }
                      aria-label={visiblePasswords.current ? "Hide current password" : "Show current password"}
                      className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-slate-500 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                    >
                      {visiblePasswords.current ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={visiblePasswords.new ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVisiblePasswords((visible) => ({
                            ...visible,
                            new: !visible.new,
                          }))
                        }
                        aria-label={visiblePasswords.new ? "Hide new password" : "Show new password"}
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-slate-500 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                      >
                        {visiblePasswords.new ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={visiblePasswords.confirm ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVisiblePasswords((visible) => ({
                            ...visible,
                            confirm: !visible.confirm,
                          }))
                        }
                        aria-label={visiblePasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                        className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-slate-500 transition hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                      >
                        {visiblePasswords.confirm ? <LuEyeOff size={18} /> : <LuEye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  Update Password
                </button>
              </form>
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    Authenticator app
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Require a time-based code from an authenticator app when
                    signing in.
                  </p>
                </div>
                {totpFactorId ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-emerald-700">
                      Two-factor authentication is enabled.
                    </p>
                    <button
                      type="button"
                      onClick={() => void disableTotp()}
                      disabled={isTotpBusy}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60"
                    >
                      Disable authenticator
                    </button>
                  </div>
                ) : totpEnrollment ? (
                  <form onSubmit={confirmTotpEnrollment} className="space-y-4">
                    <img
                      src={totpEnrollment.qrCode}
                      alt="Scan this QR code with your authenticator app"
                      className="h-48 w-48 rounded-lg border border-slate-200 bg-white p-2"
                    />
                    <p className="break-all text-sm text-slate-600">
                      If you cannot scan the QR code, enter this secret:
                      <strong className="ml-1 font-mono">{totpEnrollment.secret}</strong>
                    </p>
                    <label className="block text-sm font-semibold text-slate-700">
                      Verification code
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={totpCode}
                        onChange={(event) =>
                          setTotpCode(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-center text-lg tracking-[0.4em]"
                        required
                      />
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isTotpBusy}
                        className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {isTotpBusy ? "Verifying…" : "Verify and enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTotpEnrollment(null)}
                        disabled={isTotpBusy}
                        className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => void beginTotpEnrollment()}
                    disabled={isTotpBusy}
                    className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isTotpBusy ? "Preparing…" : "Set up authenticator"}
                  </button>
                )}
              </section>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Notification Preferences
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose how you’d like to receive updates and alerts.
                </p>
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Push Notifications</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Instant alerts in your web browser
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pushNotifications}
                  aria-busy={isPushBusy}
                  aria-label="Push Notifications"
                  disabled={isPushBusy}
                  onClick={() => void handlePushNotificationsChange(!pushNotifications)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
                    pushNotifications ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      pushNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Sound Alerts */}
              <div className="flex items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">Sound Alerts</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Play a chime when new incidents occur
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundAlerts}
                  aria-label="Sound Alerts"
                  onClick={() => handleSoundAlertsChange(!soundAlerts)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                    soundAlerts ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      soundAlerts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div className="max-w-3xl space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  App Preferences
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Personalize the appearance of your workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 sm:p-6">
                <label className="mb-1 block text-sm font-semibold text-slate-800">
                  Interface Theme
                </label>
                <p className="mb-4 text-sm text-slate-500">
                  Choose a theme or match your device settings.
                </p>
                <select
                  value={theme}
                  onChange={(e) =>
                    handleThemeChange(e.target.value as "light" | "dark" | "system")
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:max-w-md"
                >
                  <option value="system">System Default</option>
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}