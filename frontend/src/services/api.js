const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Helpers
const getToken = () => localStorage.getItem('token');

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

// Auth APIs
export const authAPI = {
  register: async (userData) =>
    apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phone,
        password: userData.password,
      }),
    }),

  login: async (creds) =>
    apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({
        email: creds.email,
        password: creds.password,
        accountNumber: creds.accountNumber, // Added as per new login requirement
      }),
    }),

  verifyOTP: async (email, otp) =>
    apiRequest('/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
};

// User APIs
export const userAPI = {
  getProfile: () => apiRequest('/me'),
  getBalance: () => apiRequest('/balance'),
  getAllUsers: () => apiRequest('/user/all'),
};

// Transaction APIs
export const transactionAPI = {
  initiateTransaction: (data) =>
    apiRequest('/transaction/initiate', {
      method: 'POST',
      body: JSON.stringify({
        amount: data.amount,
        password: data.password,
        recipientAccountNumber: data.recipientAccountNumber,
      }),
    }),

  verifyTransaction: (otp, transactionId) =>
    apiRequest('/transaction/verify', {
      method: 'POST',
      body: JSON.stringify({ otp, transactionId }),
    }),

  getHistory: () => apiRequest('/transactions'),
};

// Helpers
export const authHelpers = {
  setToken: (t) => localStorage.setItem('token', t),
  getToken,
  removeToken: () => localStorage.removeItem('token'),
  setUser: (u) => localStorage.setItem('user', JSON.stringify(u)),
  getUser: () => JSON.parse(localStorage.getItem('user')),
  removeUser: () => localStorage.removeItem('user'),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  isAuthenticated: () => !!localStorage.getItem('token'),
};
