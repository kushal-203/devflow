export type Role = 'ADMIN' | 'QA' | 'DEVELOPER' | 'VIEWER';
export type IssueStatus = 'BACKLOG' | 'IN_PROGRESS' | 'QA' | 'DONE' | 'VERIFIED';
export type IssueType = 'BUG' | 'STORY' | 'TASK';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Priority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface User { id: string; email: string; name: string; role: Role }
export interface Person { id: string; name: string; email?: string; role?: Role }

export interface Sprint { id: string; projectId: string; name: string; goal: string; status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'; startDate: string | null; endDate: string | null }
export interface Project { id: string; key: string; name: string; description: string; issueCount?: number; openIssueCount?: number; sprints?: Sprint[] }

export interface BoardIssue { id: string; key: string; title: string; type: IssueType; status: IssueStatus; severity: Severity | null; priority: Priority; position: number; assignee: Person | null }
export interface BoardColumn { status: IssueStatus; title: string; issues: BoardIssue[] }
export interface Board { project: { id: string; key: string; name: string }; sprint: Sprint | null; columns: BoardColumn[]; totalIssues: number }

export interface TriageTestCase { title: string; steps: string[]; expected: string }
export interface Triage {
  severity: Severity; suggestedPriority: Priority; confidence: number; rationale: string; labels: string[];
  suggestedTestSteps: string[]; suggestedTestCases: TriageTestCase[];
  provider: 'mock' | 'claude' | 'mock-fallback'; model: string | null; latencyMs: number; fallbackReason?: string;
}

export interface Issue {
  id: string; key: string; number: number; projectId: string; sprintId: string | null; title: string; description: string;
  stepsToReproduce: string; type: IssueType; status: IssueStatus; severity: Severity | null; priority: Priority; position: number;
  reporter: Person; assignee: Person | null; aiTriage: Triage | null; createdAt: string; updatedAt: string; allowedTransitions?: IssueStatus[];
}

export interface IssueEvent { id: string; type: string; fromStatus: IssueStatus | null; toStatus: IssueStatus | null; message: string; createdAt: string; actor: Person }
export interface TestCase { id: string; title: string; steps: string[]; expected: string; source: 'AI' | 'MANUAL'; createdAt: string }

export interface Dashboard {
  byStatus: Record<IssueStatus, number>; openIssues: number; criticalOpen: number;
  recentActivity: Array<{ id: string; type: string; message: string; actor: string; createdAt: string; issue: { id: string; key: string; title: string; projectId: string } }>;
}
