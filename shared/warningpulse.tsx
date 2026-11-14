import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function WarningPulse({ size = 128 }: { size?: number }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [opacity] = useState(() => new Animated.Value(0.7));
  const centerSize = size * 0.52;
  const maximumScale = size <= 80 ? 1.2 : 1.5;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: maximumScale,
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
  }, [maximumScale, scale, opacity]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          { transform: [{ scale }], opacity },
        ]}
      />
      <View
        style={[
          styles.centerButton,
          {
            width: centerSize,
            height: centerSize,
            borderRadius: centerSize / 2,
          },
        ]}
      >
        <Text style={[styles.buttonText, { fontSize: centerSize * 0.58 }]}>
          !
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    top: 0,
    left: 0,
    borderWidth: 3,
    borderColor: "#EF4444",
  },
  centerButton: {
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
    fontWeight: "900",
  },
});