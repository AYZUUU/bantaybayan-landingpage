import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredText(value: FormDataEntryValue | null, field: string, maximum: number) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`Invalid ${field}.`);
  }
  return value.trim();
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }
  const contentLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > 6 * 1024 * 1024) {
    return respond(413, { error: "The registration request exceeds the 6 MB limit." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Registration function environment is incomplete.");
    return respond(500, { error: "Registration is not configured." });
  }

  let userId: string | null = null;
  let photoPath: string | null = null;
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const form = await request.formData();
    const firstName = requiredText(form.get("first_name"), "first name", 100);
    const lastName = requiredText(form.get("last_name"), "last name", 100);
    const contactNumber = requiredText(form.get("contact_number"), "contact number", 40);
    const email = requiredText(form.get("email"), "email", 320).toLowerCase();
    const passwordValue = form.get("password");
    if (
      typeof passwordValue !== "string" ||
      !passwordValue.length ||
      passwordValue.length > 128
    ) {
      throw new Error("Invalid password.");
    }
    const password = passwordValue;
    const role = requiredText(form.get("role"), "role", 20).toLowerCase();
    const photo = form.get("photo");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return respond(400, { error: "Enter a valid email and an 8-character password." });
    }
    if (role !== "citizen" && role !== "responder") {
      return respond(400, { error: "Select a valid account role." });
    }
    if (!(photo instanceof File) || photo.size === 0 || photo.size > 5 * 1024 * 1024) {
      return respond(400, { error: "A valid ID image up to 5 MB is required." });
    }
    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensionByType[photo.type];
    if (!extension) {
      return respond(400, { error: "ID images must be JPEG, PNG, or WebP." });
    }

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          contact_number: contactNumber,
          migration_source: "public-registration",
        },
      });
    if (createError || !created.user) {
      return respond(400, {
        error: createError?.message || "Could not create the account.",
      });
    }
    userId = created.user.id;

    photoPath = `${userId}/registration-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await adminClient.storage
      .from("id-photos")
      .upload(photoPath, photo, {
        contentType: photo.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        contact_number: contactNumber,
        role,
        status: "pending",
        id_photo_path: photoPath,
      })
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    if (profileError || !profile) {
      throw profileError || new Error("The new account profile was not created.");
    }

    return respond(200, {
      message: "Registration submitted for administrator approval.",
    });
  } catch (error) {
    if (photoPath) {
      const { error: cleanupError } = await adminClient.storage
        .from("id-photos")
        .remove([photoPath]);
      if (cleanupError) {
        console.error("Could not remove the incomplete registration ID image.");
      }
    }
    if (userId) {
      const { error: cleanupError } =
        await adminClient.auth.admin.deleteUser(userId);
      if (cleanupError) {
        console.error("Could not remove the incomplete registration account.");
      }
    }
    if (error instanceof Error && error.message.startsWith("Invalid ")) {
      return respond(400, { error: error.message });
    }
    console.error(
      "Registration request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return respond(500, { error: "Could not submit registration." });
  }
});
