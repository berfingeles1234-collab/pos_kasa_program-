/**
 * Merkezi POS API client
 * Tüm frontend istekleri bu katmandan yapılmalıdır.
 */
const ApiClient = (function () {
  const API_BASE_URL =
    window.AppConfig?.API_BASE_URL || 'http://localhost:4001/api/v1';

  const STORAGE_KEYS = {
    token: 'token',
    user: 'user',
  };

  const SESSION_EXPIRED_MESSAGE =
    'Oturum süreniz doldu. Lütfen tekrar giriş yapın.';
  const SESSION_MESSAGE_KEY = 'session_expired_message';

  const AUTH_ERROR_PATTERNS = [
    'geçersiz token',
    'token expired',
    'unauthorized',
    'forbidden',
    'jwt expired',
    'invalid token',
    'token gerekli',
  ];

  let authExpiryHandling = false;

  function normalizeErrorMessage(message) {
    return String(message || '').toLowerCase().trim();
  }

  function isAuthError(status, message) {
    if (status !== 401 && status !== 403) {
      return false;
    }

    const normalized = normalizeErrorMessage(message);
    return AUTH_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
  }

  function isAuthPage() {
    const href = String(window.location.href || '').toLowerCase();
    const path = String(window.location.pathname || '').toLowerCase();
    return (
      href.includes('login.html') ||
      href.includes('activate.html') ||
      path.endsWith('/login') ||
      path.endsWith('/activate')
    );
  }

  function clearSessionOnly() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem('girisYapan');
    // Lisans / cihaz bilgileri korunur:
    // device_id, device_fingerprint, license_status,
    // license_expires_at, pos_store_id, customer_id
  }

  function redirectToLoginWithMessage() {
    sessionStorage.setItem(SESSION_MESSAGE_KEY, SESSION_EXPIRED_MESSAGE);

    if (isAuthPage()) {
      return;
    }

    window.location.href = 'login.html?session=expired';
  }

  function handleAuthExpired() {
    if (authExpiryHandling) {
      return;
    }

    authExpiryHandling = true;
    clearSessionOnly();
    redirectToLoginWithMessage();
  }

  function createSessionExpiredError() {
    const error = new Error(SESSION_EXPIRED_MESSAGE);
    error.name = 'SessionExpiredError';
    error.code = 'SESSION_EXPIRED';
    return error;
  }

  function isSessionExpiredError(error) {
    return Boolean(
      error &&
      (error.name === 'SessionExpiredError' || error.code === 'SESSION_EXPIRED')
    );
  }

  function consumeSessionExpiredMessage() {
    const fromStorage = sessionStorage.getItem(SESSION_MESSAGE_KEY);
    if (fromStorage) {
      sessionStorage.removeItem(SESSION_MESSAGE_KEY);
      return fromStorage;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('session') === 'expired') {
      if (window.history && typeof window.history.replaceState === 'function') {
        const cleanUrl = window.location.pathname.split('/').pop() || 'login.html';
        window.history.replaceState({}, '', cleanUrl);
      }
      return SESSION_EXPIRED_MESSAGE;
    }

    return null;
  }

  function buildQuery(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value);
      }
    });

    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  function getToken() {
    return localStorage.getItem(STORAGE_KEYS.token);
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  function saveSession(token, user) {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

    // Geçiş dönemi uyumluluk (eski HTML alanları)
    if (user && user.username) {
      localStorage.setItem('girisYapan', user.username);
    }
  }

  function clearSession() {
    clearSessionOnly();
  }

  function logout() {
    clearSessionOnly();
    window.location.href = 'login.html';
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function requireRole(...roles) {
    const user = getCurrentUser();

    if (!user) {
      window.location.href = 'login.html';
      return false;
    }

    if (!roles.includes(user.role)) {
      throw new Error('Yetkiniz yok');
    }

    return true;
  }

  async function handleResponse(response) {
    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    const errorMessage = data?.error || data?.message || '';

    if (isAuthError(response.status, errorMessage)) {
      handleAuthExpired();
      throw createSessionExpiredError();
    }

    if (response.status === 401) {
      throw new Error(errorMessage || 'Kimlik doğrulama gerekli');
    }

    if (response.status === 403) {
      throw new Error(errorMessage || 'Yetkiniz yok');
    }

    if (!response.ok) {
      throw new Error(errorMessage || `İstek başarısız (${response.status})`);
    }

    return data;
  }

  async function request(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = options.skipAuth ? null : getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    return handleResponse(response);
  }

  async function login(username, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      skipAuth: true,
    });

    if (data.token && data.user) {
      saveSession(data.token, data.user);
    }

    return data;
  }

  async function changePassword(currentPassword, newPassword) {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  // --- POS: Ürünler ---

  async function getProducts(filters = {}) {
    return request(`/pos/products${buildQuery(filters)}`);
  }

  async function getProductByBarcode(barcode, filters = {}) {
    const encoded = encodeURIComponent(barcode);
    return request(`/pos/products/barcode/${encoded}${buildQuery(filters)}`);
  }

  async function createProduct(data) {
    return request('/pos/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async function updateProduct(id, data) {
    return request(`/pos/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async function deleteProduct(id, filters = {}) {
    return request(`/pos/products/${id}${buildQuery(filters)}`, {
      method: 'DELETE',
    });
  }

  // --- POS: Satış ---

  async function createSale(data) {
    return request('/pos/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Admin: Raporlar ---

  async function getCashTracking(filters = {}) {
    return request(`/admin/reports/cash-tracking${buildQuery(filters)}`);
  }

  async function getSalesAnalytics(filters = {}) {
    return request(`/admin/reports/sales-analytics${buildQuery(filters)}`);
  }

  async function getSaleDetails(saleId, filters = {}) {
    return request(`/admin/sales/${encodeURIComponent(saleId)}/details${buildQuery(filters)}`);
  }

  async function getSales(filters = {}) {
    return request(`/admin/sales${buildQuery(filters)}`);
  }

  async function getSummary(filters = {}) {
    return request(`/admin/reports/summary${buildQuery(filters)}`);
  }

  // --- Admin: Ayarlar ---

  async function getSettings(filters = {}) {
    return request(`/admin/settings${buildQuery(filters)}`);
  }

  async function updateSettings(data) {
    return request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Admin: Stok hareketleri ---

  async function getStockMovements(filters = {}) {
    return request(`/admin/stock-movements${buildQuery(filters)}`);
  }

  // --- Admin: Kullanıcılar ---

  async function getUsers(filters = {}) {
    return request(`/admin/users${buildQuery(filters)}`);
  }

  async function createUser(data) {
    return request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async function updateUser(id, data) {
    return request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async function deleteUser(id) {
    return request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Lisans / Cihaz ---

  async function activateLicense(data) {
    return request('/license/activate', {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
  }

  function normalizeLicensePayload(raw) {
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    const source = raw.data && typeof raw.data === 'object' ? raw.data : raw;

    return {
      device_id: source.device_id ?? source.deviceId ?? null,
      device_fingerprint: source.device_fingerprint ?? source.deviceFingerprint ?? null,
      license_status: source.license_status ?? source.licenseStatus ?? null,
      expires_at: source.expires_at ?? source.expiresAt ?? source.license_expires_at ?? null,
      store_id: source.store_id ?? source.storeId ?? source.pos_store_id ?? null,
      customer_id: source.customer_id ?? source.customerId ?? null,
    };
  }

  function saveLicenseActivation(data, extras) {
    const normalized = normalizeLicensePayload(data);
    const normalizedExtras = normalizeLicensePayload(extras || {});

    // Ek alanlar yalnızca gerçekten değer taşıdıkları zaman yanıtı ezmelidir.
    // normalizeLicensePayload eksik alanları null yaptığı için doğrudan spread
    // etmek aktivasyon yanıtındaki device_id gibi değerleri siliyordu.
    Object.entries(normalizedExtras).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        normalized[key] = value;
      }
    });

    if (normalized.device_id != null && normalized.device_id !== '') {
      localStorage.setItem('device_id', String(normalized.device_id));
    }
    if (normalized.device_fingerprint) {
      localStorage.setItem('device_fingerprint', String(normalized.device_fingerprint));
    }
    if (normalized.license_status) {
      localStorage.setItem('license_status', String(normalized.license_status));
    }
    if (normalized.expires_at) {
      localStorage.setItem('license_expires_at', String(normalized.expires_at));
    }
    if (normalized.store_id != null && normalized.store_id !== '') {
      localStorage.setItem('pos_store_id', String(normalized.store_id));
    }
    if (normalized.customer_id != null && normalized.customer_id !== '') {
      localStorage.setItem('customer_id', String(normalized.customer_id));
    }
  }

  function logActivationSaved() {
    if (window.AppConfig && window.AppConfig.APP_ENV === 'development') {
      console.log('Activation saved:', {
        device_id: localStorage.getItem('device_id'),
        device_fingerprint: localStorage.getItem('device_fingerprint'),
        pos_store_id: localStorage.getItem('pos_store_id'),
        license_status: localStorage.getItem('license_status'),
        license_expires_at: localStorage.getItem('license_expires_at'),
        customer_id: localStorage.getItem('customer_id'),
      });
    }
  }

  async function validateLicense() {
    const deviceId = localStorage.getItem('device_id');
    const deviceFingerprint = localStorage.getItem('device_fingerprint');

    if (!deviceId || !deviceFingerprint) {
      throw new Error('Cihaz aktivasyonu gerekli');
    }

    const response = await request(
      `/license/validate${buildQuery({
        device_id: deviceId,
        device_fingerprint: deviceFingerprint,
      })}`,
      { skipAuth: true }
    );

    saveLicenseActivation(response, {
      device_id: deviceId,
      device_fingerprint: deviceFingerprint,
    });

    if (window.AppConfig && window.AppConfig.APP_ENV === 'development') {
      console.log('Validate response:', response);
      logActivationSaved();
    }

    return response;
  }

  function hasLicenseActivation() {
    return Boolean(
      localStorage.getItem('device_id') &&
      localStorage.getItem('device_fingerprint')
    );
  }

  return {
    API_BASE_URL,
    SESSION_EXPIRED_MESSAGE,
    buildQuery,
    getToken,
    getCurrentUser,
    isLoggedIn,
    requireAuth,
    requireRole,
    saveSession,
    clearSession,
    clearSessionOnly,
    isAuthError,
    handleAuthExpired,
    redirectToLoginWithMessage,
    isSessionExpiredError,
    consumeSessionExpiredMessage,
    logout,
    login,
    changePassword,
    getProducts,
    getProductByBarcode,
    createProduct,
    updateProduct,
    deleteProduct,
    createSale,
    getSales,
    getCashTracking,
    getSalesAnalytics,
    getSaleDetails,
    getSummary,
    getSettings,
    updateSettings,
    getStockMovements,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    activateLicense,
    validateLicense,
    saveLicenseActivation,
    logActivationSaved,
    hasLicenseActivation,
  };
})();

if (typeof window !== 'undefined') {
  window.ApiClient = ApiClient;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiClient;
}
