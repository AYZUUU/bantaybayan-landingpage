import { Redirect } from "expo-router";
import { useAuth } from "../../shared/auth";

export default function TabsIndex() {
  const { isAuthReady, isLoggedIn, userRole } = useAuth();

  if (!isAuthReady) return null;
  if (!isLoggedIn) return <Redirect href="/tabs/reporting" />;

  return (
    <Redirect
      href={
        userRole?.toLowerCase() === "responder"
          ? "/tabs/rescuer"
          : "/tabs/reporting"
      }
    />
  );
}
