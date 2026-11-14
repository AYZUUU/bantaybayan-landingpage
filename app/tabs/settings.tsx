import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { SvgXml } from "react-native-svg";

import { useAuth } from "../../shared/auth";
import { supabase } from "../../services/supabase";
import {
  getTotpQrSvg,
  getVerifiedTotpFactor,
  removeTotpFactor,
  startTotpEnrollment,
  verifyNewTotpFactor,
} from "../../shared/totpMfa";
import {
  useAppPreferences,
  type AppPreferences,
} from "../../shared/AppPreferences";
import LogoutConfirmation from "../../shared/LogoutConfirmation";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  avatar_url?: string | null;
  avatar_path?: string | null;
}

export default function Settings() {
  const { userId, userName, avatarUrl, updateAvatarUrl, signOut } = useAuth();
  const router = useRouter();
  const { preferences, updatePreference } = useAppPreferences();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpEnrollment, setTotpEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [isTotpBusy, setIsTotpBusy] = useState(false);
  const [selectedAvatar, setSelectedAvatar] =
    useState<ImagePickerAsset | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isAvatarPreviewVisible, setIsAvatarPreviewVisible] = useState(false);
  const [isLogoutConfirmationVisible, setIsLogoutConfirmationVisible] =
    useState(false);

  const handleLogout = async () => {
    setIsLogoutConfirmationVisible(false);
    await signOut();
    router.replace("/");
    Toast.show({
      type: "success",
      text1: "Logged out",
      text2: "You have been securely signed out.",
    });
  };

  useEffect(() => {
    if (!userId) return;
    let active = true;

    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, contact_number, avatar_path")
          .eq("id", userId)
          .single();
        if (error) throw new Error(error.message);

        if (active) {
          const nextProfile = data as Profile;
          setProfile(nextProfile);
          setNewEmail(nextProfile.email);
          setNewPhone(nextProfile.contact_number);
          const nextAvatar = nextProfile.avatar_path
            ? supabase.storage
                .from("avatars")
                .getPublicUrl(nextProfile.avatar_path).data.publicUrl
            : null;
          if (nextAvatar !== avatarUrl) await updateAvatarUrl(nextAvatar);
        }
      } catch (error) {
        console.error("Failed to load mobile profile:", error);
        Toast.show({
          type: "error",
          text1: "Profile unavailable",
          text2:
            error instanceof Error ? error.message : "Could not load profile.",
        });
      } finally {
        if (active) setIsLoadingProfile(false);
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [avatarUrl, updateAvatarUrl, userId]);

  useEffect(() => {
    let active = true;
    void getVerifiedTotpFactor(supabase)
      .then((factor) => {
        if (active) setTotpFactorId(factor?.id ?? null);
      })
      .catch((error: unknown) => {
        console.error("Could not load authenticator status:", error);
        Toast.show({
          type: "error",
          text1: "Authenticator unavailable",
          text2: "Could not load your authenticator status.",
        });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const beginTotpEnrollment = async () => {
    setIsTotpBusy(true);
    try {
      setTotpEnrollment(
        await startTotpEnrollment(supabase, "BantayBayan account"),
      );
      setTotpCode("");
    } catch (error) {
      console.error("Could not start authenticator setup:", error);
      Toast.show({
        type: "error",
        text1: "Setup failed",
        text2: error instanceof Error ? error.message : "Try again later.",
      });
    } finally {
      setIsTotpBusy(false);
    }
  };

  const confirmTotpEnrollment = async () => {
    if (!totpEnrollment || !/^\d{6}$/.test(totpCode.trim())) {
      Toast.show({
        type: "info",
        text1: "Enter the 6-digit code",
        text2: "Use the current code from your authenticator app.",
      });
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
      Toast.show({
        type: "success",
        text1: "Authenticator enabled",
        text2: "You will need a code the next time you sign in.",
      });
    } catch (error) {
      console.error("Could not verify authenticator setup:", error);
      Toast.show({
        type: "error",
        text1: "Verification failed",
        text2: error instanceof Error ? error.message : "Check the code.",
      });
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
      Toast.show({
        type: "success",
        text1: "Authenticator disabled",
      });
    } catch (error) {
      console.error("Could not disable authenticator:", error);
      Toast.show({
        type: "error",
        text1: "Could not disable authenticator",
        text2: error instanceof Error ? error.message : "Try again later.",
      });
    } finally {
      setIsTotpBusy(false);
    }
  };

  const savePhoneNumber = async () => {
    const requestedNumber = newPhone.replace(/[\s-]/g, "");
    if (!/^\+?\d{10,15}$/.test(requestedNumber)) {
      Toast.show({
        type: "info",
        text1: "Enter a valid phone number",
        text2: "Use 10 to 15 digits, for example 09171234567.",
      });
      return;
    }
    if (!userId || requestedNumber === profile?.contact_number) {
      Toast.show({
        type: "info",
        text1: "Enter a different number",
        text2: "That is already your phone number.",
      });
      return;
    }

    setIsSavingPhone(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ contact_number: requestedNumber })
        .eq("id", userId)
        .select("contact_number")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Your profile could not be updated.");
      setProfile((current) =>
        current ? { ...current, contact_number: data.contact_number } : current,
      );
      setNewPhone(data.contact_number);
      Toast.show({ type: "success", text1: "Phone number updated" });
    } catch (error) {
      console.error("Could not update the phone number:", error);
      Toast.show({
        type: "error",
        text1: "Phone number not updated",
        text2:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSavingPhone(false);
    }
  };

  const requestEmailChange = async () => {
    const requestedEmail = newEmail.trim().toLowerCase();
    if (!requestedEmail || requestedEmail === profile?.email.toLowerCase()) {
      Toast.show({
        type: "info",
        text1: "Enter a different email",
        text2: "Use a new email address to request a change.",
      });
      return;
    }

    setIsRequestingEmailChange(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: requestedEmail,
      });
      if (error) throw new Error(error.message);
      setPendingEmail(requestedEmail);
      Toast.show({
        type: "success",
        text1: "Confirmation sent",
        text2: "Confirm the email change using the message sent by Supabase.",
      });
    } catch (error) {
      console.error("Could not request an email change:", error);
      Toast.show({
        type: "error",
        text1: "Email change not requested",
        text2:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsRequestingEmailChange(false);
    }
  };

  const chooseAvatar = async () => {
    if (isPickingAvatar || isSavingAvatar) return;

    setIsPickingAvatar(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Toast.show({
          type: "error",
          text1: "Photo access required",
          text2: "Allow photo library access to choose an avatar.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedAvatar(result.assets[0]);
        setRemoveAvatar(false);
      }
    } catch (error) {
      console.error("Could not open avatar image picker:", error);
      Toast.show({
        type: "error",
        text1: "Could not choose photo",
        text2: "Please try selecting an image again.",
      });
    } finally {
      setIsPickingAvatar(false);
    }
  };

  const saveAvatar = async () => {
    if (!userId || !profile || (!selectedAvatar && !removeAvatar)) {
      Toast.show({
        type: "error",
        text1: "Cannot save avatar",
        text2: "Your account profile is not ready. Try again shortly.",
      });
      return;
    }

    setIsSavingAvatar(true);
    let uploadedPath: string | null = null;
    try {
      if (selectedAvatar) {
        const response = await fetch(selectedAvatar.uri);
        if (!response.ok) throw new Error("Could not read the selected image.");
        const image = await response.blob();
        const mimeType = selectedAvatar.mimeType || "image/jpeg";
        const extension =
          mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        uploadedPath = `${userId}/avatar_${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(uploadedPath, image, { contentType: mimeType });
        if (uploadError) throw new Error(uploadError.message);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_path: uploadedPath })
        .eq("id", userId);
      if (updateError) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from("avatars")
            .remove([uploadedPath]);
          if (cleanupError) {
            console.error("Could not remove the unreferenced avatar:", cleanupError);
          }
        }
        throw new Error(updateError.message);
      }

      const previousPath = profile.avatar_path;
      const updatedAvatar = uploadedPath
        ? supabase.storage.from("avatars").getPublicUrl(uploadedPath)
            .data.publicUrl
        : null;
      if (previousPath && previousPath !== uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("avatars")
          .remove([previousPath]);
        if (cleanupError) {
          console.warn("Could not remove the previous avatar:", cleanupError);
        }
      }

      await updateAvatarUrl(updatedAvatar);
      setSelectedAvatar(null);
      setRemoveAvatar(false);
      setProfile((current) =>
        current ? { ...current, avatar_path: uploadedPath } : current,
      );
      Toast.show({
        type: "success",
        text1: "Avatar updated",
        text2: "Your account avatar has been saved.",
      });
    } catch (error) {
      console.error("Failed to save mobile avatar:", error);
      Toast.show({
        type: "error",
        text1: "Avatar update failed",
        text2:
          error instanceof Error ? error.message : "Could not save your avatar.",
      });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const updateSetting = async <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K],
  ) => {
    try {
      if (key === "notificationsEnabled" && value === true) {
        if (!Device.isDevice) {
          Toast.show({
            type: "info",
            text1: "Push notifications require a device",
            text2: "Use a physical device to enable push notifications.",
          });
          return;
        }
        const existingPermission = await Notifications.getPermissionsAsync();
        const permission =
          existingPermission.granted ||
          (await Notifications.requestPermissionsAsync()).granted;
        if (!permission) {
          Toast.show({
            type: "info",
            text1: "Notifications not allowed",
            text2: "Enable notifications in your device settings to use alerts.",
          });
          return;
        }
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Emergency alerts",
            importance: AndroidImportance.HIGH,
            sound: "default",
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF0000",
          });
        }
        if (userId) {
          const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
          const { error } = await supabase
            .from("profiles")
            .update({ push_token: pushToken })
            .eq("id", userId);
          if (error) throw new Error(error.message);
        }
      } else if (key === "notificationsEnabled" && value === false && userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ push_token: null })
          .eq("id", userId);
        if (error) throw new Error(error.message);
      }
      await updatePreference(key, value);
    } catch (error) {
      console.error("Failed to save app preference:", error);
      Toast.show({
        type: "error",
        text1: "Preference not saved",
        text2: "Please try changing this setting again.",
      });
    }
  };

  const displayedAvatar = removeAvatar
    ? null
    : selectedAvatar?.uri || avatarUrl;
  const cardStyle = [styles.card, isDark && styles.darkCard];

  return (
    <SafeAreaView
      style={[styles.safeArea, isDark && styles.darkBackground]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderIcon}>
            <Ionicons
              name="settings-outline"
              size={24}
              color={isDark ? "#bfdbfe" : "#2563eb"}
            />
          </View>
          <View style={styles.pageHeaderText}>
            <Text style={[styles.title, isDark && styles.darkText]}>
              Settings
            </Text>
            <Text style={[styles.subtitle, isDark && styles.darkSecondaryText]}>
              Make BantayBayan yours.
            </Text>
          </View>
        </View>

        <View style={cardStyle}>
          <Text
            style={[
              styles.sectionTitle,
              styles.centeredText,
              isDark && styles.darkText,
            ]}
          >
            Profile avatar
          </Text>
          <View style={styles.avatarSection}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Preview profile avatar"
              accessibilityHint="Opens a larger preview of your profile avatar"
              onPress={() => setIsAvatarPreviewVisible(true)}
              style={({ pressed }) => [
                styles.avatarPreviewButton,
                pressed && styles.buttonPressed,
              ]}
            >
              {displayedAvatar ? (
                <Image source={{ uri: displayedAvatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitials}>
                    {(userName || "U")
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
            <View style={styles.avatarDetails}>
              <Text
                style={[styles.name, styles.centeredText, isDark && styles.darkText]}
              >
                {userName || "Your account"}
              </Text>
              <Text
                style={[
                  styles.hint,
                  styles.centeredText,
                  isDark && styles.darkSecondaryText,
                ]}
              >
                Tap the avatar to preview. Your avatar syncs with your account.
              </Text>
            </View>
          </View>
          {(!userId || !profile) && (
            <Text
              style={[
                styles.hint,
                styles.centeredText,
                isDark && styles.darkSecondaryText,
              ]}
            >
                {!userId
                  ? "Sign out and sign back in to enable avatar syncing."
                  : isLoadingProfile
                    ? "Loading account profile..."
                    : "Avatar changes need a loaded account profile."}
            </Text>
          )}
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: isPickingAvatar || isSavingAvatar,
                busy: isPickingAvatar,
              }}
              onPress={() => void chooseAvatar()}
              disabled={isPickingAvatar || isSavingAvatar}
              android_ripple={{ color: "#1e40af" }}
              style={({ pressed }) => [
                styles.photoButtonPressable,
                pressed && styles.buttonPressed,
                (isPickingAvatar || isSavingAvatar) && styles.disabledButton,
              ]}
            >
              <View style={styles.photoButtonSurface}>
                {isPickingAvatar ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={18} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>Choose photo</Text>
                  </>
                )}
              </View>
            </Pressable>
            {avatarUrl && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedAvatar(null);
                  setRemoveAvatar(true);
                }}
                disabled={isSavingAvatar}
                style={[styles.secondaryButton, isDark && styles.darkBorder]}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    isDark && styles.darkText,
                  ]}
                >
                  Remove
                </Text>
              </Pressable>
            )}
          </View>
          {(selectedAvatar || removeAvatar) && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void saveAvatar()}
              disabled={isSavingAvatar}
              style={[styles.saveButton, isSavingAvatar && styles.disabledButton]}
            >
              {isSavingAvatar ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save avatar</Text>
              )}
            </Pressable>
          )}
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
            Account email
          </Text>
          <Text style={[styles.hint, isDark && styles.darkSecondaryText]}>
            Current email: {profile?.email || "Loading…"}
          </Text>
          <TextInput
            accessibilityLabel="New email address"
            autoCapitalize="none"
            keyboardType="email-address"
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="New email address"
            placeholderTextColor="#94a3b8"
            style={[
              styles.emailInput,
              isDark && styles.darkEmailInput,
            ]}
          />
          {pendingEmail && (
            <Text style={[styles.hint, isDark && styles.darkSecondaryText]}>
              Confirmation is pending for {pendingEmail}. Your current email
              remains active until you confirm.
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => void requestEmailChange()}
            disabled={isRequestingEmailChange || !profile}
            style={[
              styles.secondaryButton,
              isDark && styles.darkBorder,
              (isRequestingEmailChange || !profile) && styles.disabledButton,
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isDark && styles.darkText,
              ]}
            >
              {isRequestingEmailChange ? "Sending…" : "Change email"}
            </Text>
          </Pressable>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
            Phone number
          </Text>
          <Text style={[styles.hint, isDark && styles.darkSecondaryText]}>
            Responders use this number to reach you.
          </Text>
          <TextInput
            accessibilityLabel="Phone number"
            keyboardType="phone-pad"
            value={newPhone}
            onChangeText={setNewPhone}
            placeholder="Phone number"
            placeholderTextColor="#94a3b8"
            style={[styles.emailInput, isDark && styles.darkEmailInput]}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void savePhoneNumber()}
            disabled={isSavingPhone || !profile}
            style={[
              styles.secondaryButton,
              isDark && styles.darkBorder,
              (isSavingPhone || !profile) && styles.disabledButton,
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                isDark && styles.darkText,
              ]}
            >
              {isSavingPhone ? "Saving…" : "Save phone number"}
            </Text>
          </Pressable>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
            Authenticator app
          </Text>
          <Text style={[styles.hint, isDark && styles.darkSecondaryText]}>
            Use a time-based code for two-factor sign-in.
          </Text>
          {totpFactorId ? (
            <>
              <Text style={styles.totpEnabledText}>
                Two-factor authentication is enabled.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void disableTotp()}
                disabled={isTotpBusy}
                style={[styles.secondaryButton, isDark && styles.darkBorder]}
              >
                <Text style={[styles.secondaryButtonText, isDark && styles.darkText]}>
                  {isTotpBusy ? "Disabling…" : "Disable authenticator"}
                </Text>
              </Pressable>
            </>
          ) : totpEnrollment ? (
            <>
              <View style={styles.totpQrContainer}>
                <SvgXml
                  xml={getTotpQrSvg(totpEnrollment.qrCode)}
                  width={200}
                  height={200}
                />
              </View>
              <Text selectable style={[styles.hint, isDark && styles.darkSecondaryText]}>
                Manual setup key: {totpEnrollment.secret}
              </Text>
              <TextInput
                accessibilityLabel="Authenticator verification code"
                value={totpCode}
                onChangeText={(code) =>
                  setTotpCode(code.replace(/\D/g, "").slice(0, 6))
                }
                keyboardType="number-pad"
                maxLength={6}
                placeholder="6-digit code"
                placeholderTextColor="#94a3b8"
                style={[styles.emailInput, isDark && styles.darkEmailInput]}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => void confirmTotpEnrollment()}
                disabled={isTotpBusy}
                style={[styles.saveButton, isTotpBusy && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>
                  {isTotpBusy ? "Verifying…" : "Verify and enable"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTotpEnrollment(null)}
                disabled={isTotpBusy}
                style={[styles.secondaryButton, isDark && styles.darkBorder]}
              >
                <Text style={[styles.secondaryButtonText, isDark && styles.darkText]}>
                  Cancel
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => void beginTotpEnrollment()}
              disabled={isTotpBusy}
              style={[styles.saveButton, isTotpBusy && styles.disabledButton]}
            >
              <Text style={styles.primaryButtonText}>
                {isTotpBusy ? "Preparing…" : "Set up authenticator"}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
            Appearance
          </Text>
          <Text style={[styles.hint, isDark && styles.darkSecondaryText]}>
            Choose a theme or follow your device setting.
          </Text>
          <View style={styles.optionRow}>
            {(["system", "light", "dark"] as const).map((theme) => (
              <Pressable
                key={theme}
                accessibilityRole="radio"
                accessibilityState={{ checked: preferences.theme === theme }}
                onPress={() => void updateSetting("theme", theme)}
                style={[
                  styles.themeOption,
                  isDark && styles.darkBorder,
                  preferences.theme === theme && styles.selectedTheme,
                ]}
              >
                <Text
                  style={[
                    styles.themeLabel,
                    isDark && styles.darkText,
                    preferences.theme === theme && styles.selectedThemeText,
                  ]}
                >
                  {theme === "system"
                    ? "System"
                    : theme[0].toUpperCase() + theme.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={cardStyle}>
          <Text style={[styles.sectionTitle, isDark && styles.darkText]}>
            Alerts
          </Text>
          <PreferenceToggle
            title="Notifications"
            description="Show alerts while you are using the app."
            value={preferences.notificationsEnabled}
            isDark={isDark}
            onChange={(value) =>
              void updateSetting("notificationsEnabled", value)
            }
          />
          <View style={[styles.divider, isDark && styles.darkDivider]} />
          <PreferenceToggle
            title="Notification sounds"
            description="Play sounds for notifications shown in-app."
            value={preferences.soundEnabled}
            isDark={isDark}
            onChange={(value) => void updateSetting("soundEnabled", value)}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={() => setIsLogoutConfirmationVisible(true)}
          android_ripple={{ color: "#9f1239" }}
          style={({ pressed }) => [
            styles.logoutButtonPressable,
            pressed && styles.buttonPressed,
          ]}
        >
          <View style={styles.logoutButtonSurface}>
            <Ionicons name="log-out-outline" size={20} color="#ffffff" />
            <Text style={styles.logoutButtonText}>Log out</Text>
          </View>
        </Pressable>
      </ScrollView>
      <LogoutConfirmation
        visible={isLogoutConfirmationVisible}
        onCancel={() => setIsLogoutConfirmationVisible(false)}
        onConfirm={handleLogout}
        isDark={isDark}
      />
      <Modal
        visible={isAvatarPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAvatarPreviewVisible(false)}
        statusBarTranslucent
      >
        <View
          style={[
            styles.avatarPreviewOverlay,
            isDark && styles.darkAvatarPreviewOverlay,
          ]}
        >
          {displayedAvatar ? (
            <Image
              source={{ uri: displayedAvatar }}
              resizeMode="contain"
              style={styles.avatarPreviewImage}
            />
          ) : (
            <View style={[styles.avatarPreviewFallback, styles.avatarFallback]}>
              <Text style={styles.avatarPreviewInitials}>
                {(userName || "U")
                  .split(/\s+/)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close avatar preview"
            onPress={() => setIsAvatarPreviewVisible(false)}
            style={[
              styles.avatarPreviewClose,
              isDark && styles.darkAvatarPreviewClose,
            ]}
          >
            <Ionicons name="close" size={26} color="#ffffff" />
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PreferenceToggle({
  title,
  description,
  value,
  isDark,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  isDark: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={[styles.name, isDark && styles.darkText]}>{title}</Text>
        <Text style={[styles.hint, isDark && styles.darkSecondaryText]}>
          {description}
        </Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
        thumbColor={value ? "#2563eb" : "#f8fafc"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  darkBackground: {
    backgroundColor: "#0f172a",
  },
  content: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 2,
  },
  pageHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },
  pageHeaderText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: "#0f172a",
    fontSize: 25,
    fontWeight: "800",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 14,
  },
  darkCard: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  avatarSection: {
    alignItems: "center",
    gap: 12,
  },
  avatarPreviewButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    position: "relative",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  avatarPreviewHint: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1e3a8a",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#dbeafe",
  },
  avatarFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    color: "#1d4ed8",
    fontWeight: "800",
    fontSize: 22,
  },
  avatarDetails: {
    width: "100%",
    gap: 4,
    alignItems: "center",
  },
  centeredText: {
    textAlign: "center",
  },
  avatarPreviewOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(2, 6, 23, 0.92)",
  },
  darkAvatarPreviewOverlay: {
    backgroundColor: "rgba(2, 6, 23, 0.96)",
  },
  avatarPreviewImage: {
    width: "100%",
    height: "75%",
  },
  avatarPreviewFallback: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  avatarPreviewInitials: {
    color: "#1d4ed8",
    fontSize: 56,
    fontWeight: "800",
  },
  avatarPreviewClose: {
    position: "absolute",
    top: 56,
    right: 24,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  darkAvatarPreviewClose: {
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  name: {
    color: "#1e293b",
    fontSize: 15,
    fontWeight: "600",
  },
  hint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  photoButtonPressable: {
    width: "100%",
    maxWidth: 280,
  },
  photoButtonSurface: {
    minHeight: 58,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#1d4ed8",
    borderWidth: 2,
    borderColor: "#1e3a8a",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  secondaryButtonText: {
    color: "#334155",
    fontWeight: "600",
  },
  emailInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  darkEmailInput: {
    borderColor: "#475569",
    color: "#f8fafc",
    backgroundColor: "#0f172a",
  },
  totpEnabledText: {
    color: "#047857",
    fontSize: 14,
    fontWeight: "700",
  },
  totpQrContainer: {
    alignSelf: "center",
    padding: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  saveButton: {
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#15803d",
  },
  buttonPressed: {
    opacity: 0.84,
  },
  disabledButton: {
    opacity: 0.55,
  },
  logoutButtonPressable: {
    width: "100%",
  },
  logoutButtonSurface: {
    minHeight: 60,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#be123c",
    borderWidth: 2,
    borderColor: "#9f1239",
    shadowColor: "#881337",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 5,
    elevation: 4,
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeOption: {
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
  },
  selectedTheme: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  themeLabel: {
    color: "#334155",
    fontWeight: "600",
  },
  selectedThemeText: {
    color: "#1d4ed8",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleText: {
    flex: 1,
    gap: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
  },
  darkText: {
    color: "#f8fafc",
  },
  darkSecondaryText: {
    color: "#cbd5e1",
  },
  darkBorder: {
    borderColor: "#475569",
  },
  darkDivider: {
    backgroundColor: "#475569",
  },
});
