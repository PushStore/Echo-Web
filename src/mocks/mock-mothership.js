// mock-mothership.js — Mother Ship relay mock methods

export async function connectToMothership({ publicKey }) {
  console.log('[Mock] connectToMothership:', publicKey);
  return { connected: true, mothershipUrl: 'https://mothership.echo.example.com' };
}

export async function disconnectFromMothership() {
  console.log('[Mock] disconnectFromMothership');
  return { connected: false };
}

export async function getMothershipStatus() {
  return { connected: true, mothershipUrl: 'https://mothership.echo.example.com' };
}

export async function sendDmViaMothership({ recipientId, encryptedContent, messageType, conversationId }) {
  console.log('[Mock] sendDmViaMothership to', recipientId, 'type:', messageType);
  return { success: true, messageId: 'ms_msg_' + Date.now() };
}

export async function requestNearbyNode() {
  console.log('[Mock] requestNearbyNode');
  return { success: true, nodeUrl: 'https://echo-node.example.com' };
}
