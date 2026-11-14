import type { SupabaseClient } from "@supabase/supabase-js";

export async function getVerifiedTotpFactor(client: SupabaseClient) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp[0] ?? null;
}

export async function needsTotpChallenge(client: SupabaseClient) {
  const [{ data: assurance, error: assuranceError }, factor] =
    await Promise.all([
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
      getVerifiedTotpFactor(client),
    ]);
  if (assuranceError) throw assuranceError;
  return Boolean(
    factor &&
      assurance.nextLevel === "aal2" &&
      assurance.currentLevel !== "aal2",
  );
}

export async function verifyTotpCode(
  client: SupabaseClient,
  factorId: string,
  code: string,
) {
  const { error } = await client.auth.mfa.challengeAndVerify({
    factorId,
    code: code.replace(/\s/g, ""),
  });
  if (error) throw error;
}

export async function startTotpEnrollment(
  client: SupabaseClient,
  friendlyName: string,
) {
  const { data: existingFactors, error: factorsError } =
    await client.auth.mfa.listFactors();
  if (factorsError) throw factorsError;
  for (const factor of existingFactors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      const { error } = await client.auth.mfa.unenroll({
        factorId: factor.id,
      });
      if (error) throw error;
    }
  }

  const { data, error } = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
    issuer: "BantayBayan",
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export function getTotpQrSvg(qrCode: string) {
  const separator = qrCode.indexOf(",");
  if (separator < 0) throw new Error("Authenticator QR code is invalid.");
  return decodeURIComponent(qrCode.slice(separator + 1));
}

export async function verifyNewTotpFactor(
  client: SupabaseClient,
  factorId: string,
  code: string,
) {
  const { data: challenge, error: challengeError } =
    await client.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await client.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.replace(/\s/g, ""),
  });
  if (verifyError) throw verifyError;
}

export async function removeTotpFactor(client: SupabaseClient, factorId: string) {
  const { error } = await client.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}
