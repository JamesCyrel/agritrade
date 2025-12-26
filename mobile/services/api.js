// API Configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Prefer a configured URL if provided via Expo public env or app.json extra
const configuredRoot =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_API_URL; // fallback for classic manifest

const defaultRoot = Platform.OS === 'android' ? 'http://192.168.12.1:3000' : 'http://localhost:3000';

// Server base URL (without /api)
const SERVER_BASE_URL = (configuredRoot || defaultRoot).replace(/\/$/, '');

const normalizeBase = (root) => {
  if (!root) return 'http://localhost:3000/api';
  const trimmed = root.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const API_BASE_URL = normalizeBase(configuredRoot || defaultRoot);

if (__DEV__) {
  // Helpful to see what the app is targeting
  // eslint-disable-next-line no-console
  console.log('[API] Base URL ->', API_BASE_URL);
}

// Helper function to get full image URL
// Handles both relative paths (like /assets/rice/rice1.jpg) and full URLs
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Otherwise, prepend the server URL
  return `${SERVER_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

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
    // Re-throw error without logging to console (callers can capture and display)
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
  // Finance
  getLedger: async (token) => {
    return await apiCall('/farmer/ledger', 'GET', null, token);
  },
  getPayouts: async (token) => {
    return await apiCall('/farmer/payouts', 'GET', null, token);
  },
  requestPayout: async (token, amount, bankDetails) => {
    return await apiCall('/farmer/payouts/request', 'POST', { amount, bankDetails }, token);
  },
};

// Admin API calls
export const adminAPI = {
  // Verifications
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
  // AD-1: User Management
  listUsers: async (token, { role, status } = {}) => {
    const q = new URLSearchParams();
    if (role) q.append('role', role);
    if (status) q.append('status', status);
    const qs = q.toString();
    return await apiCall(`/admin/users${qs ? `?${qs}` : ''}`, 'GET', null, token);
  },
  getUserProfile: async (token, userId) => {
    return await apiCall(`/admin/users/${userId}`, 'GET', null, token);
  },
  suspendUser: async (token, userId, reason) => {
    return await apiCall(`/admin/users/${userId}/suspend`, 'POST', { reason }, token);
  },
  activateUser: async (token, userId) => {
    return await apiCall(`/admin/users/${userId}/activate`, 'POST', {}, token);
  },
  // AD-2: Order Monitoring
  getAllOrders: async (token, filters = {}) => {
    const q = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) q.append(key, filters[key]);
    });
    const qs = q.toString();
    return await apiCall(`/admin/orders${qs ? `?${qs}` : ''}`, 'GET', null, token);
  },
  getOrderDetails: async (token, orderId) => {
    return await apiCall(`/admin/orders/${orderId}`, 'GET', null, token);
  },
  // AD-6: Analytics
  getAnalytics: async (token, startDate = null, endDate = null) => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    const qs = q.toString();
    return await apiCall(`/admin/analytics${qs ? `?${qs}` : ''}`, 'GET', null, token);
  },
  // AD-3: Payout Management
  getAllPayouts: async (token, filters = {}) => {
    const q = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) q.append(key, filters[key]);
    });
    const qs = q.toString();
    return await apiCall(`/admin/payouts${qs ? `?${qs}` : ''}`, 'GET', null, token);
  },
  getPayoutDetails: async (token, payoutId) => {
    return await apiCall(`/admin/payouts/${payoutId}`, 'GET', null, token);
  },
  approvePayout: async (token, payoutId, transactionReference = null, payoutDate = null) => {
    return await apiCall(`/admin/payouts/${payoutId}/approve`, 'POST', { transactionReference, payoutDate }, token);
  },
  completePayout: async (token, payoutId, transactionReference = null, payoutDate = null) => {
    return await apiCall(`/admin/payouts/${payoutId}/complete`, 'POST', { transactionReference, payoutDate }, token);
  },
  rejectPayout: async (token, payoutId, reason = null) => {
    return await apiCall(`/admin/payouts/${payoutId}/reject`, 'POST', { reason }, token);
  },
  getCommissionSettings: async (token) => {
    return await apiCall('/admin/commission-settings', 'GET', null, token);
  },
  updateCommissionSettings: async (token, rate, minCommission = 0) => {
    return await apiCall('/admin/commission-settings', 'PUT', { rate, minCommission }, token);
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
  cancelOrder: async (token, orderId) => {
    return await apiCall(`/consumer/orders/${orderId}/cancel`, 'POST', null, token);
  },
  validatePromoCode: async (token, code, orderAmount) => {
    return await apiCall('/consumer/promo-codes/validate', 'POST', { code, orderAmount }, token);
  },
  // Payment System (PS-2)
  checkCODEligibility: async (token, orderAmount, farmerId = null) => {
    return await apiCall('/consumer/payments/cod/check-eligibility', 'POST', { orderAmount, farmerId }, token);
  },
  // Notifications (OM-6)
  getNotifications: async (token, limit = 50) => {
    return await apiCall(`/consumer/notifications?limit=${limit}`, 'GET', null, token);
  },
  markNotificationAsRead: async (token, notificationId) => {
    return await apiCall(`/consumer/notifications/${notificationId}/read`, 'PUT', null, token);
  },
  markAllNotificationsAsRead: async (token) => {
    return await apiCall('/consumer/notifications/read-all', 'PUT', null, token);
  },
  getUnreadCount: async (token) => {
    return await apiCall('/consumer/notifications/unread-count', 'GET', null, token);
  },
  // Reviews & Ratings (RR-1, RR-2)
  createReview: async (token, orderId, rating, comment, productId = null) => {
    return await apiCall(`/consumer/orders/${orderId}/review`, 'POST', { rating, comment, productId }, token);
  },
  checkOrderReview: async (token, orderId) => {
    return await apiCall(`/consumer/orders/${orderId}/review`, 'GET', null, token);
  },
  getFarmerReviews: async (token, farmerId, limit = 20, offset = 0) => {
    return await apiCall(`/consumer/farmers/${farmerId}/reviews?limit=${limit}&offset=${offset}`, 'GET', null, token);
  },
  getFarmerRating: async (token, farmerId) => {
    return await apiCall(`/consumer/farmers/${farmerId}/rating`, 'GET', null, token);
  },
  getProductReviews: async (token, productId, limit = 20, offset = 0) => {
    return await apiCall(`/consumer/products/${productId}/reviews?limit=${limit}&offset=${offset}`, 'GET', null, token);
  },
  // Favorites
  getFavorites: async (token) => {
    return await apiCall('/consumer/favorites', 'GET', null, token);
  },
  addFavorite: async (token, productId) => {
    return await apiCall(`/consumer/favorites/${productId}`, 'POST', null, token);
  },
  removeFavorite: async (token, productId) => {
    return await apiCall(`/consumer/favorites/${productId}`, 'DELETE', null, token);
  },
  checkFavorite: async (token, productId) => {
    return await apiCall(`/consumer/favorites/${productId}/check`, 'GET', null, token);
  },
  toggleFavorite: async (token, productId) => {
    return await apiCall(`/consumer/favorites/${productId}/toggle`, 'POST', null, token);
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

// Reviews & Ratings API calls (Farmer)
export const farmerReviewAPI = {
  // RR-3: Get farmer reviews
  getReviews: async (token, limit = 50, offset = 0) => {
    return await apiCall(`/farmer/reviews?limit=${limit}&offset=${offset}`, 'GET', null, token);
  },
};

