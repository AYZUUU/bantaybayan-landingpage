import { useEffect } from "react";
import { AppState } from "react-native";

export function useActivePolling(
  enabled: boolean,
  callback: () => Promise<void>,
  intervalMs = 5000,
) {
  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let inFlight = false;
    let appState = AppState.currentState;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (
        stopped ||
        inFlight ||
        appState !== "active" ||
        timeout !== null
      ) {
        return;
      }

      timeout = setTimeout(() => {
        timeout = null;
        void poll();
      }, intervalMs);
    };

    const poll = async () => {
      if (stopped || inFlight || appState !== "active") return;

      inFlight = true;
      try {
        await callback();
      } catch (error) {
        console.error("Active polling failed:", error);
      } finally {
        inFlight = false;
        scheduleNext();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        appState = nextState;
        if (nextState === "active") {
          void poll();
        } else if (timeout !== null) {
          clearTimeout(timeout);
          timeout = null;
        }
      },
    );

    if (appState === "active") void poll();

    return () => {
      stopped = true;
      if (timeout !== null) clearTimeout(timeout);
      appStateSubscription.remove();
    };
  }, [callback, enabled, intervalMs]);
}
