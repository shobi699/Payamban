/**
 * Types and interfaces for the Visual Flow Builder
 */

export type FlowNodeType =
  | "TRIGGER"
  | "CONDITION_FOLLOW"
  | "DIRECT_MESSAGE"
  | "BUTTONS"
  | "LEAD_FORM"
  | "AI_AGENT"
  | "PRODUCT_SHOWCASE";

export interface FlowPort {
  id: string;
  name: string;
  type: "in" | "out";
}

export interface FlowNodeData {
  title: string;
  subtitle?: string;
  description?: string;
  // Node-specific configurations
  triggerKeyword?: string;
  triggerType?: "COMMENT" | "STORY_MENTION" | "DIRECT_INBOX";
  messageText?: string;
  humanDelaySeconds?: number;
  buttons?: Array<{ id: string; label: string; url?: string; actionType?: string }>;
  formFields?: Array<{ name: string; label: string; required: boolean }>;
  aiPrompt?: string;
  productTitle?: string;
  productPrice?: number;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  x: number;
  y: number;
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePortId?: string;
  targetPortId?: string;
  label?: string;
}

export interface FlowScenario {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  updatedAt: string;
}
