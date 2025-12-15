// Centralized API service for all HTTP requests

import { getToken, logout } from './auth'
import API_URL from './apiBase'
import type {
    ApiResponse,
    LoginRequest,
    LoginResponse,
    RegisterCompanyRequest,
    RegisterCompanyResponse,
    User,
    Award,
    KPI,
    PerformanceReview,
    Feedback,
    PDP,
    Attendance,
    CreateUserRequest,
    UpdateUserRequest,
    CreateAwardRequest,
    CreateKPIRequest,
    CreateFeedbackRequest,
    CreatePDPRequest,
} from './types'


// HTTP client with error handling
class ApiClient {
    private baseURL: string

    constructor(baseURL: string) {
        this.baseURL = baseURL
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const token = getToken()
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers,
            })

            // Handle 401 Unauthorized
            if (response.status === 401) {
                logout()
                throw new Error('Session expired. Please login again.')
            }

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Request failed')
            }

            return data
        } catch (error) {
            console.error('API Error:', error)
            throw error
        }
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET' })
    }

    async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        })
    }

    async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        })
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' })
    }
}

const client = new ApiClient(API_URL)

// Authentication API
export const authApi = {
    login: (data: LoginRequest) =>
        client.post<LoginResponse>('/api/auth/login', data),

    registerCompany: (data: RegisterCompanyRequest) =>
        client.post<RegisterCompanyResponse>('/api/auth/register-company', data),

    changePassword: (oldPassword: string, newPassword: string) =>
        client.post('/api/auth/change-password', { oldPassword, newPassword }),
}

// Users API
export const usersApi = {
    getAll: () => client.get<User[]>('/api/users'),

    getById: (userId: string) => client.get<User>(`/api/users/${userId}`),

    create: (data: CreateUserRequest) =>
        client.post<User>('/api/users', data),

    update: (userId: string, data: UpdateUserRequest) =>
        client.put<User>(`/api/users/${userId}`, data),

    delete: (userId: string) =>
        client.delete(`/api/users/${userId}`),

    getTeamMembers: (managerId: string) =>
        client.get<User[]>(`/api/users/team/${managerId}`),
}

// Awards API
export const awardsApi = {
    getAll: () => client.get<Award[]>('/api/awards'),

    getById: (id: string) => client.get<Award>(`/api/awards/${id}`),

    create: (data: CreateAwardRequest) =>
        client.post<Award>('/api/awards', data),

    update: (id: string, data: Partial<CreateAwardRequest>) =>
        client.put<Award>(`/api/awards/${id}`, data),

    delete: (id: string) => client.delete(`/api/awards/${id}`),

    getLeaderboard: () =>
        client.get<any[]>('/api/awards/leaderboard/top'),
}

// KPIs API
export const kpisApi = {
    getAll: () => client.get<KPI[]>('/api/kpis'),

    getById: (id: string) => client.get<KPI>(`/api/kpis/${id}`),

    create: (data: CreateKPIRequest) =>
        client.post<KPI>('/api/kpis', data),

    update: (id: string, data: Partial<CreateKPIRequest>) =>
        client.put<KPI>(`/api/kpis/${id}`, data),

    delete: (id: string) => client.delete(`/api/kpis/${id}`),
}

// Performance API
export const performanceApi = {
    getAll: () => client.get<PerformanceReview[]>('/api/performance'),

    getById: (id: string) =>
        client.get<PerformanceReview>(`/api/performance/${id}`),

    create: (data: any) =>
        client.post<PerformanceReview>('/api/performance', data),

    update: (id: string, data: any) =>
        client.put<PerformanceReview>(`/api/performance/${id}`, data),
}

// Feedback API
export const feedbackApi = {
    getAll: () => client.get<Feedback[]>('/api/feedback'),

    create: (data: CreateFeedbackRequest) =>
        client.post<Feedback>('/api/feedback', data),
}

// PDPs API
export const pdpsApi = {
    getAll: () => client.get<PDP[]>('/api/pdps'),

    getById: (id: string) => client.get<PDP>(`/api/pdps/${id}`),

    create: (data: CreatePDPRequest) =>
        client.post<PDP>('/api/pdps', data),

    update: (id: string, data: Partial<CreatePDPRequest>) =>
        client.put<PDP>(`/api/pdps/${id}`, data),

    delete: (id: string) => client.delete(`/api/pdps/${id}`),
}

// Attendance API
export const attendanceApi = {
    getAll: () => client.get<Attendance[]>('/api/attendance'),

    create: (data: any) =>
        client.post<Attendance>('/api/attendance', data),
}

// Invitations API
export const invitationsApi = {
    send: (data: { team_members: Array<{ email: string; role: string }>; company_domain?: string }) =>
        client.post<any>('/api/invitations/send', data),

    accept: (data: { invite_token: string; email: string; firstName: string; lastName: string; password: string }) =>
        client.post<any>('/api/invitations/accept', data),

    getPending: () =>
        client.get<any[]>('/api/invitations/pending'),

    resend: (data: { invitation_id: string; company_domain?: string }) =>
        client.post<any>('/api/invitations/resend', data),
}

// Reports API
export const reportsApi = {
    save: (data: { report_id?: string; type: string; title: string; content: string; tags?: string[] }) =>
        client.post<any>('/api/reports/save', data),

    submit: (data: { report_id: string }) =>
        client.post<any>('/api/reports/submit', data),

    getMyReports: (type?: string, status?: string) => {
        let url = '/api/reports/my-reports'
        const params = new URLSearchParams()
        if (type) params.append('type', type)
        if (status) params.append('status', status)
        if (params.toString()) url += '?' + params.toString()
        return client.get<any[]>(url)
    },

    getReport: (report_id: string) =>
        client.get<any>(`/api/reports/${report_id}`),

    deleteReport: (report_id: string) =>
        client.delete<any>(`/api/reports/${report_id}`),

    getAllSubmitted: (type?: string, status?: string, user_id?: string) => {
        let url = '/api/reports/admin/all'
        const params = new URLSearchParams()
        if (type) params.append('type', type)
        if (status) params.append('status', status)
        if (user_id) params.append('user_id', user_id)
        if (params.toString()) url += '?' + params.toString()
        return client.get<any[]>(url)
    },

    approve: (data: { report_id: string }) =>
        client.post<any>('/api/reports/admin/approve', data),

    reject: (data: { report_id: string; reason?: string }) =>
        client.post<any>('/api/reports/admin/reject', data),

    getAnalytics: (type?: string, month?: string) => {
        let url = '/api/reports/admin/analytics'
        const params = new URLSearchParams()
        if (type) params.append('type', type)
        if (month) params.append('month', month)
        if (params.toString()) url += '?' + params.toString()
        return client.get<any>(url)
    },

    generateSummary: (data: { fromType: string; toType: string }) =>
        client.post<any>('/api/reports/generate-summary', data),
}

export const companyApi = {
    getBranding: () => client.get<any>('/api/company/branding'),
    updateBranding: (data: { 
        primaryColor?: string
        secondaryColor?: string
        accentColor?: string
        backgroundColor?: string
        textColor?: string
        borderRadius?: string
        fontFamily?: string
        buttonStyle?: string
        logo?: string 
    }) =>
        client.post<any>('/api/company/branding', data),
}

// Export all APIs
export const api = {
    auth: authApi,
    users: usersApi,
    awards: awardsApi,
    kpis: kpisApi,
    performance: performanceApi,
    feedback: feedbackApi,
    pdps: pdpsApi,
    attendance: attendanceApi,
    invitations: invitationsApi,
    reports: reportsApi,
    company: companyApi,
}

export default api
