import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'analyst' | 'senior_analyst' | 'team_lead' | 'admin';
  organizationId: string;
  permissions: string[];
  preferences: Record<string, any>;
  lastLogin?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithSSO: (provider: string, token: string, email: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!(user && tokens);

  // Load stored auth state on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedTokens = localStorage.getItem('threatflow_tokens');
        const storedUser = localStorage.getItem('threatflow_user');

        if (storedTokens && storedUser) {
          const parsedTokens = JSON.parse(storedTokens);
          const parsedUser = JSON.parse(storedUser);

          // Check if tokens are still valid
          if (parsedTokens.expiresIn > Date.now()) {
            setTokens(parsedTokens);
            setUser(parsedUser);
          } else {
            // Try to refresh token
            try {
              await refreshTokenInternal(parsedTokens.refreshToken);
            } catch (error) {
              // Refresh failed, clear stored data
              clearAuthData();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('threatflow_tokens');
    localStorage.removeItem('threatflow_user');
    setTokens(null);
    setUser(null);
  };

  const storeAuthData = (userData: User, tokenData: AuthTokens) => {
    const expiresAt = Date.now() + (tokenData.expiresIn * 1000);
    const tokensWithExpiry = { ...tokenData, expiresIn: expiresAt };
    
    localStorage.setItem('threatflow_tokens', JSON.stringify(tokensWithExpiry));
    localStorage.setItem('threatflow_user', JSON.stringify(userData));
    
    setTokens(tokensWithExpiry);
    setUser(userData);
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      storeAuthData(data.user, data.tokens);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithSSO = async (
    provider: string,
    token: string,
    email: string,
    firstName?: string,
    lastName?: string
  ): Promise<void> => {
    try {
      const response = await fetch('/api/auth/sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          token,
          email,
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'SSO login failed');
      }

      const data = await response.json();
      storeAuthData(data.user, data.tokens);
    } catch (error) {
      console.error('SSO login error:', error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (tokens) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthData();
    }
  };

  const refreshTokenInternal = async (refreshTokenValue: string): Promise<void> => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token refresh failed');
    }

    const data = await response.json();
    const expiresAt = Date.now() + (data.tokens.expiresIn * 1000);
    const tokensWithExpiry = { ...data.tokens, expiresIn: expiresAt };
    
    localStorage.setItem('threatflow_tokens', JSON.stringify(tokensWithExpiry));
    setTokens(tokensWithExpiry);
  };

  const refreshToken = async (): Promise<void> => {
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      await refreshTokenInternal(tokens.refreshToken);
    } catch (error) {
      clearAuthData();
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    try {
      if (!tokens) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Profile update failed');
      }

      // Update user in state
      if (user) {
        const updatedUser = { ...user, ...data };
        localStorage.setItem('threatflow_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    tokens,
    isLoading,
    isAuthenticated,
    login,
    loginWithSSO,
    logout,
    refreshToken,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};