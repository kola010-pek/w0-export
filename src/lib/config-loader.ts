// Configuration loader - reads JSON configs and provides typed access
import fs from 'fs';
import path from 'path';
import type { AgentConfig, DagConfig, EnvironmentConfig, DagNode } from './types';

const CONFIG_DIR = path.join(process.cwd(), 'config');

function loadJson<T>(filename: string): T {
  const filepath = path.join(CONFIG_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as T;
}

interface AgentsJson {
  agents: Record<string, AgentConfig>;
}

interface DagJson {
  dag: DagConfig;
}

interface EnvironmentsJson {
  environments: Record<string, EnvironmentConfig>;
  active_environment: string;
}

interface GatesJson {
  gates: Record<string, {
    gate_id: string;
    display_name: string;
    scope: string;
    description: string;
    required_for: string[];
    rules: Array<{
      rule_id: string;
      display_name: string;
      metric: string;
      threshold: number | boolean | string;
      operator: string;
      severity: 'BLOCK' | 'WARN';
      description: string;
    }>;
  }>;
}

let _agentsCache: Record<string, AgentConfig> | null = null;
let _dagCache: DagConfig | null = null;
let _envCache: EnvironmentConfig | null = null;
let _gatesCache: GatesJson['gates'] | null = null;

export function getAgentConfigs(): Record<string, AgentConfig> {
  if (!_agentsCache) {
    const data = loadJson<AgentsJson>('agents.json');
    _agentsCache = data.agents;
  }
  return _agentsCache;
}

export function getAgentConfig(agentId: string): AgentConfig | null {
  const configs = getAgentConfigs();
  return configs[agentId] ?? null;
}

export function getDagConfig(): DagConfig {
  if (!_dagCache) {
    const data = loadJson<DagJson>('dag.json');
    _dagCache = data.dag;
  }
  return _dagCache;
}

export function getDagNode(nodeId: string): DagNode | null {
  const dag = getDagConfig();
  return dag.nodes[nodeId] ?? null;
}

export function getDagNodeOrder(): string[] {
  const dag = getDagConfig();
  const nodeIds = Object.keys(dag.nodes);
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = dag.nodes[nodeId];
    for (const dep of node.depends_on) {
      visit(dep);
    }
    order.push(nodeId);
  }

  for (const nodeId of nodeIds) {
    visit(nodeId);
  }
  return order;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  if (!_envCache) {
    const data = loadJson<EnvironmentsJson>('environments.json');
    _envCache = data.environments[data.active_environment];
  }
  return _envCache;
}

export function getGatesConfig(): GatesJson['gates'] {
  if (!_gatesCache) {
    const data = loadJson<GatesJson>('gates.json');
    _gatesCache = data.gates;
  }
  return _gatesCache;
}

export function getGateRules(gateScope: string): GatesJson['gates'][string]['rules'] {
  const gates = getGatesConfig();
  return gates[gateScope]?.rules ?? [];
}

export function resetConfigCache(): void {
  _agentsCache = null;
  _dagCache = null;
  _envCache = null;
  _gatesCache = null;
}
