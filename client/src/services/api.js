import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Holds the in-flight refresh request (if any) so concurrent 401s share
// the same refresh call instead of racing each other. Using a shared
// promise (rather than a boolean flag + queue) avoids the race where two
// requests both see isRefreshing === false and both trigger a refresh.
let refreshPromise = null;
let cachedCsrfToken = null;
let csrfPromise = null;

export const getCsrfToken = async (forceRefresh = false) => {
  if (cachedCsrfToken && !forceRefresh) {
    return cachedCsrfToken;
  }
  if (!csrfPromise) {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    csrfPromise = axios
      .get(`${baseURL}/csrf-token`, { withCredentials: true })
      .then((res) => {
        cachedCsrfToken = res.data.csrfToken;
        return cachedCsrfToken;
      })
      .catch((err) => {
        console.error('[CSRF] Failed to fetch CSRF token:', err.message);
        return null;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
};

// ── Request Interceptor: Attach CSRF Token on Mutations ─────────────────────
api.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken();
    if (token) {
      config.headers['x-csrf-token'] = token;
    }
  }
  return config;
});

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    if (!originalRequest) return Promise.reject(err);

    // Auto-retry once on CSRF token mismatch / expiration
    if (
      err.response?.status === 403 &&
      err.response?.data?.code === 'CSRF_INVALID' &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      const freshToken = await getCsrfToken(true);
      if (freshToken) {
        originalRequest.headers['x-csrf-token'] = freshToken;
        return api(originalRequest);
      }
    }

    // Refresh access token on 401
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(err);
      }

      originalRequest._retry = true;

      try {
        await refreshAccessToken();
        return api(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
