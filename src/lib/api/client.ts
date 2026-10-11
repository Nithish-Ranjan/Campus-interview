import { mockBackend } from './mockEngine';
import type { UserRole, Company, StudentApplication, Interview, User, StudentProfileData, MatchReport } from './types';

// Central API Base URL - uses Vite same-origin /api proxy in development
const API_BASE_URL = (typeof window !== 'undefined' && (window as any).__API_URL__) || '/api';

// Helper to simulate realistic async network roundtrips for mock fallbacks
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export type DataSourceStatus = 'postgres' | 'mock_fallback';
let currentDataSource: DataSourceStatus = 'postgres';
const dataSourceListeners = new Set<(status: DataSourceStatus) => void>();

let currentToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('pc_token') : null;

export function getAuthToken(): string | null {
  if (currentToken) return currentToken;
  if (typeof window !== 'undefined') {
    currentToken = localStorage.getItem('pc_token');
  }
  return currentToken;
}

export function setAuthToken(token: string | null) {
  currentToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('pc_token', token);
    else localStorage.removeItem('pc_token');
  }
}

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
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const headers: Record<string, string> = {};
    if (!(options?.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: { ...headers, ...options?.headers }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 409 || res.status === 401 || res.status === 403 || res.status === 415) {
        const errorData = await res.json().catch(() => null);
        throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { status: res.status, error: errorData });
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    setDataSource('postgres');
    return data as T;
  } catch (err: any) {
    if (err.status === 409 || err.status === 401 || err.status === 403 || err.status === 415) {
      throw err; // don't fallback on client business or permission errors
    }
    console.warn(`[apiClient] Backend API call to ${url} failed (${err.message}). Falling back to mockEngine.`);
    setDataSource('mock_fallback');
    return await fallbackFn();
  }
}

export const apiClient = {
  // Auth & Session
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Authentication failed' }));
      throw new Error(err.error || 'Authentication failed');
    }

    const data = await res.json();
    setAuthToken(data.token);
    setDataSource('postgres');
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      setAuthToken(null);
    }
  },

  async getMe(): Promise<User> {
    return fetchWithFallback<User>(
      `${API_BASE_URL}/auth/me`,
      async () => {
        await delay(120);
        return mockBackend.getCurrentUser();
      }
    ).then((res: any) => res.user || res);
  },

  async switchRole(role: UserRole): Promise<User> {
    // If backend is running, log in as standard demo account for that role
    const demoAccounts: Record<string, string> = {
      admin: 'admin@placement.example',
      officer: 'officer@placement.example',
      coordinator: 'coordinator@placement.example',
      panel_coordinator: 'panel@placement.example',
      student: 'student@placement.example'
    };

    const targetEmail = demoAccounts[role];
    if (targetEmail) {
      try {
        const loginRes = await apiClient.login(targetEmail, 'Demo@2026!');
        return loginRes.user;
      } catch (err) {
        console.warn(`Could not log in to live demo account for ${role}:`, err);
      }
    }

    // Local fallback
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

  // 2. Candidates & Students
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

  async getStudentMe(): Promise<StudentProfileData> {
    return fetchWithFallback<StudentProfileData>(
      `${API_BASE_URL}/students/me`,
      async () => {
        await delay(150);
        const stu = await mockBackend.getStudentById('stu-001');
        return {
          student: {
            ...(stu ? stu.student : {} as any),
            academicYear: '4th Year',
            graduationYear: 2027,
            collegeName: 'Apex Institute of Technology'
          },
          applications: stu?.applications || [],
          interviews: (stu?.interviews || []).map((iv: any) => ({
            id: iv.id,
            scheduledStart: iv.scheduledStart,
            scheduledEnd: iv.scheduledEnd,
            status: iv.status || 'scheduled',
            companyName: iv.companyName || 'Asteria Systems',
            roomName: iv.roomName || 'Room A',
            building: 'Newton Hall'
          })),
          notifications: [
            {
              id: 'notif-1',
              title: 'Interview Slot Confirmed',
              message: 'Your Round 1 Technical interview for Asteria Systems is confirmed for 09:30 AM in Room A.',
              type: 'schedule_change',
              isRead: false,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
    );
  },

  async updateStudentMe(data: {
    name?: string;
    email?: string;
    phone?: string;
    collegeName?: string;
    skills?: string[];
    academicYear?: string;
    graduationYear?: number;
  }) {
    let token = getAuthToken();

    const doPatch = async (authToken: string | null) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      return await fetch(`${API_BASE_URL}/students/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify(data)
      });
    };

    let res: Response | null = null;
    try {
      res = await doPatch(token);
    } catch (err: any) {
      console.warn('Patch me request error:', err);
    }

    if (!res || res.status === 401 || res.status === 403) {
      try {
        const auth = await this.login('student@placement.example', 'Demo@2026!');
        token = auth.token;
        setAuthToken(token);
        res = await doPatch(token);
      } catch (loginErr) {
        console.warn('Student login auto refresh failed:', loginErr);
      }
    }

    if (res && res.ok) {
      return await res.json();
    }
    if (res) {
      const err = await res.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(err.error || 'Update failed');
    }
    return data;
  },

  async uploadMyResume(file: File) {
    let token = getAuthToken();

    const doUpload = async (authToken: string | null) => {
      const formData = new FormData();
      formData.append('resume', file);
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      return await fetch(`${API_BASE_URL}/students/me/resume`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData
      });
    };

    let res: Response | null = null;
    try {
      res = await doUpload(token);
    } catch (netErr: any) {
      console.warn('Network upload attempt failed:', netErr);
    }

    // If 401 (token expired) or 403 (e.g. coordinator token stored), auto re-authenticate as student
    if (!res || res.status === 401 || res.status === 403) {
      try {
        const auth = await this.login('student@placement.example', 'Demo@2026!');
        token = auth.token;
        setAuthToken(token);
        res = await doUpload(token);
      } catch (loginErr) {
        console.warn('Auto student login refresh failed:', loginErr);
      }
    }

    if (res && res.ok) {
      return await res.json();
    }

    if (res) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }

    // Fallback if backend was completely unreachable
    return {
      success: true,
      message: 'Resume uploaded (offline demo mode)',
      fileName: file.name,
      fileSize: file.size,
      isAiParsed: false,
      parsedResume: {
        skills: ['Problem Solving', 'Data Structures & Algorithms', 'Communication'],
        tools: ['Git', 'VS Code'],
        projects: [],
        experience: [],
        education: []
      }
    };
  },

  async uploadStudentResume(studentId: string, file: File) {
    let token = getAuthToken();

    const doUpload = async (authToken: string | null) => {
      const formData = new FormData();
      formData.append('resume', file);
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      return await fetch(`${API_BASE_URL}/students/${encodeURIComponent(studentId)}/resume`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData
      });
    };

    let res: Response | null = null;
    try {
      res = await doUpload(token);
    } catch (netErr: any) {
      console.warn('Staff network upload attempt failed:', netErr);
    }

    // If 401 (token expired) or 403 (e.g. student token stored), auto re-authenticate as coordinator
    if (!res || res.status === 401 || res.status === 403) {
      try {
        const auth = await this.login('coordinator@placement.example', 'Demo@2026!');
        token = auth.token;
        setAuthToken(token);
        res = await doUpload(token);
      } catch (loginErr) {
        console.warn('Auto staff login refresh failed:', loginErr);
      }
    }

    if (res && res.ok) {
      return await res.json();
    }

    if (res) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }

    // Fallback if backend was unreachable
    return {
      success: true,
      message: 'Candidate resume uploaded (offline demo mode)',
      fileName: file.name,
      fileSize: file.size,
      isAiParsed: false,
      parsedResume: {
        skills: ['Problem Solving', 'Data Structures & Algorithms', 'Communication'],
        tools: ['Git', 'VS Code'],
        projects: [],
        experience: [],
        education: []
      }
    };
  },

  getMyResumeUrl(): string {
    const token = getAuthToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/students/me/resume${tokenParam}`;
  },

  getStudentResumeUrl(studentId: string): string {
    const token = getAuthToken();
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${API_BASE_URL}/students/${encodeURIComponent(studentId)}/resume${tokenParam}`;
  },

  // 3. AI & Match Analysis
  async getMatchReport(studentId: string, companyId: string): Promise<MatchReport> {
    return fetchWithFallback<MatchReport>(
      `${API_BASE_URL}/ai/match/${encodeURIComponent(studentId)}/${encodeURIComponent(companyId)}`,
      async () => {
        await delay(200);
        return {
          studentId,
          companyId,
          companyName: 'Asteria Systems',
          roleTitle: 'Software Engineer',
          eligibility: 'eligible',
          mandatoryPassed: true,
          mandatoryReasons: ['CGPA >= 7.5 satisfied', 'Zero active backlogs satisfied'],
          matchScore: 92,
          matchingSkills: [
            { skill: 'React', evidence: 'Demonstrated in frontend coursework & web project.' },
            { skill: 'Node.js', evidence: 'Used in RESTful API development.' },
            { skill: 'PostgreSQL', evidence: 'Implemented relational models.' }
          ],
          missingSkills: ['Kubernetes'],
          relevantProjects: [
            { title: 'Campus Interview Scheduler', relevance: 'Full-stack concurrent system architecture.' }
          ],
          preparationSuggestions: ['Prepare system design concepts and database indexing.'],
          limitations: 'AI matching is advisory; deterministic mandatory gates remain authoritative.',
          isAiGenerated: false,
          modelUsed: 'mock-engine',
          evaluatedAt: new Date().toISOString()
        };
      }
    );
  },

  async evaluateMatch(studentId: string, companyId: string): Promise<MatchReport> {
    return fetchWithFallback<MatchReport>(
      `${API_BASE_URL}/ai/match/${encodeURIComponent(studentId)}/${encodeURIComponent(companyId)}`,
      () => this.getMatchReport(studentId, companyId),
      { method: 'POST' }
    );
  },

  // 4. Notifications
  async getMyNotifications() {
    return fetchWithFallback(
      `${API_BASE_URL}/notifications/me`,
      async () => {
        await delay(120);
        return [];
      }
    );
  },

  async markNotificationRead(id: string) {
    return fetchWithFallback(
      `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
      async () => {
        await delay(100);
        return { id, isRead: true };
      },
      { method: 'POST' }
    );
  },

  // 5. Companies
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

  async createCompany(data: {
    name: string;
    roleTitle: string;
    roundName?: string;
    slots?: number;
    mandatoryCriteria?: any[];
    preferredCriteria?: any[];
  }): Promise<Company> {
    return fetchWithFallback<Company>(
      `${API_BASE_URL}/companies`,
      async () => {
        await delay(200);
        return mockBackend.createCompany(data as any);
      },
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  },

  async updateCriteria(
    companyId: string,
    mandatory: any[],
    preferred: any[],
    expectedVersion: number
  ): Promise<Company> {
    return fetchWithFallback<Company>(
      `${API_BASE_URL}/companies/${encodeURIComponent(companyId)}/criteria`,
      async () => {
        await delay(250);
        return mockBackend.updateCompanyCriteria(companyId, mandatory, preferred, expectedVersion);
      },
      {
        method: 'PUT',
        body: JSON.stringify({
          mandatoryCriteria: mandatory,
          preferredCriteria: preferred,
          expectedVersion
        })
      }
    );
  },

  // 6. Eligibility & Capacity
  async getEligibility(companyId: string, status?: string) {
    await delay(180);
    return mockBackend.getEligibilityResults(companyId, status);
  },

  async getExplanation(applicationId: string) {
    await delay(120);
    return mockBackend.getApplicationExplanation(applicationId);
  },

  async getCapacity(companyId: string) {
    await delay(150);
    return mockBackend.getCompanyCapacity(companyId);
  },

  async runAllocation(companyId: string, newSlots?: number) {
    await delay(300);
    return mockBackend.runCapacityAllocation(companyId, newSlots);
  },

  // 7. Schedule Board
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

  async createInterview(data: {
    studentId: string;
    companyId: string;
    roomId: string;
    scheduledStart: string;
    scheduledEnd?: string;
    interviewerIds?: string[];
    scheduleMode?: 'published' | 'draft' | 'simulation';
  }): Promise<Interview> {
    return fetchWithFallback(
      `${API_BASE_URL}/interviews`,
      async () => {
        await delay(220);
        return mockBackend.createInterview(data);
      },
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );
  },

  async submitDraft(note: string) {
    await delay(300);
    return mockBackend.submitDraftForApproval(note);
  },

  // 8. Live Operations
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

  // 9. Disruption Simulation & Recovery
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

  // 10. Proposals & Approvals
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

  // 11. Audit
  async getAudit(limit?: number): Promise<any[]> {
    return fetchWithFallback<any[]>(`${API_BASE_URL}/audit?limit=${limit || 50}`, () => Promise.resolve(mockBackend.getAudit(limit)));
  },

  // 12. Users
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
