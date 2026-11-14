import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <ImageBackground
        source={require("../assets/images/bantaybayan.png")}
        style={{ flex: 1, width: "100%", height: "100%" }}
        resizeMode="cover"
        imageStyle={{
          opacity: 0.2,
          transform: [{ translateX: 200 }, { translateY: 1 }],
        }}
      >
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.6)", "rgba(77, 139, 226, 0.6)"]}
          style={{ flex: 1 }}
        >
          <View style={styles.centerContainer}>
            <Image
              source={require("../assets/images/bantaybayan.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />

            <Text
              style={[
                styles.welcomeText,
                {
                  textShadowColor: "rgba(0,0,0,0.9)",
                  textShadowOffset: { width: 0.5, height: 0.5 },
                  textShadowRadius: 1,
                },
              ]}
            >
              Welcome To BantayBayan
            </Text>

            <Link href="/tabs/reporting" asChild>
              <Pressable style={styles.reportBox}>
                <Image
                  source={require("../assets/report.png")}
                  style={styles.reportIcon}
                  resizeMode="contain"
                />
                <Text style={styles.reportText}>
                  Report an Incident
                </Text>
              </Pressable>
            </Link>

            <Pressable onPress={() => router.push("/login")}>
              <View style={styles.loginButton}>
                <Text style={styles.loginButtonText}>
                  Login/Signup
                </Text>
              </View>
            </Pressable>
          </View>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 300,
    height: 300,
  },
  welcomeText: {
    color: "#FFFFFF", // primary
    fontWeight: "bold",
    fontSize: 24, // text-2xl
    marginBottom: 20, // mb-10
  },
  reportBox: {
    backgroundColor: "#2A4C7C", // box color
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10, // mt-20
    width: 192, // w-48
    height: 208, // h-52
    borderRadius: 16, // rounded-2xl
  },
  reportIcon: {
    width: 160, // w-40
    height: 160, // h-40
    marginBottom: 8, // mb-2
    marginRight: 16, // mr-4
  },
  reportText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: "#FFFFFF", // primary
    borderRadius: 16, // rounded-2xl
    marginTop: 40, // mt-40
    paddingHorizontal: 28, // px-7
    paddingVertical: 12, // py-3
    padding: 16, // p-4
    elevation: 5, // shadow-lg
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loginButtonText: {
    color: "#2A4C7C", // text-box
    fontSize: 24, // text-2xl
    fontWeight: "bold",
    textAlign: "center",
  },
});