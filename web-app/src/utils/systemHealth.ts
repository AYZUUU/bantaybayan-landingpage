import { supabase } from "./supabase";

export interface HealthCheck {
  name: string;
  status: "checking" | "operational" | "unavailable";
  details: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const { error } = await supabase
    .from("reports")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  if (error) {
    return {
      name: "Supabase database",
      status: "unavailable",
      details: error.message,
    };
  }
  return {
    name: "Supabase database",
    status: "operational",
    details: "Authenticated report query succeeded.",
  };
}

async function checkStorage(): Promise<HealthCheck> {
  const { error } = await supabase.storage
    .from("incident-evidence")
    .list("", { limit: 1 });
  if (error) {
    return {
      name: "Supabase storage",
      status: "unavailable",
      details: error.message,
    };
  }
  return {
    name: "Supabase storage",
    status: "operational",
    details: "Private evidence bucket is reachable.",
  };
}

async function checkFunction(functionName: string): Promise<HealthCheck> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    return {
      name: `${functionName} Edge Function`,
      status: "unavailable",
      details: "VITE_SUPABASE_URL is not configured.",
    };
  }

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/${functionName}`,
      {
        method: "OPTIONS",
        headers: {
          Origin: window.location.origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers":
            "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
        },
      },
    );
    if (!response.ok) {
      return {
        name: `${functionName} Edge Function`,
        status: "unavailable",
        details: `Preflight returned HTTP ${response.status}.`,
      };
    }
    const allowedHeaders =
      response.headers.get("Access-Control-Allow-Headers")?.toLowerCase() || "";
    if (
      !allowedHeaders.includes("x-client-info") ||
      !allowedHeaders.includes("x-supabase-api-version")
    ) {
      return {
        name: `${functionName} Edge Function`,
        status: "unavailable",
        details: "The function is reachable but its CORS headers are incomplete.",
      };
    }

    return {
      name: `${functionName} Edge Function`,
      status: "operational",
      details: "Function endpoint and browser preflight are reachable.",
    };
  } catch (error) {
    return {
      name: `${functionName} Edge Function`,
      status: "unavailable",
      details:
        error instanceof Error ? error.message : "Could not reach the function.",
    };
  }
}

export async function getSystemHealthChecks(): Promise<HealthCheck[]> {
  return Promise.all([
    checkDatabase(),
    checkStorage(),
    checkFunction("manage-users"),
    checkFunction("register-user"),
    checkFunction("notify-report-event"),
  ]);
}
