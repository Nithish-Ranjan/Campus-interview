import { mockBackend } from './mockEngine';
import type { UserRole, Company, StudentApplication, Interview } from './types';

// Central API Base URL - points to the Express + PostgreSQL backend on port 4000
const API_BASE_URL = (typeof window !== 'undefined' && (window as any).__API_URL__) || 'http://localhost:4000/api';

// Helper to simulate realistic async network roundtrips for mock fallbacks
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export type DataSourceStatus = 'postgres' | 'mock_fallback';
let currentDataSource: DataSourceStatus = 'postgres';
const dataSourceListeners = new Set<(status: DataSourceStatus) => void>();

export function getDataSourceStatus(): DataSourceStatus {
  return currentDataSource;
}

function setDataSource(status: DataSourceStatus) {
  if (currentDataSource !== status) {
    currentDataSource = status;
    dataSourceListeners.forEach(listener => listener(status));
  }
}

export function subscribeDataSourceStatus(callback: (status: DataSourceStatus) => void): () => void {
  dataSourceListeners.add(callback);
  callback(currentDataSource);
  return () => dataSourceListeners.delete(callback);
}

/**
 * Fetch wrapper with timeout and fallback tracking
 */
async function fetchWithFallback<T>(url: string, fallbackFn: () => Promise<T>, options?: RequestInit): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 409) {
        const errorData = await res.json().catch(() => null);
        throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { status: 409, error: errorData });
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    setDataSource('postgres');
    return data as T;
  } catch (err: any) {
    if (err.status === 409) {
      throw err; // don't fallback on a business logic conflict
    }
    console.warn(`[apiClient] Backend API call to ${url} failed (${err.message}). Falling back to mockEngine.`);
    setDataSource('mock_fallback');
    return await fallbackFn();
  }
}

export const apiClient = {
  // Auth & Session (Handled locally/in-memory for demo roles)
  async getMe() {
    await delay(120);
    return mockBackend.getCurrentUser();
  },

  async switchRole(role: UserRole) {
    await delay(100);
    mockBackend.setCurrentUserRole(role);
    return mockBackend.getCurrentUser();
  },

  // 1. Overview Dashboard (Real PostgreSQL Data with Mock Fallback)
  async getOverview(companyId?: string) {
    const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
    return fetchWithFallback(
      `${API_BASE_URL}/overview${query}`,
      async () => {
        await delay(150);
        return mockBackend.getOverview(companyId);
      }
    );
  },

  // 2. Candidates & Students (Real PostgreSQL Data with Mock Fallback)
  async getStudents(params: {
    query?: string;
    branch?: string;
    companyId?: string;
    eligibility?: string;
    selection?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.branch) searchParams.set('branch', params.branch);
    if (params.companyId) searchParams.set('companyId', params.companyId);
    if (params.eligibility) searchParams.set('eligibility', params.eligibility);
    if (params.selection) searchParams.set('selection', params.selection);

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return fetchWithFallback(
      `${API_BASE_URL}/students${queryString}`,
      async () => {
        await delay(180);
        return mockBackend.getStudents(params);
      }
    );
  },

  async getStudentById(id: string) {
    return fetchWithFallback(
      `${API_BASE_URL}/students/${encodeURIComponent(id)}`,
      async () => {
        await delay(150);
        return mockBackend.getStudentById(id);
      }
    );
  },

  // 3. Companies (Real PostgreSQL Data with Mock Fallback)
  async getCompanies(): Promise<Company[]> {
    return fetchWithFallback(
      `${API_BASE_URL}/companies`,
      async () => {
        await delay(120);
        return mockBackend.getCompanies();
      }
    );
  },

  async getCompanyById(id: string): Promise<Company | null> {
    return fetchWithFallback(
      `${API_BASE_URL}/companies/${encodeURIComponent(id)}`,
      async () => {
        await delay(120);
        return mockBackend.getCompanyById(id);
      }
    );
  },

  async createCompany(data: { name: string; roleTitle: string; roundName: string; slots: number }) {
    await delay(200);
    return mockBackend.createCompany(data);
  },

  async updateCriteria(companyId: string, mandatory: any[], preferred: any[], expectedVersion: number) {
    await delay(250);
    return mockBackend.updateCompanyCriteria(companyId, mandatory, preferred, expectedVersion);
  },

  // Eligibility
  async getEligibility(companyId: string, status?: string) {
    await delay(180);
    return mockBackend.getEligibilityResults(companyId, status);
  },

  async getExplanation(applicationId: string) {
    await delay(120);
    return mockBackend.getApplicationExplanation(applicationId);
  },

  // Capacity
  async getCapacity(companyId: string) {
    await delay(150);
    return mockBackend.getCompanyCapacity(companyId);
  },

  async runAllocation(companyId: string, newSlots?: number) {
    await delay(300);
    return mockBackend.runCapacityAllocation(companyId, newSlots);
  },

  // 4. Schedule Board (Real PostgreSQL Data with Mock Fallback)
  async getSchedule(mode: 'published' | 'draft' | 'simulation' = 'published'): Promise<{ version: number; interviews: Interview[]; hasDraft?: boolean }> {
    return fetchWithFallback(
      `${API_BASE_URL}/interviews?mode=${encodeURIComponent(mode)}`,
      async () => {
        await delay(180);
        return mockBackend.getSchedule(mode);
      }
    );
  },

  async moveInterview(interviewId: string, targetRoomId: string, targetStart: string) {
    return fetchWithFallback(
      `${API_BASE_URL}/interviews/${encodeURIComponent(interviewId)}/move`,
      async () => {
        await delay(220);
        return mockBackend.moveInterviewDraft(interviewId, targetRoomId, targetStart);
      },
      {
        method: 'PUT',
        body: JSON.stringify({ targetRoomId, targetStart })
      }
    );
  },

  async submitDraft(note: string) {
    await delay(300);
    return mockBackend.submitDraftForApproval(note);
  },

  // Live Operations
  async getLiveOperations() {
    await delay(140);
    return mockBackend.getLiveOperations();
  },

  async updateInterviewStatus(interviewId: string, status: any) {
    await delay(200);
    return mockBackend.updateInterviewStatus(interviewId, status);
  },

  async markInterviewDelayed(interviewId: string, delayMinutes: number, reason: string) {
    await delay(250);
    return mockBackend.markInterviewDelayed(interviewId, delayMinutes, reason);
  },

  // Disruption Simulation & Recovery
  async runSimulation(type: string, targetId: string, delayMinutes?: number): Promise<any> {
    return fetchWithFallback<any>(
      `${API_BASE_URL}/recovery-proposals/generate`,
      () => Promise.resolve(mockBackend.runSimulation(type, targetId, delayMinutes)),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, targetId, delayMinutes })
      }
    );
  },

  async createProposal(simulation: any, alternativeId: string, note: string): Promise<any> {
    return fetchWithFallback<any>(
      `${API_BASE_URL}/recovery-proposals`,
      () => Promise.resolve(mockBackend.createProposalFromAlternative(simulation.id, alternativeId, note)),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: simulation.type, 
          targetId: simulation.targetId, 
          delayMinutes: simulation.delayMinutes, 
          alternativeId, 
          note 
        })
      }
    );
  },

  // Proposals & Approvals
  async getProposals(): Promise<any[]> {
    return fetchWithFallback<any[]>(`${API_BASE_URL}/recovery-proposals`, () => Promise.resolve(mockBackend.getProposals()));
  },

  async getProposalById(id: string): Promise<any> {
    return fetchWithFallback<any>(`${API_BASE_URL}/recovery-proposals/${id}`, () => Promise.resolve(mockBackend.getProposalById(id)));
  },

  async decideProposal(proposalId: string, decision: 'approve' | 'reject', note?: string): Promise<any> {
    const res = await fetchWithFallback<any>(
      `${API_BASE_URL}/recovery-proposals/${proposalId}/decide`,
      () => Promise.resolve(mockBackend.decideProposal(proposalId, decision, note)),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note })
      }
    );
    if (decision === 'approve' && res && res.status === 'approved') {
       await fetchWithFallback<any>(`${API_BASE_URL}/recovery-proposals/${proposalId}/apply`, () => Promise.resolve({ success: true }), { method: 'POST' });
    }
    return res;
  },

  // Audit
  async getAudit(limit?: number): Promise<any[]> {
    return fetchWithFallback<any[]>(`${API_BASE_URL}/audit?limit=${limit || 50}`, () => Promise.resolve(mockBackend.getAudit(limit)));
  },

  // Users
  async getUsers(): Promise<any[]> {
    return fetchWithFallback<any[]>(`${API_BASE_URL}/users`, () => Promise.resolve(mockBackend.getUsers()));
  },

  async updateUserRole(userId: string, role: UserRole): Promise<any> {
    return fetchWithFallback<any>(
      `${API_BASE_URL}/users/${userId}/role`,
      () => Promise.resolve(mockBackend.updateUserRole(userId, role)),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      }
    );
  },

  // Demo Controls
  async resetDemo() {
    await delay(200);
    mockBackend.resetToInitialState();
    return { success: true };
  }
};
