// API Configuration
const API_BASE_URL = __DEV__
  ? 'http://10.0.0.41:3000/api' // For development - use your computer's IP for physical device
  : 'https://your-production-api.com/api'; // Update for production

// Helper function to make API calls
export const apiCall = async (endpoint, method = 'GET', body = null, token = null) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
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

