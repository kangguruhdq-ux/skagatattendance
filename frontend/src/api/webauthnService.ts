import { client, apiCall } from "./client";

export function isBiometricSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function getBiometricStatus() {
  return apiCall<{ enrolled: boolean; devices: { id: number; label: string; created_at: string }[] }>(
    client.get("/api/biometric/status")
  );
}

/** Runs the full WebAuthn registration ceremony (browser will prompt for fingerprint/Face ID/PIN). */
export async function enrollBiometric(deviceLabel: string): Promise<void> {
  const options = await apiCall<any>(client.post("/api/biometric/register/options"));

  const publicKey: CredentialCreationOptions["publicKey"] = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64urlToBuffer(options.user.id),
    },
    excludeCredentials: (options.excludeCredentials || []).map((c: any) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  if (!credential) throw new Error("Biometric enrollment was cancelled.");

  const response = credential.response as AuthenticatorAttestationResponse;

  await apiCall(
    client.post("/api/biometric/register/verify", {
      id: credential.id,
      type: credential.type,
      device_label: deviceLabel,
      response: {
        clientDataJSON: bufferToBase64url(response.clientDataJSON),
        attestationObject: bufferToBase64url(response.attestationObject),
      },
    })
  );
}

/** Runs the full WebAuthn authentication ceremony and returns a short-lived
 * biometric_token to submit alongside the attendance scan. */
export async function verifyBiometric(): Promise<string> {
  const options = await apiCall<any>(client.post("/api/biometric/authenticate/options"));

  const publicKey: CredentialRequestOptions["publicKey"] = {
    ...options,
    challenge: base64urlToBuffer(options.challenge),
    allowCredentials: (options.allowCredentials || []).map((c: any) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    })),
  };

  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
  if (!assertion) throw new Error("Biometric verification was cancelled.");

  const response = assertion.response as AuthenticatorAssertionResponse;

  const result = await apiCall<{ verified: boolean; biometric_token: string }>(
    client.post("/api/biometric/authenticate/verify", {
      id: assertion.id,
      type: assertion.type,
      response: {
        clientDataJSON: bufferToBase64url(response.clientDataJSON),
        authenticatorData: bufferToBase64url(response.authenticatorData),
        signature: bufferToBase64url(response.signature),
      },
    })
  );
  return result.biometric_token;
}
