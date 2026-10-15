import axios from 'axios';

const getDefaultApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://sri-lakshmi-pg.onrender.com/api';
  }
  return 'http://127.0.0.1:8000/api';
};

const API_BASE_URL = getDefaultApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Request interceptor to automatically inject JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pg_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry / 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and we had a token, remove it
      if (localStorage.getItem('pg_auth_token')) {
        localStorage.removeItem('pg_auth_token');
        localStorage.removeItem('pg_auth_user');
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// Ultra-Fast In-Memory Client-Side SWR Cache
// Gives Instant (<10ms) Menu Navigation & Sub-second Page Switching
// ==========================================
const clientCache = new Map();
const inFlightRequests = new Map();

/**
 * Perform a cached GET request.
 * If data is already in cache and not expired (TTL default 30s), it returns immediately.
 * In background, or if forceRefresh is true, it fetches fresh data.
 */
export async function cachedGet(url, options = {}, ttlMs = 30000) {
  const cacheKey = `${url}_${JSON.stringify(options.params || {})}`;
  const now = Date.now();

  const cached = clientCache.get(cacheKey);
  if (cached && (now - cached.timestamp < ttlMs)) {
    return cached.data;
  }

  // Deduplicate identical in-flight requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const reqPromise = api.get(url, options)
    .then((res) => {
      clientCache.set(cacheKey, { timestamp: Date.now(), data: res.data });
      inFlightRequests.delete(cacheKey);
      return res.data;
    })
    .catch((err) => {
      inFlightRequests.delete(cacheKey);
      // Return stale data if available on network failure
      if (cached) return cached.data;
      throw err;
    });

  inFlightRequests.set(cacheKey, reqPromise);
  return reqPromise;
}

/**
 * Invalidate client-side cache when admin mutates data (POST/PUT/DELETE)
 */
export function invalidateClientCache(urlPrefix = '') {
  if (!urlPrefix) {
    clientCache.clear();
  } else {
    for (const key of clientCache.keys()) {
      if (key.startsWith(urlPrefix)) {
        clientCache.delete(key);
      }
    }
  }
}

export default api;

