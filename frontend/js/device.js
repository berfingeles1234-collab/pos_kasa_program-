const DeviceIdentity = (function () {
  const FINGERPRINT_KEY = 'device_fingerprint';
  const DEVICE_NAME_KEY = 'device_name';
  const APP_VERSION = '1.0.0';

  function generateFallbackUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  }

  function generateUuid() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return generateFallbackUuid();
  }

  function getDeviceFingerprint() {
    let fingerprint = localStorage.getItem(FINGERPRINT_KEY);

    if (!fingerprint) {
      fingerprint = generateUuid();
      localStorage.setItem(FINGERPRINT_KEY, fingerprint);
    }

    return fingerprint;
  }

  function getDeviceName() {
    const savedName = localStorage.getItem(DEVICE_NAME_KEY);
    if (savedName) {
      return savedName;
    }

    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      if (navigator.userAgent.includes('Windows')) return 'Windows Kasa PC';
      if (navigator.userAgent.includes('Mac')) return 'Mac Kasa PC';
    }

    return 'Kasa PC';
  }

  function setDeviceName(name) {
    if (name) {
      localStorage.setItem(DEVICE_NAME_KEY, name);
    }
  }

  function getAppVersion() {
    return APP_VERSION;
  }

  return {
    getDeviceFingerprint,
    getDeviceName,
    setDeviceName,
    getAppVersion,
  };
})();

if (typeof window !== 'undefined') {
  window.DeviceIdentity = DeviceIdentity;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeviceIdentity;
}
