import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, ApiErrorResponse } from '../types/api.types';

// Axios instance configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging in development mode
apiClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }
    return config;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[API Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    if (import.meta.env.DEV) {
      console.error('[API Response Error]', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle specific error status codes
    if (error.response) {
      const { status, data } = error.response;

      // Extract error message
      let errorMessage = 'An unexpected error occurred';
      if (data && !data.success) {
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.error && typeof data.error === 'object') {
          errorMessage = data.error.message || errorMessage;
        }
      }

      // Handle 401 Unauthorized - emit custom event for auth context to handle
      if (status === 401) {
        window.dispatchEvent(new CustomEvent('api:unauthorized'));
        throw new ApiError(status, 'You are not authenticated. Please log in.', data);
      }

      // Handle 403 Forbidden
      if (status === 403) {
        throw new ApiError(status, 'You do not have permission to perform this action.', data);
      }

      // Handle 404 Not Found
      if (status === 404) {
        throw new ApiError(status, errorMessage, data);
      }

      // Handle 5xx Server Errors with retry logic (already done once by default)
      if (status >= 500) {
        // Check if this is a retry attempt
        const config = error.config as AxiosRequestConfig & { _retry?: boolean };
        if (!config._retry) {
          config._retry = true;

          if (import.meta.env.DEV) {
            console.log('[API Retry] Retrying request due to 5xx error');
          }

          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return apiClient.request(config);
        }

        throw new ApiError(status, 'Server error. Please try again later.', data);
      }

      // Handle other 4xx errors
      if (status >= 400 && status < 500) {
        throw new ApiError(status, errorMessage, data);
      }

      throw new ApiError(status, errorMessage, data);
    }

    // Handle network errors (no response)
    if (error.request) {
      throw new ApiError(0, 'Network error. Please check your connection and try again.');
    }

    // Handle other errors
    throw new ApiError(0, error.message || 'An unexpected error occurred');
  }
);

// Export configured axios instance
export default apiClient;

// Export convenience function for making requests
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),
};
