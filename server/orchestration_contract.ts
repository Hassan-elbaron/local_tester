/**
 * Orchestration Contract
 * ──────────────────────────────────────────────────────────────────────────────
 * Unified type contract that enforces clear boundaries between the four core
 * brain stages: Think → Deliberate → Decide → Execute → Record
 *
 * Nothing passes between orchestration layers without conforming to these
 * interfaces. This prevents scattered decision logic and enables a single
 * auditable control plane.
 */

// ─── Stage Enum ───────────────────────────────────────────────────────────────
export type BrainStage =
  | "intake"
  | "context_build"
  | "deliberation"
  | "decision"
  | "execution_plan"
  | "execution_run"
  | "memory_write"
  | "done";

// ─── Task Types (maps to agent domains) ──────────────────────────────────────
export type BrainTaskType =
  | "strategy"
  | "content"
  | "campaign"
  | "analytics"
  | "research"
  | "compliance"
  | "budget"
  | "community"
  | "watchman"
  | "optimization"
  | "support"
  | "futurist";

// ─── Action Types ─────────────────────────────────────────────────────────────
export type BrainActionType =
  | "analyze"
  | "recommend"
  | "approve"
  | "reject"
  | "revise"
  | "build"
  | "launch"
  | "monitor"
  | "learn";

// ─── Evidence ─────────────────────────────────────────────────────────────────
export interface BrainEvidence {
  source: "db" | "memory" | "llm" | "user" | "system" | "external_api";
  key: string;
  summary: string;
  payload?: unknown;
}

// ─── Task Envelope ────────────────────────────────────────────────────────────
export interface BrainTask {
  id: string;
  companyId: number;
  proposalId?: number;
  type: BrainTaskType;
  action: BrainActionType;
  title: string;
  description: string;
  input: Record<string, unknown>;
  constraints?: string[];
  requestedBy?: string;
  stage: BrainStage;
  createdAt: string;
}

// ─── Agent Assessment ─────────────────────────────────────────────────────────
export interface AgentAssessment {
  agentId: string;
  agentRole: BrainTaskType | string;
  opinion: string;
  recommendation: string;
  confidence: number;
  riskScore: number;
  votedFor: boolean;
  concerns: string[];
  suggestions: string[];
  evidence: BrainEvidence[];
}

// ─── Deliberation Bundle ──────────────────────────────────────────────────────
export interface DeliberationBundle {
  task: BrainTask;
  round: "proposal" | "critique" | "revision" | "scoring" | "final";
  assessments: AgentAssessment[];
  weightedConsensus: number;
  averageConfidence: number;
  averageRisk: number;
  dissentCount: number;
}

// ─── Brain Decision ───────────────────────────────────────────────────────────
export interface BrainDecision {
  companyId: number;
  proposalId?: number;
  taskId: string;
  status: "pending_approval" | "approved" | "rejected" | "needs_revision";
  recommendation: string;
  reason: string;
  confidence: number;
  riskScore: number;
  requiresHumanApproval: boolean;
  executionAllowed: boolean;
  selectedAgents: string[];
  dissentSummary: string[];
  evidence: BrainEvidence[];
  createdAt: string;
}

// ─── Execution Receipt ────────────────────────────────────────────────────────
export interface ExecutionReceipt {
  executor: string;
  status: "planned" | "running" | "completed" | "failed" | "blocked";
  externalRef?: string;
  summary: string;
  payload?: unknown;
  executedAt?: string;
}

// ─── Execution Gate Result ────────────────────────────────────────────────────
export interface ExecutionGateResult {
  allowed: boolean;
  reason: string;
}

// ─── Execution Request ────────────────────────────────────────────────────────
export interface BrainExecutionRequest {
  companyId: number;
  proposalId?: number;
  taskId: string;
  decision: BrainDecision;
  mode: "internal" | "external";
  target: string;
  payload: Record<string, unknown>;
}

// ─── Memory Write Request ─────────────────────────────────────────────────────
export interface MemoryWriteRequest {
  companyId: number;
  scope:
    | "company"
    | "decision"
    | "learning"
    | "research"
    | "execution"
    | "agent_interaction";
  key: string;
  value: unknown;
  confidence?: number;
  source: string;
}

// ─── Autonomy Levels ──────────────────────────────────────────────────────────
// L1: insight / read-only analysis only
// L2: recommendation — no execution, no approval gate
// L3: recommendation + requires human approval before execution
// L4: auto-execution allowed for low-risk tasks (confidence ≥ threshold)
// L5: full autonomy — system executes without any human gate
export type AutonomyLevel = "L1" | "L2" | "L3" | "L4" | "L5";

export interface AutonomyPolicyDecision {
  level: AutonomyLevel;
  executionAllowed: boolean;
  requiresHumanApproval: boolean;
  reasoning: string;
}

// ─── Human Approval Record ────────────────────────────────────────────────────
// Produced whenever a human explicitly approves or rejects a pending decision.
// Persisted to execution_logs for a complete audit trail.
export interface BrainApproval {
  taskId: string;
  companyId: number;
  proposalId?: number;
  approved: boolean;
  approvedBy: string;
  note?: string;
  createdAt: string;
}

// ─── Full Run Result ──────────────────────────────────────────────────────────
export interface BrainRunResult {
  task: BrainTask;
  deliberation?: DeliberationBundle;
  decision?: BrainDecision;
  execution?: ExecutionReceipt;
  memoryWrites: MemoryWriteRequest[];
}
