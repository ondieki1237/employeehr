// Authentication utilities for token management

const TOKEN_KEY = 'elevate_auth_token'
const USER_KEY = 'elevate_user'

export interface AuthUser {
    _id: string
    userId?: string // Alias for _id
    email: string
    first_name: string
    last_name: string
    role: 'company_admin' | 'hr' | 'manager' | 'employee'
    org_id: string
    token?: string
}

// Token management
export const setToken = (token: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token)
    }
}

export const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY)
    }
    return null
}

export const removeToken = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY)
    }
}

// User management
export const setUser = (user: AuthUser): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
}

export const getUser = (): AuthUser | null => {
    if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem(USER_KEY)
        if (userStr) {
            try {
                return JSON.parse(userStr)
            } catch {
                return null
            }
        }
    }
    return null
}

export const removeUser = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_KEY)
    }
}

// Auth state
export const isAuthenticated = (): boolean => {
    return !!getToken()
}

// Logout
export const logout = (): void => {
    removeToken()
    removeUser()
    if (typeof window !== 'undefined') {
        // Only redirect if not already on auth page
        const currentPath = window.location.pathname
        if (!currentPath.startsWith('/auth/')) {
            window.location.href = '/auth/login'
        }
    }
}

// Get auth header
export const getAuthHeader = (): { Authorization: string } | {} => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

// Check if user has role
export const hasRole = (requiredRoles: string[]): boolean => {
    const user = getUser()
    if (!user) return false
    return requiredRoles.includes(user.role)
}

// Check if user is admin
export const isAdmin = (): boolean => {
    return hasRole(['company_admin', 'hr'])
}
