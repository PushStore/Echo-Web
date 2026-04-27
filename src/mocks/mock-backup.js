// mock-backup.js — Backup & restore mock methods

export async function backupCreate({ includeMessages = true, password }) {
  console.log('[Mock] backupCreate, messages:', includeMessages);
  return { success: true, backupId: "bak_" + Date.now(), size: 1024, encrypted: true, timestamp: Date.now() };
}

export async function backupRestore({ data, password }) {
  console.log('[Mock] backupRestore');
  return { success: true, restored: { messages: 42, contacts: 15, settings: true }, timestamp: Date.now() };
}

export async function backupVerify({ data, password }) {
  console.log('[Mock] backupVerify');
  return { valid: true, backupId: "bak_verify_" + Date.now(), size: 1024 };
}

export async function backupDhtStore() {
  console.log('[Mock] backupDhtStore');
  return { success: true, dhtKey: "dht_backup_" + Date.now() };
}

export async function backupDhtRestore({ userId }) {
  console.log('[Mock] backupDhtRestore:', userId);
  return { success: true, dhtKey: "dht_backup_" + userId, restored: true };
}

export async function backupGetStatus() {
  return { lastBackup: Date.now() - 3600000, size: 1024, encrypted: true, dhtStored: true };
}
