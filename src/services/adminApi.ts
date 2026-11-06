import type { 
  AdminUser, 
  CapacityReservation, 
  VideoQueueItem, 
  VoiceSessionItem, 
  PlanLimitConfig, 
  GlobalBroadcastConfig, 
  AdminAuditLog, 
  SecurityAnomaly, 
  ProviderHealth,
  DashboardMetrics,
  PlanTier,
  UserStatus
} from '../types/admin';

class AdminApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('trelvix_admin_token', token);
    } else {
      localStorage.removeItem('trelvix_admin_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('trelvix_admin_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      const err = new Error(errorData.error || 'Access Denied: Administrative privileges required.');
      (err as any).status = 403;
      (err as any).is_admin = false;
      throw err;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const err = new Error(errorData.error || `HTTP error ${response.status}`);
      (err as any).status = response.status;
      throw err;
    }

    return response.json();
  }

  // Auth verification
  async verifyAuth(): Promise<{ authenticated: boolean; is_admin: boolean; user?: any }> {
    return this.request('/api/admin/auth/verify');
  }

  // Module A: Metrics & Status
  async getMetrics(): Promise<DashboardMetrics> {
    return this.request('/api/admin/metrics');
  }

  async getProviderStatus(): Promise<ProviderHealth[]> {
    return this.request('/api/admin/provider-status');
  }

  async pingProviders(): Promise<{ message: string; providers: ProviderHealth[] }> {
    return this.request('/api/admin/provider-status/ping', { method: 'POST' });
  }

  // Module B: Users & Moderation
  async getUsers(params: {
    search?: string;
    plan?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: AdminUser[]; total: number; page: number; limit: number; total_pages: number }> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.plan) searchParams.set('plan', params.plan);
    if (params.status) searchParams.set('status', params.status);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());

    return this.request(`/api/admin/users?${searchParams.toString()}`);
  }

  async getUser(id: string): Promise<AdminUser> {
    return this.request(`/api/admin/users/${id}`);
  }

  async updateUserStatus(id: string, status: UserStatus, reason: string): Promise<{ message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  }

  async overrideUserPlan(id: string, plan: PlanTier, reason: string): Promise<{ message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}/plan`, {
      method: 'POST',
      body: JSON.stringify({ plan, reason }),
    });
  }

  async grantBonusCredits(id: string, amount: number, reason: string): Promise<{ message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}/bonus`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  }

  async resetUserUsage(id: string, reset_type: 'daily_capacity' | 'monthly_tts' | 'all'): Promise<{ message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}/reset-usage`, {
      method: 'POST',
      body: JSON.stringify({ reset_type }),
    });
  }

  async delegateAdminRole(id: string, is_admin: boolean, role: 'user' | 'admin' | 'super_admin'): Promise<{ message: string; user: AdminUser }> {
    return this.request(`/api/admin/users/${id}/role`, {
      method: 'POST',
      body: JSON.stringify({ is_admin, role }),
    });
  }

  // Module C: Reservations & Refunds
  async getReservations(params?: { status?: string; search?: string }): Promise<CapacityReservation[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    return this.request(`/api/admin/reservations?${searchParams.toString()}`);
  }

  async refundReservation(reservationId: string): Promise<{ message: string; reservation: CapacityReservation }> {
    return this.request(`/api/admin/reservations/${reservationId}/refund`, {
      method: 'POST',
    });
  }

  // Module D: Video & Voice
  async getVideoQueue(): Promise<VideoQueueItem[]> {
    return this.request('/api/admin/video-queue');
  }

  async handleVideoAction(id: string, action: 'retry' | 'refund_and_fail'): Promise<{ message: string; job: VideoQueueItem }> {
    return this.request(`/api/admin/video-queue/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async getLiveVoiceSessions(): Promise<VoiceSessionItem[]> {
    return this.request('/api/admin/live-sessions');
  }

  async terminateVoiceSession(id: string): Promise<{ message: string; killed_session_id: string }> {
    return this.request(`/api/admin/live-sessions/${id}/kill`, {
      method: 'POST',
    });
  }

  // Module E: Plan Limits & Broadcast
  async getPlanLimits(): Promise<Record<string, PlanLimitConfig>> {
    return this.request('/api/admin/plan-limits');
  }

  async updatePlanLimits(tier: PlanTier, updates: Partial<PlanLimitConfig>): Promise<{ message: string; limits: PlanLimitConfig }> {
    return this.request('/api/admin/plan-limits', {
      method: 'PUT',
      body: JSON.stringify({ tier, updates }),
    });
  }

  async getBroadcast(): Promise<GlobalBroadcastConfig> {
    return this.request('/api/admin/broadcast');
  }

  async updateBroadcast(config: Partial<GlobalBroadcastConfig>): Promise<{ message: string; broadcast: GlobalBroadcastConfig }> {
    return this.request('/api/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Module F: Audit & Security
  async getAuditLogs(): Promise<AdminAuditLog[]> {
    return this.request('/api/admin/audit-logs');
  }

  async getAnomalies(): Promise<SecurityAnomaly[]> {
    return this.request('/api/admin/anomalies');
  }

  async getSqlSchema(): Promise<{ sql: string; is_supabase_connected: boolean }> {
    return this.request('/api/admin/sql-schema');
  }
}

export const adminApi = new AdminApiClient();
