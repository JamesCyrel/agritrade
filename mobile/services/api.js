// API Configuration
const API_BASE_URL = __DEV__
  ? 'http://10.0.0.41:3000/api' // For development - use your computer's IP for physical device
  : 'https://your-production-api.com/api'; // Update for production

// Helper function to make API calls
export const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body && method !== 'GET') config.body = JSON.stringify(body);

    const response = await fetch(url, config);
    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      // Non-JSON response (e.g., HTML from a proxy or error page)
      data = { message: text };
    }

    if (!response.ok) {
      const err = new Error(data?.message || `HTTP ${response.status}`);
      err.status = response.status;
      err.url = url;
      err.body = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.error('API Error:', { url, message: error.message, status: error.status, body: error.body });
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  signup: async (email, phone, password, role) => {
    return await apiCall('/auth/signup', 'POST', {
      email: email || null,
      phone: phone || null,
      password,
      role,
    });
  },

  login: async (email, phone, password) => {
    return await apiCall('/auth/login', 'POST', {
      email: email || null,
      phone: phone || null,
      password,
    });
  },

  verify: async (token) => {
    return await apiCall('/auth/verify', 'GET', null, token);
  },
};

// Simple health/ping utility to debug connectivity
export const pingAPI = async () => {
  try {
    const res = await fetch(API_BASE_URL.replace(/\/api$/, '') + '/health');
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

// Farmer API calls
export const farmerAPI = {
  getProfile: async (token) => {
    return await apiCall('/farmer/profile', 'GET', null, token);
  },
  updateProfile: async (token, profile) => {
    return await apiCall('/farmer/profile', 'PUT', profile, token);
  },
  uploadDocuments: async (token, documents) => {
    // documents: [{doc_type, file_data(base64 or url)}]
    return await apiCall('/farmer/verification/documents', 'POST', { documents }, token);
  },
  getVerificationStatus: async (token) => {
    return await apiCall('/farmer/verification/status', 'GET', null, token);
  },
};

// Admin API calls
export const adminAPI = {
  listPending: async (token) => {
    return await apiCall('/admin/verifications/pending', 'GET', null, token);
  },
  getApplication: async (token, userId) => {
    return await apiCall(`/admin/verifications/${userId}`, 'GET', null, token);
  },
  approve: async (token, userId) => {
    return await apiCall(`/admin/verifications/${userId}/approve`, 'POST', {}, token);
  },
  reject: async (token, userId, reason) => {
    return await apiCall(`/admin/verifications/${userId}/reject`, 'POST', { reason }, token);
  },
  listUsers: async (token, { role, status } = {}) => {
    const q = new URLSearchParams();
    if (role) q.append('role', role);
    if (status) q.append('status', status);
    const qs = q.toString();
    return await apiCall(`/admin/users${qs ? `?${qs}` : ''}`, 'GET', null, token);
  },
};

