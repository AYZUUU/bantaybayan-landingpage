import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

export default function Preview() {
  const params = useLocalSearchParams();
  const { firstName, lastName, contactNumber, email, role, photo } = params;

  const handleConfirm = async () => {
    try {
      // 1. Create a FormData object to bundle text data and the image file together
      const formData = new FormData();
      formData.append("first_name", firstName as string);
      formData.append("last_name", lastName as string);
      formData.append("contact_number", contactNumber as string);
      formData.append("email", email as string);
      formData.append("role", role as string);

      // 2. Format the image URI for React Native's FormData upload
      if (photo) {
        const uriParts = (photo as string).split(".");
        const fileType = uriParts[uriParts.length - 1];

        formData.append("user_id_photo", {
          uri: photo as string,
          name: `id_${Date.now()}.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      // 3. Send package to your backend PHP endpoint
      const response = await fetch("http://192.168.100.108/api/registerUser.php", {
        method: "POST",
        body: formData,
        headers: {
          "Accept": "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      const result = await response.json();

      if (result.status === "success") {
        Alert.alert(
          "Registration Submitted",
          "Your account details and ID have been securely submitted. Please wait for Superadmin verification to activate your account.",
          [
            {
              text: "Understood",
              onPress: () => {
                router.replace("/"); 
              },
            },
          ]
        );
      } else {
        Alert.alert("Registration Failed", result.message || "Something went wrong.");
      }
    } catch (error) {
      console.error("Network or Server Error:", error);
      Alert.alert("Error", "Could not connect to the server. Check your network connection.");
    }
  };

  return (
    <LinearGradient colors={["#ffffff", "#4D8BE2"]} style={styles.gradientBackground}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.title}>Review Details</Text>
            <Text style={styles.subtitle}>
              Please ensure all information and your ID are clear before submitting.
            </Text>

            {/* Display Data */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>
                  {firstName} {lastName}
                </Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Contact Number</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>{contactNumber}</Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>{email}</Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Registered Role</Text>
              <View style={styles.roleBox}>
                <Text style={styles.roleText}>{role}</Text>
              </View>
            </View>

            <View style={styles.idContainer}>
              <Text style={styles.label}>Scanned ID</Text>
              {photo ? (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: photo as string }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <Text style={styles.noImageText}>No ID photo provided.</Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={handleConfirm}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmText}>Confirm & Submit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Text style={styles.backText}>Go Back & Edit</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    width: "85%",
    marginVertical: 20,
    padding: 24,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  title: {
    fontWeight: "bold",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 8,
    color: "#1f2937",
  },
  subtitle: {
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 24,
    fontSize: 14,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    fontWeight: "bold",
  },
  valueBox: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  valueText: {
    color: "#1f2937",
    fontSize: 18,
    fontWeight: "600",
  },
  roleBox: {
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  roleText: {
    color: "#2563eb",
    fontSize: 18,
    fontWeight: "bold",
  },
  idContainer: {
    marginBottom: 32,
  },
  imageWrapper: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    height: 192,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  noImageText: {
    color: "#ef4444",
    fontStyle: "italic",
    marginTop: 8,
  },
  actionsContainer: {
    marginTop: "auto",
    gap: 12,
  },
  confirmButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 18,
  },
  backButton: {
    backgroundColor: "#e5e7eb",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    color: "#374151",
    fontWeight: "bold",
    fontSize: 18,
  },
});