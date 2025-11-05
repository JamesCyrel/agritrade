// API Configuration
const API_BASE_URL = __DEV__
  ? 'http://10.0.0.42:3000/api' // For development - use your computer's IP for physical device
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

// Consumer API calls
export const consumerAPI = {
  getProfile: async (token) => {
    return await apiCall('/consumer/profile', 'GET', null, token);
  },
  updateProfile: async (token, { full_name }) => {
    return await apiCall('/consumer/profile', 'PUT', { full_name }, token);
  },
  getAddresses: async (token) => {
    return await apiCall('/consumer/addresses', 'GET', null, token);
  },
  addAddress: async (token, address) => {
    return await apiCall('/consumer/addresses', 'POST', address, token);
  },
  updateAddress: async (token, addressId, address) => {
    return await apiCall(`/consumer/addresses/${addressId}`, 'PUT', address, token);
  },
  deleteAddress: async (token, addressId) => {
    return await apiCall(`/consumer/addresses/${addressId}`, 'DELETE', null, token);
  },
  getPaymentMethods: async (token) => {
    return await apiCall('/consumer/payment-methods', 'GET', null, token);
  },
  addPaymentMethod: async (token, paymentMethod) => {
    return await apiCall('/consumer/payment-methods', 'POST', paymentMethod, token);
  },
  updatePaymentMethod: async (token, paymentId, paymentMethod) => {
    return await apiCall(`/consumer/payment-methods/${paymentId}`, 'PUT', paymentMethod, token);
  },
  deletePaymentMethod: async (token, paymentId) => {
    return await apiCall(`/consumer/payment-methods/${paymentId}`, 'DELETE', null, token);
  },
  // Search & Browsing (SB-1 to SB-5)
  getHomepage: async (token) => {
    return await apiCall('/consumer/homepage', 'GET', null, token);
  },
  searchProducts: async (token, params) => {
    const queryString = new URLSearchParams();
    if (params.q) queryString.append('q', params.q);
    if (params.rice_type) queryString.append('rice_type', params.rice_type);
    if (params.min_price) queryString.append('min_price', params.min_price);
    if (params.max_price) queryString.append('max_price', params.max_price);
    if (params.max_distance) queryString.append('max_distance', params.max_distance);
    if (params.min_rating) queryString.append('min_rating', params.min_rating);
    if (params.sort_by) queryString.append('sort_by', params.sort_by);
    if (params.limit) queryString.append('limit', params.limit);
    if (params.offset) queryString.append('offset', params.offset);
    if (params.consumer_lat) queryString.append('consumer_lat', params.consumer_lat);
    if (params.consumer_lng) queryString.append('consumer_lng', params.consumer_lng);
    const query = queryString.toString();
    return await apiCall(`/consumer/products/search${query ? `?${query}` : ''}`, 'GET', null, token);
  },
  getProductDetails: async (token, productId) => {
    return await apiCall(`/consumer/products/${productId}`, 'GET', null, token);
  },
  getFarmerStorefront: async (token, farmerId) => {
    return await apiCall(`/consumer/farmers/${farmerId}/storefront`, 'GET', null, token);
  },
  // Cart (OC-1, OC-2)
  addToCart: async (token, cartData) => {
    return await apiCall('/consumer/cart', 'POST', cartData, token);
  },
  getCart: async (token) => {
    return await apiCall('/consumer/cart', 'GET', null, token);
  },
  updateCartItem: async (token, cartItemId, quantity) => {
    return await apiCall(`/consumer/cart/${cartItemId}`, 'PUT', { quantity }, token);
  },
  removeCartItem: async (token, cartItemId) => {
    return await apiCall(`/consumer/cart/${cartItemId}`, 'DELETE', null, token);
  },
  clearCart: async (token) => {
    return await apiCall('/consumer/cart', 'DELETE', null, token);
  },
  // Orders & Checkout (OC-3, OC-4)
  createOrder: async (token, orderData) => {
    return await apiCall('/consumer/orders', 'POST', orderData, token);
  },
  getOrders: async (token) => {
    return await apiCall('/consumer/orders', 'GET', null, token);
  },
  getOrderDetails: async (token, orderId) => {
    return await apiCall(`/consumer/orders/${orderId}`, 'GET', null, token);
  },
  validatePromoCode: async (token, code, orderAmount) => {
    return await apiCall('/consumer/promo-codes/validate', 'POST', { code, orderAmount }, token);
  },
  // Payment System (PS-2)
  checkCODEligibility: async (token, orderAmount, farmerId = null) => {
    return await apiCall('/consumer/payments/cod/check-eligibility', 'POST', { orderAmount, farmerId }, token);
  },
};

// Product API calls (Farmer)
export const productAPI = {
  createProduct: async (token, product) => {
    return await apiCall('/farmer/products', 'POST', product, token);
  },
  getProducts: async (token, includeInactive = false) => {
    const query = includeInactive ? '?includeInactive=true' : '';
    return await apiCall(`/farmer/products${query}`, 'GET', null, token);
  },
  getProduct: async (token, productId) => {
    return await apiCall(`/farmer/products/${productId}`, 'GET', null, token);
  },
  updateProduct: async (token, productId, product) => {
    return await apiCall(`/farmer/products/${productId}`, 'PUT', product, token);
  },
  archiveProduct: async (token, productId) => {
    return await apiCall(`/farmer/products/${productId}/archive`, 'POST', null, token);
  },
  getArchivedProducts: async (token) => {
    return await apiCall('/farmer/products/archived/list', 'GET', null, token);
  },
  unarchiveProduct: async (token, productId) => {
    return await apiCall(`/farmer/products/${productId}/unarchive`, 'POST', null, token);
  },
  updateInventory: async (token, productId, available_quantity) => {
    return await apiCall(`/farmer/products/${productId}/inventory`, 'PUT', { available_quantity }, token);
  },
};

// Order Management API calls (Farmer)
export const farmerOrderAPI = {
  // OM-2: Get farmer orders
  getOrders: async (token, status = null) => {
    const query = status ? `?status=${status}` : '';
    return await apiCall(`/farmer/orders${query}`, 'GET', null, token);
  },
  getOrderDetails: async (token, orderId) => {
    return await apiCall(`/farmer/orders/${orderId}`, 'GET', null, token);
  },
  // OM-3: Accept/Reject orders
  acceptOrder: async (token, orderId) => {
    return await apiCall(`/farmer/orders/${orderId}/accept`, 'POST', null, token);
  },
  rejectOrder: async (token, orderId, reason, notes = null) => {
    return await apiCall(`/farmer/orders/${orderId}/reject`, 'POST', { reason, notes }, token);
  },
  // OM-4: Update order status
  updateOrderStatus: async (token, orderId, status) => {
    return await apiCall(`/farmer/orders/${orderId}/status`, 'PUT', { status }, token);
  },
};

