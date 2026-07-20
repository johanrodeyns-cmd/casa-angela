// APsystems OpenAPI signature helpers (US-CA).
// HMAC-SHA256-ondertekening van requests naar https://api.apsystemsema.com:9282.
// Pure functies: enkel globalThis.crypto + TextEncoder + btoa (Node ≥19 + browser).

const CA_SIGN_METHOD = "HmacSHA256";

// RequestPath is het laatste pad-segment van de volledige URL/path — query en fragment
// worden eerst gestript.
// Voorbeeld: "/installer/api/v2/systems/summary/AZ02849ADDFC" → "AZ02849ADDFC".
export function extractRequestPath(fullPath) {
  if (typeof fullPath !== "string") return "";
  const noQuery = fullPath.split("?")[0].split("#")[0];
  const parts = noQuery.split("/").filter((s) => s.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

// 32 lowercase hex chars — geldige UUID v4 zonder dashes, zoals APsystems' doc-voorbeeld
// "5e36eab8295911ee90751eff13c2920b". Hun server parsed waarschijnlijk met UUID-validatie,
// dus puur-random hex (zonder version/variant bits) doet hun Tomcat servlet crashen met 500.
// RFC 4122 v4: byte 6 high-nibble = 4, byte 8 high-nibble ∈ {8, 9, a, b}.
export function generateNonce() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

// Exact in deze volgorde, gescheiden door "/" — afwijken faalt server-side stil.
export function buildStringToSign(timestamp, nonce, appId, requestPath, method, signMethod) {
  return `${timestamp}/${nonce}/${appId}/${requestPath}/${method}/${signMethod}`;
}

// HMAC(stringToSign, appSecret), base64-encoded.
// hashAlgo: "SHA-256" (default) of "SHA-1" — APsystems doc §2.2.2 ondersteunt beide.
export async function computeSignature(stringToSign, appSecret, hashAlgo = "SHA-256") {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(appSecret),
    { name: "HMAC", hash: hashAlgo },
    false,
    ["sign"],
  );
  const buf = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(stringToSign));
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return globalThis.btoa(binary);
}

// Vertaalt een X-CA-Signature-Method waarde naar de Web Crypto hash-naam.
function hashAlgoForSignMethod(signMethod) {
  return signMethod === "HmacSHA1" ? "SHA-1" : "SHA-256";
}

// Bouwt het volledige header-object voor één APsystems request.
// opts.now / opts.nonce zijn injectable zodat tests deterministisch zijn.
// opts.signMethod: "HmacSHA256" (default) of "HmacSHA1".
export async function buildHeaders(appId, appSecret, requestPath, method, opts = {}) {
  const timestamp = String(opts.now ?? Date.now());
  const nonce = opts.nonce ?? generateNonce();
  const signMethod = opts.signMethod ?? CA_SIGN_METHOD;
  const stringToSign = buildStringToSign(timestamp, nonce, appId, requestPath, method, signMethod);
  const signature = await computeSignature(stringToSign, appSecret, hashAlgoForSignMethod(signMethod));
  return {
    "X-CA-AppId": appId,
    "X-CA-Timestamp": timestamp,
    "X-CA-Nonce": nonce,
    "X-CA-Signature-Method": signMethod,
    "X-CA-Signature": signature,
  };
}
