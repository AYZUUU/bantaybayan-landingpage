import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";
import { supabase } from "../services/supabase";
import {
  loadRegistrationDraft,
  removeRegistrationDraft,
  type RegistrationDraft,
} from "../shared/registrationDraft";

type FunctionErrorResponse = {
  clone?: () => FunctionErrorResponse;
  json?: () => Promise<unknown>;
  status?: number;
};

function isFunctionErrorResponse(value: unknown): value is FunctionErrorResponse {
  return typeof value === "object" && value !== null;
}

async function getFunctionErrorMessage(error: {
  message: string;
  context?: unknown;
}) {
  if (!isFunctionErrorResponse(error.context)) return error.message;

  const response =
    typeof error.context.clone === "function"
      ? error.context.clone()
      : error.context;
  if (typeof response.json === "function") {
    try {
      const body = await response.json();
      if (typeof body === "object" && body !== null) {
        const bodyRecord = body as Record<string, unknown>;
        for (const key of ["error", "message", "msg"]) {
          if (typeof bodyRecord[key] === "string") {
            return bodyRecord[key];
          }
        }
      }
    } catch {
      // Fall back to the HTTP status when the function response isn't JSON.
    }
  }

  return response.status
    ? `Registration request failed (HTTP ${response.status}).`
    : error.message;
}

export default function Preview() {
  const { draftId: draftIdParam } = useLocalSearchParams<{
    draftId?: string | string[];
  }>();
  const draftId = Array.isArray(draftIdParam) ? draftIdParam[0] : draftIdParam;
  const [draft, setDraft] = useState<RegistrationDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPhotoLoadError, setHasPhotoLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!draftId) return;

    void loadRegistrationDraft(draftId)
      .then((savedDraft) => {
        if (!active) return;
        if (!savedDraft) {
          setDraftError("Signup details expired. Please complete signup again.");
          return;
        }
        setDraft(savedDraft);
      })
      .catch((error: unknown) => {
        console.error("Could not load signup details:", error);
        if (active) {
          setDraftError(
            error instanceof Error
              ? error.message
              : "Could not load your signup details.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingDraft(false);
      });

    return () => {
      active = false;
    };
  }, [draftId]);

  const handleConfirm = async () => {
    if (isSubmitting || !draft || !draftId) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("first_name", draft.firstName);
      formData.append("last_name", draft.lastName);
      formData.append("contact_number", draft.contactNumber);
      formData.append("email", draft.email);
      formData.append("role", draft.role.toLowerCase());
      formData.append("password", draft.password);

      if (draft.photoUri) {
        let localUri = draft.photoUri;
        if (!localUri.startsWith("file://") && !localUri.startsWith("content://")) {
          localUri = "file://" + localUri;
        }

        const imgResponse = await fetch(localUri);
        if (!imgResponse.ok) {
          throw new Error("Could not read the scanned ID photo.");
        }
        const blob = await imgResponse.blob();
        const contentType = ["image/jpeg", "image/png", "image/webp"].includes(
          blob.type,
        )
          ? blob.type
          : "image/jpeg";
        const imageBlob =
          blob.type === contentType
            ? blob
            : blob.slice(0, blob.size, contentType);

        formData.append(
          "photo",
          imageBlob,
          `id_${Date.now()}.${contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"}`,
        );
      }

      const { error } = await supabase.functions.invoke("register-user", {
        body: formData,
      });
      if (error) {
        throw new Error(await getFunctionErrorMessage(error));
      }
      try {
        await removeRegistrationDraft(draftId);
      } catch (cleanupError) {
        console.warn("Could not clear the submitted signup draft:", cleanupError);
      }
      Toast.show({
        type: "success",
        text1: "Registration Submitted",
        text2: "Please wait for Superadmin verification to activate your account.",
      });
      setTimeout(() => router.replace("/"), 2000);
    } catch (error) {
      console.error("Registration failed:", error);
      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2:
          error instanceof Error
            ? error.message
            : "Could not submit registration. Check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const displayedDraftError =
    draftError ||
    (!draftId
      ? "Signup details are missing. Please return and try again."
      : null);

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cardContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.titleText}>Review Details</Text>
            <Text style={styles.subtitleText}>
              Please ensure all information and your ID are clear before
              submitting.
            </Text>

            {isLoadingDraft && draftId ? (
              <View style={styles.draftMessage}>
                <ActivityIndicator color="#2563EB" />
                <Text style={styles.draftMessageText}>Loading signup details…</Text>
              </View>
            ) : displayedDraftError ? (
              <View style={styles.draftMessage}>
                <Text style={styles.draftErrorText}>{displayedDraftError}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Return to Signup</Text>
                </TouchableOpacity>
              </View>
            ) : draft ? (
              <>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {draft.firstName} {draft.lastName}
                </Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Contact Number</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {draft.contactNumber}
                </Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>{draft.email}</Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Registered Role</Text>
              <View style={styles.roleBox}>
                <Text style={styles.roleText}>{draft.role}</Text>
              </View>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={styles.label}>Scanned ID</Text>
              {draft.photoUri && !hasPhotoLoadError ? (
                <View style={styles.photoBox}>
                  <Image
                    source={{ uri: draft.photoUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                    onError={(event) => {
                      console.error(
                        "Could not display the captured signup ID:",
                        event.nativeEvent.error,
                      );
                      setHasPhotoLoadError(true);
                    }}
                  />
                </View>
              ) : (
                <Text style={{ color: "#EF4444", fontStyle: "italic" }}>
                  {hasPhotoLoadError
                    ? "The captured ID image could not be displayed. Go back and scan it again."
                    : "No ID photo provided."}
                </Text>
              )}
            </View>

            <View style={{ gap: 12, marginTop: "auto" }}>
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isSubmitting || hasPhotoLoadError}
                style={[styles.confirmButton, isSubmitting && { opacity: 0.7 }]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm & Submit</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isSubmitting}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>Go Back & Edit</Text>
              </TouchableOpacity>
            </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "88%",
    maxHeight: "90%",
    marginVertical: 20,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  titleText: {
    fontWeight: "bold",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 4,
    color: "#1F2937",
  },
  subtitleText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 20,
  },
  draftMessage: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 28,
  },
  draftMessageText: { color: "#6B7280", fontSize: 14 },
  draftErrorText: { color: "#B91C1C", fontSize: 14, textAlign: "center" },
  fieldContainer: { marginBottom: 14 },
  label: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  valueBox: { backgroundColor: "#F3F4F6", padding: 12, borderRadius: 8 },
  valueText: { color: "#1F2937", fontSize: 16, fontWeight: "600" },
  roleBox: { backgroundColor: "#EFF6FF", padding: 12, borderRadius: 8 },
  roleText: { color: "#2563EB", fontSize: 16, fontWeight: "bold" },
  photoBox: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  previewImage: { width: "100%", height: "100%" },
  confirmButton: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonText: { color: "#ffffff", fontWeight: "bold", fontSize: 16 },
  backButton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: { color: "#374151", fontWeight: "bold", fontSize: 16 },
});
