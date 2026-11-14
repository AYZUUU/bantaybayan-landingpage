import { supabase } from "./supabase";
import { getCachedSignedStorageUrl } from "./storageUrls";

export async function getFunctionErrorMessage(error: {
  message: string;
  context?: unknown;
}): Promise<string> {
  if (error.context instanceof Response) {
    const body: unknown = await error.context
      .clone()
      .json()
      .catch(() => null);
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  }
  return error.message;
}

export interface ManagedUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  role: string;
  status: string;
  station: string | null;
  created_at: string;
  photo_url: string | null;
}

export async function getManagedUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, contact_number, role, status, station, created_at, id_photo_path",
    )
    .in("role", ["citizen", "responder", "admin", "superadmin"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Supabase returned no account data.");

  return Promise.all(
    data.map(async (user) => {
      if (!user.id_photo_path) return { ...user, photo_url: null };
      try {
        const photoUrl = await getCachedSignedStorageUrl(
          "id-photos",
          user.id_photo_path,
        );
        return { ...user, photo_url: photoUrl };
      } catch (error) {
        console.error(
          `Could not load the ID document for account ${user.id}:`,
          error,
        );
        return { ...user, photo_url: null };
      }
    }),
  );
}

export async function manageUser(
  body: Record<string, string | null>,
) {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body,
  });
  if (error) throw new Error(await getFunctionErrorMessage(error));
  if (
    !data ||
    typeof data !== "object" ||
    !("id" in data) ||
    typeof data.id !== "string"
  ) {
    throw new Error("User management returned an invalid response.");
  }
  return data.id;
}
