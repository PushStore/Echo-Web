// mock-identity-verification.js — Identity verification mock methods
import { _profile } from "./mock-state.js";

export async function identityGetStatus() {
  if (!_profile) return { verified: false, keyCount: 0 };
  return { verified: true, keyCount: 1, lastVerified: Date.now() - 86400000, trustLevel: "trusted" };
}

export async function identityChallenge({ targetUserId }) {
  console.log('[Mock] identityChallenge:', targetUserId);
  const challengeId = "ch_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
  return { challengeId, challenge: "mock_challenge_data_" + Date.now(), expiresAt: Date.now() + 300000 };
}

export async function identityVerify({ challengeId, responseSignature, responderPublicKey }) {
  console.log('[Mock] identityVerify:', challengeId);
  return { verified: true, trustLevel: "verified", timestamp: Date.now() };
}

export async function identityRotateKey({ userId, oldPublicKey, newPublicKey, rotationSignature, timestamp }) {
  console.log('[Mock] identityRotateKey:', userId);
  return { success: true, rotatedAt: Date.now(), newPublicKey };
}

export async function identityGetKeys({ userId }) {
  return { keys: [{ publicKey: "mock_pubkey_" + userId, createdAt: Date.now() - 86400000 }], count: 1 };
}

export async function identitySetTrust({ userId, publicKey, trustLevel }) {
  console.log('[Mock] identitySetTrust:', userId, trustLevel);
  return { success: true, trustLevel, updatedAt: Date.now() };
}

export async function identityVerifyPrekey({ publicKey, prekeyPublic, prekeySignature }) {
  console.log('[Mock] identityVerifyPrekey');
  return { valid: true, prekeyId: "pk_" + Date.now() };
}
