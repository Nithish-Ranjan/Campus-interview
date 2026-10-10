import { mockBackend } from './mockEngine';
import type { UserRole } from './types';

// Helper to simulate realistic async network roundtrips
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const apiClient = {
  // Auth & Session
  async getMe() {
    await delay(120);
    return mockBackend.getCurrentUser();
  },

  async switchRole(role: UserRole) {
    await delay(100);
    mockBackend.setCurrentUserRole(role);
    return mockBackend.getCurrentUser();
  },

  // Overview
  async getOverview(companyId?: string) {
    await delay(150);
    return mockBackend.getOverview(companyId);
  },

  // Students & Candidates
  async getStudents(params: {
    query?: string;
    branch?: string;
    companyId?: string;
    eligibility?: string;
    selection?: string;
  }) {
    await delay(180);
    return mockBackend.getStudents(params);
  },

  async getStudentById(id: string) {
    await delay(150);
    return mockBackend.getStudentById(id);
  },

  // Companies
  async getCompanies() {
    await delay(120);
    return mockBackend.getCompanies();
  },

  async getCompanyById(id: string) {
    await delay(120);
    return mockBackend.getCompanyById(id);
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

  // Schedule
  async getSchedule(mode: 'published' | 'draft' | 'simulation' = 'published') {
    await delay(180);
    return mockBackend.getSchedule(mode);
  },

  async moveInterview(interviewId: string, targetRoomId: string, targetStart: string) {
    await delay(220);
    return mockBackend.moveInterviewDraft(interviewId, targetRoomId, targetStart);
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
  async runSimulation(type: string, targetId: string, delayMinutes?: number) {
    await delay(350);
    return mockBackend.runSimulation(type, targetId, delayMinutes);
  },

  async createProposal(simulationId: string, alternativeId: string, note: string) {
    await delay(300);
    return mockBackend.createProposalFromAlternative(simulationId, alternativeId, note);
  },

  // Proposals & Approvals
  async getProposals() {
    await delay(150);
    return mockBackend.getProposals();
  },

  async getProposalById(id: string) {
    await delay(120);
    return mockBackend.getProposalById(id);
  },

  async decideProposal(proposalId: string, decision: 'approve' | 'reject', note?: string) {
    await delay(350);
    return mockBackend.decideProposal(proposalId, decision, note);
  },

  // Audit
  async getAudit(limit?: number) {
    await delay(150);
    return mockBackend.getAudit(limit);
  },

  // Users
  async getUsers() {
    await delay(120);
    return mockBackend.getUsers();
  },

  async updateUserRole(userId: string, role: UserRole) {
    await delay(200);
    return mockBackend.updateUserRole(userId, role);
  },

  // Demo Controls
  async resetDemo() {
    await delay(200);
    mockBackend.resetToInitialState();
    return { success: true };
  }
};
