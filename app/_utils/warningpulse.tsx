import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function WarningPulse() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    anim.start();
    return () => anim.stop();
  }, [scale, opacity]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pulseRing,
          { transform: [{ scale }], opacity },
        ]}
      />
      <View style={styles.centerButton}>
        <Text style={styles.buttonText}>!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 128,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pulseRing: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: "#EF4444",
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
  },
});