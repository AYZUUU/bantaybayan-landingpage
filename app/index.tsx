import { LinearGradient } from "expo-linear-gradient";
import { Link, router } from "expo-router";
import { Image, ImageBackground, Pressable, Text, View } from "react-native";
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
          <View className="justify-center items-center">
            <Image
              source={require("../assets/images/bantaybayan.png")}
              className="w-56 h-56"
              resizeMode="contain"
            />

            <Text
              className="text-primary font-bold text-2xl mb-10"
              style={{
                textShadowColor: "rgba(0,0,0,0.9)",
                textShadowOffset: { width: 0.5, height: 0.5 },
                textShadowRadius: 1,
              }}
            >
              Welcome To BantayBayan
            </Text>
            {
              [
                /* box for report incident */
              ]
            }
            <Link href="/tabs/reporting">
              <View className="bg-box items-center mt-20 object-center w-48 h-52 rounded-2xl">
                <Image
                  source={require("../assets/report.png")}
                  className="w-40 h-40 mb-2 mr-4"
                />
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 18 }}
                >
                  Report an Incident
                </Text>
              </View>
            </Link>

            <Pressable onPress={() => router.push("/login")}>
              <Text className="bg-primary bg-container font-bold text-center text-box text-2xl px-7 py-3 rounded-2xl mt-40  p-4 shadow-lg">
                Login/Signup
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
}
