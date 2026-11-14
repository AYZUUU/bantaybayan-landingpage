import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const exportDir = valueAfter("--export-dir") ??
  "C:\\xampp\\mysql\\data_recovery_copy_20261110\\migration-export";
const uploadsDir = valueAfter("--uploads-dir") ??
  "C:\\xampp\\htdocs\\api\\uploads";

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function readJsonLines(filePath) {
  const contents = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").trim();
  if (!contents) return [];

  return contents.split(/\r?\n/).map((line, index) => {
    try {
      const value = JSON.parse(line);
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("Expected a JSON object.");
      }
      return value;
    } catch (error) {
      throw new Error(
        `Invalid JSON at ${path.basename(filePath)} line ${index + 1}: ${
          error instanceof Error ? error.message : "unknown parse error"
        }`,
      );
    }
  });
}

function requiredId(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(`Invalid legacy ${label} ID.`);
  }
  return id;
}

function normalizedRole(value) {
  const role = String(value ?? "").trim().toLowerCase();
  if (!["citizen", "responder", "admin", "superadmin"].includes(role)) {
    throw new Error("An account has an unsupported legacy role.");
  }
  return role;
}

function localUploadPath(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  let relativePath = value.trim().replaceAll("\\", "/");
  try {
    const url = new URL(relativePath);
    relativePath = url.pathname;
  } catch {
    // The source may already be a relative API upload path.
  }

  const uploadsMarker = "/uploads/";
  const markerIndex = relativePath.toLowerCase().lastIndexOf(uploadsMarker);
  if (markerIndex >= 0) {
    relativePath = relativePath.slice(markerIndex + uploadsMarker.length);
  } else {
    relativePath = relativePath.replace(/^\/+/, "").replace(/^uploads\//i, "");
  }

  const root = path.resolve(uploadsDir);
  const candidate = path.resolve(root, relativePath);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("A legacy media path resolves outside the uploads directory.");
  }
  if (!existsSync(candidate)) {
    throw new Error(`A referenced legacy media file is missing: ${relative}`);
  }
  return candidate;
}

function getImageType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  const contentType = types[extension];
  if (!contentType) {
    throw new Error(`Unsupported image format: ${extension || "no extension"}`);
  }
  return { extension, contentType };
}

function validateData(users, reports) {
  const userIds = new Set();
  const userRoles = new Map();
  const emails = new Set();
  const roles = new Map();
  let bcryptHashes = 0;
  let accountsWithoutPasswordHash = 0;

  for (const user of users) {
    const id = requiredId(user.id, "user");
    if (userIds.has(id)) throw new Error("Duplicate legacy user ID.");
    userIds.add(id);

    const email = String(user.email ?? "").trim().toLowerCase();
    if (!email || emails.has(email)) {
      throw new Error("An account has a missing or duplicate email address.");
    }
    emails.add(email);

    const role = normalizedRole(user.role);
    userRoles.set(id, role);
    roles.set(role, (roles.get(role) ?? 0) + 1);
    if (user.password_hash) {
      if (!/^\$2[aby]\$\d\d\$/.test(user.password_hash)) {
        throw new Error(
          "A legacy password hash is not bcrypt-compatible; do not import until resolved.",
        );
      }
      bcryptHashes += 1;
    } else {
      accountsWithoutPasswordHash += 1;
    }

    for (const field of ["avatar_url", "photo_url"]) {
      const filePath = localUploadPath(user[field]);
      if (filePath) getImageType(filePath);
    }
  }

  const reportIds = new Set();
  for (const report of reports) {
    const id = requiredId(report.id, "report");
    if (reportIds.has(id)) throw new Error("Duplicate legacy report ID.");
    reportIds.add(id);

    if (report.user_id !== null && report.user_id !== undefined) {
      if (!userIds.has(requiredId(report.user_id, "report owner"))) {
        throw new Error("A report references an account missing from the export.");
      }
    }
    if (report.assigned_responder_id !== null && report.assigned_responder_id !== undefined) {
      const responderId = requiredId(report.assigned_responder_id, "responder");
      if (!userIds.has(responderId)) {
        throw new Error("A report references a responder missing from the export.");
      }
      if (userRoles.get(responderId) !== "responder") {
        throw new Error("A report assignment points to a non-responder account.");
      }
    }

    const filePath = localUploadPath(report.image_path);
    if (filePath) getImageType(filePath);
  }

  return {
    userIds,
    roles,
    bcryptHashes,
    accountsWithoutPasswordHash,
  };
}

const usersFile = path.join(exportDir, "users.ndjson");
const reportsFile = path.join(exportDir, "reports.ndjson");
const users = readJsonLines(usersFile);
const reports = readJsonLines(reportsFile);
const validation = validateData(users, reports);

if (!apply) {
  console.log("Dry run passed. No Supabase requests were made.");
  console.log(
    JSON.stringify({
      users: users.length,
      reports: reports.length,
      bcryptHashes: validation.bcryptHashes,
      accountsNeedingPasswordReset: validation.accountsWithoutPasswordHash,
      roles: Object.fromEntries(validation.roles),
      mediaFilesAvailable: true,
    }),
  );
  console.log("Use --apply only after applying the Supabase SQL migration.");
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SECRET_KEY in the local environment before applying the migration.",
  );
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function uploadLegacyImage(bucket, objectPath, rawPath) {
  const sourcePath = localUploadPath(rawPath);
  if (!sourcePath) return null;

  const { contentType } = getImageType(sourcePath);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, readFileSync(sourcePath), {
      contentType,
      upsert: true,
    });
  if (error) throw new Error(`Could not upload legacy media to ${bucket}.`);
  return data.path;
}

async function findImportedUser(legacyId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("legacy_account_source", "users")
    .eq("legacy_user_id", legacyId)
    .maybeSingle();
  if (error) throw new Error("Could not check the existing profile import.");
  return data?.id ?? null;
}

async function importUser(user) {
  const legacyId = requiredId(user.id, "user");
  const existingId = await findImportedUser(legacyId);
  const email = String(user.email).trim().toLowerCase();
  const role = normalizedRole(user.role);
  let authUserId = existingId;

  if (!authUserId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      ...(user.password_hash
        ? { password_hash: user.password_hash }
        : { password: randomBytes(36).toString("base64url") }),
      user_metadata: {
        first_name: String(user.first_name ?? ""),
        last_name: String(user.last_name ?? ""),
        contact_number: String(user.contact_number ?? ""),
        role: "citizen",
        migration_source: "xampp",
        legacy_user_id: legacyId,
      },
    });
    if (error || !data.user) {
      throw new Error(
        `Could not import legacy user ${legacyId}${
          error ? ` (${error.code ?? "Supabase error"})` : ""
        }.`,
      );
    }
    authUserId = data.user.id;
  }

  const avatarPath = await uploadLegacyImage(
    "avatars",
    `${authUserId}/legacy_avatar.${getImageType(localUploadPath(user.avatar_url) ?? "avatar.jpg").extension.slice(1)}`,
    user.avatar_url,
  );
  const idPhotoPath = await uploadLegacyImage(
    "id-photos",
    `${authUserId}/legacy_id_photo.${getImageType(localUploadPath(user.photo_url) ?? "id.jpg").extension.slice(1)}`,
    user.photo_url,
  );

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: authUserId,
      email,
      first_name: String(user.first_name ?? ""),
      last_name: String(user.last_name ?? ""),
      contact_number: String(user.contact_number ?? ""),
      role,
      status: String(user.status ?? "active").trim().toLowerCase() || "active",
      password_reset_required: !user.password_hash,
      is_verified: Boolean(Number(user.is_verified)),
      station: user.station ? String(user.station) : null,
      avatar_path: avatarPath,
      id_photo_path: idPhotoPath,
      legacy_avatar_url: user.avatar_url ?? null,
      legacy_id_photo_url: user.photo_url ?? null,
      legacy_user_id: legacyId,
      legacy_account_source: "users",
      created_at: user.created_at || new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) {
    throw new Error(`Could not save legacy profile ${legacyId}.`);
  }

  return {
    legacyId,
    id: authUserId,
    role,
    contactNumber: String(user.contact_number ?? ""),
  };
}

async function importReport(report, profileMap) {
  const legacyId = requiredId(report.id, "report");
  const oldUserId =
    report.user_id === null || report.user_id === undefined
      ? null
      : requiredId(report.user_id, "report owner");
  const oldResponderId =
    report.assigned_responder_id === null ||
    report.assigned_responder_id === undefined
      ? null
      : requiredId(report.assigned_responder_id, "responder");
  const user = oldUserId === null ? null : profileMap.get(oldUserId);
  const responder =
    oldResponderId === null ? null : profileMap.get(oldResponderId);
  const imagePath = await uploadLegacyImage(
    "incident-evidence",
    `${user?.id ?? "legacy"}/report_${legacyId}.${getImageType(localUploadPath(report.image_path) ?? "evidence.jpg").extension.slice(1)}`,
    report.image_path,
  );

  const { error } = await supabase.from("reports").upsert(
    {
      id: legacyId,
      legacy_report_id: legacyId,
      user_id: user?.id ?? null,
      reporter_name: report.reporter_name ?? null,
      contact_number: user?.contactNumber || null,
      emergency_type: report.emergency_type ?? null,
      accident_level: report.accident_level ?? null,
      description: report.description ?? null,
      latitude:
        report.latitude === null || report.latitude === undefined
          ? null
          : Number(report.latitude),
      longitude:
        report.longitude === null || report.longitude === undefined
          ? null
          : Number(report.longitude),
      image_path: imagePath,
      legacy_image_path: report.image_path ?? null,
      status: String(report.status ?? "Pending").trim() || "Pending",
      assigned_responder_id: responder?.id ?? null,
      municipality: report.municipality ?? null,
      province: report.province ?? null,
      created_at: report.created_at || new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    throw new Error(`Could not import legacy report ${legacyId}.`);
  }
}

const profileMap = new Map();
for (const user of users) {
  const imported = await importUser(user);
  profileMap.set(imported.legacyId, imported);
}

for (const report of reports) {
  await importReport(report, profileMap);
}

const { error: sequenceError } = await supabase.rpc(
  "reset_report_id_sequence",
);
if (sequenceError) {
  throw new Error("Imported records, but could not reset the report ID sequence.");
}

console.log(
  JSON.stringify({
    importedUsers: users.length,
    importedReports: reports.length,
    accountsNeedingPasswordReset: validation.accountsWithoutPasswordHash,
  }),
);
