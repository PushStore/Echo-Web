// File: src/ble.js
// ble.js — Native Capacitor bridge for BLE mesh networking
// Registers the native Android plugin (BlePlugin.java) and exposes BLE mesh
// methods for nearby Echo Node discovery, GATT relay, and mesh connectivity.
import { registerPlugin } from './capacitor-core-shim.js';

const _native = registerPlugin('BleMesh');

export const BleMesh = {
    startScan:            () => _native.startScan(),
    stopScan:             () => _native.stopScan(),
    getDiscoveredPeers:   () => _native.getDiscoveredPeers(),
    connectToPeer:        ({ address }) => _native.connectToPeer({ address }),
    disconnectFromPeer:   ({ address }) => _native.disconnectFromPeer({ address }),
    getMeshStatus:        () => _native.getMeshStatus(),
    relayMessage:         ({ address, payload }) => _native.relayMessage({ address, payload }),
    checkBleAvailability: () => _native.checkBleAvailability(),
};
