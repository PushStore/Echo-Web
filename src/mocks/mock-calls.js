// mock-calls.js — WebRTC call mock methods
import { _profile, _callSessions, _callHistory } from "./mock-state.js";

export async function callInitiate({ calleeId, callType, offerSdp }) {
  if (!_profile) return { success: false, error: "No profile" };
  const sessionId = "call_" + Date.now() + "_" + Math.random().toString(36).slice(2,8);
  const session = {
    sessionId, callerId: _profile.userId, callerName: _profile.name,
    calleeId, callType: callType || "audio", status: "ringing",
    offerSdp, answerSdp: null, startedAt: Date.now(), duration: 0
  };
  _callSessions[sessionId] = session;
  console.log('[Mock] callInitiate:', sessionId, '→', calleeId);
  return { success: true, sessionId, status: "ringing" };
}

export async function callAnswer({ sessionId, answerSdp }) {
  const session = _callSessions[sessionId];
  if (!session) return { success: false, error: "Session not found" };
  session.status = "connected";
  session.answerSdp = answerSdp;
  session.connectedAt = Date.now();
  return { success: true, sessionId, status: "connected" };
}

export async function callReject({ sessionId }) {
  const session = _callSessions[sessionId];
  if (!session) return { success: false };
  session.status = "rejected";
  _callHistory.push({ ...session, endedAt: Date.now(), duration: 0 });
  return { success: true };
}

export async function callEnd({ sessionId }) {
  const session = _callSessions[sessionId];
  if (!session) return { success: false };
  session.status = "ended";
  session.endedAt = Date.now();
  session.duration = session.connectedAt ? (Date.now() - session.connectedAt) / 1000 : 0;
  _callHistory.push({ ...session });
  return { success: true, duration: session.duration };
}

export async function callGetSession({ sessionId }) {
  return { session: _callSessions[sessionId] || null };
}

export async function callAddIceCandidate({ sessionId, candidate, sdpMid, sdpMLineIndex }) {
  return { success: true };
}

export async function callGetIceCandidates({ sessionId, sinceTimestamp }) {
  return { candidates: [], count: 0 };
}

export async function callGetIncoming() {
  const incoming = Object.values(_callSessions).filter(s => s.calleeId === _profile?.userId && s.status === "ringing");
  return { calls: incoming, count: incoming.length };
}

export async function callGetActive() {
  const active = Object.values(_callSessions).filter(s => s.status === "connected");
  return { calls: active, count: active.length };
}

export async function callGetHistory({ limit = 20 }) {
  return { history: _callHistory.slice(-limit), count: _callHistory.length };
}

export async function callTimeout({ sessionId }) {
  const session = _callSessions[sessionId];
  if (session) session.status = "timeout";
  return { success: true };
}

export async function callGetStats() {
  return { totalCalls: _callHistory.length, totalDuration: _callHistory.reduce((s, c) => s + (c.duration || 0), 0) };
}
