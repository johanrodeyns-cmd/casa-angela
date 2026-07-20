import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  extractRequestPath,
  generateNonce,
  buildStringToSign,
  computeSignature,
  buildHeaders,
} from "../lib/apsystemsSign.js";

test("extractRequestPath — laatste pad-segment voor APsystems signature", async (t) => {
  await t.test("normale endpoint-path met SID", () => {
    assert.equal(
      extractRequestPath("/installer/api/v2/systems/summary/AZ02849ADDFC"),
      "AZ02849ADDFC",
    );
  });

  await t.test("path zonder leading slash", () => {
    assert.equal(extractRequestPath("installer/api/v2/systems"), "systems");
  });

  await t.test("trailing slash wordt genegeerd", () => {
    assert.equal(extractRequestPath("/installer/api/v2/systems/"), "systems");
  });

  await t.test("query string en fragment worden gestript", () => {
    assert.equal(
      extractRequestPath(
        "/installer/api/v2/systems/AZ/devices/ecu/energy/EID456?energy_level=minutely&date_range=2026-05-26",
      ),
      "EID456",
    );
    assert.equal(extractRequestPath("/foo/bar#section"), "bar");
  });

  await t.test("lege of niet-string input → lege string (defensief)", () => {
    assert.equal(extractRequestPath(""), "");
    assert.equal(extractRequestPath(null), "");
    assert.equal(extractRequestPath(undefined), "");
  });
});

test("generateNonce — geldige UUID v4 zonder dashes (US-CA)", async (t) => {
  await t.test("lengte = 32 en alleen [0-9a-f]", () => {
    const n = generateNonce();
    assert.equal(n.length, 32);
    assert.match(n, /^[0-9a-f]{32}$/);
  });

  await t.test("RFC 4122 v4: pos 12 = '4', pos 16 ∈ {8,9,a,b}", () => {
    // 100 nonces om statistisch zeker te zijn dat de bits ALTIJD correct gezet zijn.
    for (let i = 0; i < 100; i++) {
      const n = generateNonce();
      assert.equal(n[12], "4", `versie-nibble fout in ${n}`);
      assert.match(n[16], /^[89ab]$/, `variant-nibble fout in ${n}`);
    }
  });

  await t.test("opeenvolgende calls verschillen (random entropy)", () => {
    const a = generateNonce();
    const b = generateNonce();
    assert.notEqual(a, b);
  });
});

test("buildStringToSign — exacte concat met /-scheiding (US-CA)", () => {
  const s = buildStringToSign(
    "1700000000000",
    "deadbeefdeadbeefdeadbeefdeadbeef",
    "myAppId",
    "AZ02849ADDFC",
    "GET",
    "HmacSHA256",
  );
  assert.equal(
    s,
    "1700000000000/deadbeefdeadbeefdeadbeefdeadbeef/myAppId/AZ02849ADDFC/GET/HmacSHA256",
  );
});

test("computeSignature — HMAC-SHA256 base64 (US-CA)", async (t) => {
  await t.test("RFC 4231 test case 2 — gepinde verwachte waarde", async () => {
    // Publiek HMAC-SHA256 test-vector: key="Jefe", data="what do ya want for nothing?".
    // Verifieert dat onze Web Crypto-uitvoer overeenkomt met de standaard.
    const sig = await computeSignature("what do ya want for nothing?", "Jefe");
    assert.equal(sig, "W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM=");
  });

  await t.test("APsystems-vorm stringToSign → cross-check met node:crypto", async () => {
    const stringToSign =
      "1700000000000/deadbeefdeadbeefdeadbeefdeadbeef/myAppId/AZ02849ADDFC/GET/HmacSHA256";
    const secret = "test-secret-do-not-use";
    const expected = createHmac("sha256", secret).update(stringToSign).digest("base64");
    const actual = await computeSignature(stringToSign, secret);
    assert.equal(actual, expected);
  });

  await t.test("HmacSHA1 variant → cross-check met node:crypto", async () => {
    const stringToSign =
      "1700000000000/deadbeefdeadbeefdeadbeefdeadbeef/myAppId/AZ02849ADDFC/POST/HmacSHA1";
    const secret = "test-secret-do-not-use";
    const expected = createHmac("sha1", secret).update(stringToSign).digest("base64");
    const actual = await computeSignature(stringToSign, secret, "SHA-1");
    assert.equal(actual, expected);
  });
});

test("buildHeaders — volledig signed header-object (US-CA)", async (t) => {
  await t.test("met geïnjecteerde now+nonce → deterministische signature", async () => {
    const h = await buildHeaders("myAppId", "Jefe", "AZ02849ADDFC", "GET", {
      now: 1700000000000,
      nonce: "deadbeefdeadbeefdeadbeefdeadbeef",
    });
    assert.equal(h["X-CA-AppId"], "myAppId");
    assert.equal(h["X-CA-Timestamp"], "1700000000000");
    assert.equal(h["X-CA-Nonce"], "deadbeefdeadbeefdeadbeefdeadbeef");
    assert.equal(h["X-CA-Signature-Method"], "HmacSHA256");
    const expected = createHmac("sha256", "Jefe")
      .update(
        "1700000000000/deadbeefdeadbeefdeadbeefdeadbeef/myAppId/AZ02849ADDFC/GET/HmacSHA256",
      )
      .digest("base64");
    assert.equal(h["X-CA-Signature"], expected);
  });

  await t.test("zonder injectie → timestamp/nonce vers gegenereerd", async () => {
    const before = Date.now();
    const h = await buildHeaders("appid", "secret", "AZ123", "POST");
    const after = Date.now();
    const ts = Number(h["X-CA-Timestamp"]);
    assert.ok(ts >= before && ts <= after, "timestamp ligt binnen call-venster");
    assert.match(h["X-CA-Nonce"], /^[0-9a-f]{32}$/);
    assert.equal(h["X-CA-Signature-Method"], "HmacSHA256");
    assert.ok(typeof h["X-CA-Signature"] === "string" && h["X-CA-Signature"].length > 0);
  });

  await t.test("signMethod HmacSHA1 → header + SHA-1 signature", async () => {
    const h = await buildHeaders("myAppId", "Jefe", "AZ02849ADDFC", "POST", {
      now: 1700000000000,
      nonce: "deadbeefdeadbeefdeadbeefdeadbeef",
      signMethod: "HmacSHA1",
    });
    assert.equal(h["X-CA-Signature-Method"], "HmacSHA1");
    const expected = createHmac("sha1", "Jefe")
      .update(
        "1700000000000/deadbeefdeadbeefdeadbeefdeadbeef/myAppId/AZ02849ADDFC/POST/HmacSHA1",
      )
      .digest("base64");
    assert.equal(h["X-CA-Signature"], expected);
  });
});
