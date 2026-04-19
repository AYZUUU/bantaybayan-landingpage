import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

export default function WarningPulse() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  const report = useState();

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
    <View className="w-32 h-32 items-center justify-center mb-4">
      <Animated.View
        className="absolute w-32 h-32 rounded-full border-4 border-red-500"
        style={{ transform: [{ scale }], opacity }}
      />
      <View className="w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-lg">
        <Text className="text-white text-4xl font-black">!</Text>
      </View>
    </View>
  );
}
