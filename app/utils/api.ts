import { config } from '../config';
import { ApiResponse, TokenStats, Transaction, PaginatedResponse } from '../types';

// API client class
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = config.API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Token endpoints
  async getTokenInfo() {
    return this.request('/token/info');
  }

  async getTokenBalance(address: string) {
    return this.request(`/token/balance/${address}`);
  }

  async getTokenStats(): Promise<ApiResponse<TokenStats>> {
    return this.request('/token/stats');
  }

  async getTransactions(
    address: string,
    params?: {
      page?: number;
      limit?: number;
      type?: string;
    }
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type && params.type !== 'all') searchParams.append('type', params.type);

    const query = searchParams.toString();
    const endpoint = `/token/transactions/${address}${query ? `?${query}` : ''}`;
    
    return this.request(endpoint);
  }

  // Admin endpoints
  async mintTokens(
    toAddress: string,
    amount: string,
    apiKey: string
  ) {
    return this.request('/admin/mint', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        to: toAddress,
        amount,
      }),
    });
  }

  async burnTokens(
    amount: string,
    apiKey: string
  ) {
    return this.request('/admin/burn', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        amount,
      }),
    });
  }

  async getAdminDashboard(apiKey: string) {
    return this.request('/admin/dashboard', {
      headers: {
        'X-API-Key': apiKey,
      },
    });
  }

  // Payment endpoints
  async createPaymentIntent(
    amount: number,
    email: string,
    walletAddress: string
  ) {
    return this.request('/payment/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        email,
        walletAddress,
      }),
    });
  }

  async confirmPayment(
    paymentIntentId: string,
    walletAddress: string
  ) {
    return this.request('/payment/confirm', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId,
        walletAddress,
      }),
    });
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    });
  }

  async register(
    email: string,
    password: string,
    walletAddress: string
  ) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        walletAddress,
      }),
    });
  }

  async verifyToken(token: string) {
    return this.request('/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
}

// Create and export API client instance
export const apiClient = new ApiClient();

// Utility functions for common API operations
export const tokenApi = {
  getInfo: () => apiClient.getTokenInfo(),
  getBalance: (address: string) => apiClient.getTokenBalance(address),
  getStats: () => apiClient.getTokenStats(),
  getTransactions: (address: string, params?: any) => 
    apiClient.getTransactions(address, params),
};

export const adminApi = {
  mint: (toAddress: string, amount: string, apiKey: string) =>
    apiClient.mintTokens(toAddress, amount, apiKey),
  burn: (amount: string, apiKey: string) =>
    apiClient.burnTokens(amount, apiKey),
  getDashboard: (apiKey: string) =>
    apiClient.getAdminDashboard(apiKey),
};

export const paymentApi = {
  createIntent: (amount: number, email: string, walletAddress: string) =>
    apiClient.createPaymentIntent(amount, email, walletAddress),
  confirm: (paymentIntentId: string, walletAddress: string) =>
    apiClient.confirmPayment(paymentIntentId, walletAddress),
};

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.login(email, password),
  register: (email: string, password: string, walletAddress: string) =>
    apiClient.register(email, password, walletAddress),
  verify: (token: string) =>
    apiClient.verifyToken(token),
};

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
};

// Mock data for development when API is not available
export const mockData = {
  tokenStats: {
    totalSupply: '1000000',
    circulatingSupply: '750000',
    holders: 1250,
    totalTransfers: 5678,
    marketCap: 1000000,
    price: 1.0,
  } as TokenStats,
  
  transactions: [
    {
      hash: '0x1234567890abcdef1234567890abcdef12345678',
      from: '0xabcdef1234567890abcdef1234567890abcdef12',
      to: '0x1234567890abcdef1234567890abcdef12345678',
      value: '1000000000000000000',
      formattedValue: '1.0',
      timestamp: Date.now() / 1000 - 3600,
      blockNumber: 12345,
      status: 'confirmed' as const,
      type: 'receive' as const,
    },
    {
      hash: '0xabcdef1234567890abcdef1234567890abcdef12',
      from: '0x1234567890abcdef1234567890abcdef12345678',
      to: '0xabcdef1234567890abcdef1234567890abcdef12',
      value: '500000000000000000',
      formattedValue: '0.5',
      timestamp: Date.now() / 1000 - 7200,
      blockNumber: 12344,
      status: 'confirmed' as const,
      type: 'send' as const,
    },
  ] as Transaction[],
};

// Development mode helper
export const isDevelopment = process.env.NODE_ENV === 'development';

// API availability checker
export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    await fetch(`${config.API_BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    } as any);
    return true;
  } catch {
    return false;
  }
};
