import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Animated,
  Appearance,
  StyleSheet,
  View,
  useColorScheme,
  type ColorSchemeName,
} from "react-native";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const APP_PREFERENCES_STORAGE_KEY = "bantaybayan_app_preferences";

export interface AppPreferences {
  theme: "system" | "light" | "dark";
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  theme: "system",
  notificationsEnabled: true,
  soundEnabled: true,
};

interface AppPreferencesContextValue {
  preferences: AppPreferences;
  updatePreference: <K extends keyof AppPreferences>(
    key: K,
    value: AppPreferences[K],
  ) => Promise<void>;
}

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | undefined>(undefined);

function isAppPreferences(value: unknown): value is AppPreferences {
  if (typeof value !== "object" || value === null) return false;
  const preferences = value as Partial<AppPreferences>;
  return (
    (preferences.theme === "system" ||
      preferences.theme === "light" ||
      preferences.theme === "dark") &&
    typeof preferences.notificationsEnabled === "boolean" &&
    typeof preferences.soundEnabled === "boolean"
  );
}

export function AppPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const colorScheme = useColorScheme();
  const [preferences, setPreferences] =
    useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [transitionColor, setTransitionColor] = useState("#ffffff");
  const [isTransitionVisible, setIsTransitionVisible] = useState(false);
  const [transitionOpacity] = useState(() => new Animated.Value(0));
  const transitionFrame = useRef<number | null>(null);
  const lastColorScheme = useRef(colorScheme);

  const animateAppearanceChange = useCallback(
    (previousColorScheme: ColorSchemeName | null) => {
      if (transitionFrame.current !== null) {
        cancelAnimationFrame(transitionFrame.current);
      }
      transitionOpacity.stopAnimation();
      transitionOpacity.setValue(1);
      setTransitionColor(previousColorScheme === "dark" ? "#0f172a" : "#ffffff");
      setIsTransitionVisible(true);
      transitionFrame.current = requestAnimationFrame(() => {
        transitionFrame.current = null;
        Animated.timing(transitionOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setIsTransitionVisible(false);
        });
      });
    },
    [transitionOpacity],
  );

  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(
          APP_PREFERENCES_STORAGE_KEY,
        );
        if (!storedValue) return;

        const storedPreferences: unknown = JSON.parse(storedValue);
        if (!isAppPreferences(storedPreferences)) {
          throw new Error("Saved app preferences are invalid.");
        }

        if (active) setPreferences(storedPreferences);
      } catch (error) {
        console.error("Failed to load app preferences:", error);
      }
    };

    void loadPreferences();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(
      preferences.theme === "system" ? "unspecified" : preferences.theme,
    );
  }, [preferences.theme]);

  useEffect(() => {
    lastColorScheme.current = colorScheme;
  }, [colorScheme]);

  useEffect(() => {
    if (preferences.theme !== "system") return;

    const subscription = Appearance.addChangeListener(({ colorScheme: nextColorScheme }) => {
      if (nextColorScheme !== lastColorScheme.current) {
        animateAppearanceChange(lastColorScheme.current);
        lastColorScheme.current = nextColorScheme;
      }
    });

    return () => subscription.remove();
  }, [animateAppearanceChange, preferences.theme]);

  useEffect(
    () => () => {
      if (transitionFrame.current !== null) {
        cancelAnimationFrame(transitionFrame.current);
      }
      transitionOpacity.stopAnimation();
    },
    [transitionOpacity],
  );

  const updatePreference = useCallback(
    async <K extends keyof AppPreferences>(
      key: K,
      value: AppPreferences[K],
    ) => {
      if (key === "theme" && value !== preferences.theme) {
        animateAppearanceChange(colorScheme);
      }
      const nextPreferences = { ...preferences, [key]: value };
      await AsyncStorage.setItem(
        APP_PREFERENCES_STORAGE_KEY,
        JSON.stringify(nextPreferences),
      );
      setPreferences(nextPreferences);
    },
    [animateAppearanceChange, colorScheme, preferences],
  );

  return (
    <AppPreferencesContext.Provider value={{ preferences, updatePreference }}>
      <View style={styles.provider}>
        {children}
        {isTransitionVisible && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.transitionCover,
              {
                backgroundColor: transitionColor,
                opacity: transitionOpacity,
              },
            ]}
          />
        )}
      </View>
    </AppPreferencesContext.Provider>
  );
}

const styles = StyleSheet.create({
  provider: { flex: 1 },
  transitionCover: { zIndex: 1000 },
});

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error(
      "useAppPreferences must be used within an AppPreferencesProvider",
    );
  }
  return context;
}
