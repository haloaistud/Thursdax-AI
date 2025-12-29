import { MemoryGraph, MemoryNode } from '../types';

const STORAGE_KEY = 'thursday_neural_graph_v1.5';
const MAX_NODES = 1000;
const PRUNE_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 6 months

class MemoryService {
  private graph: MemoryGraph;

  constructor() {
    this.graph = this.load();
    this.prune();
  }

  private load(): MemoryGraph {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { nodes: [] };
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed.nodes)) return { nodes: [] };
      return parsed;
    } catch (e) {
      console.error('[MemoryService] Corrupt storage detected, resetting synapse.', e);
      return { nodes: [] };
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.graph));
    } catch (e) {
      console.error('[MemoryService] Storage write failed.', e);
    }
  }

  public addMemory(entity: string, relation: string, value: string, source: 'user' | 'inference' = 'inference'): MemoryNode {
    if (!entity || !relation || !value) {
      throw new Error('Invalid memory data: Subject, Relation, and Value are required.');
    }

    const existingIndex = this.graph.nodes.findIndex(
      n => n.entity.toLowerCase() === entity.toLowerCase() &&
           n.relation.toLowerCase() === relation.toLowerCase()
    );

    const now = Date.now();
    if (existingIndex >= 0) {
      const node = this.graph.nodes[existingIndex];
      node.value = value;
      node.timestamp = now;
      node.lastAccessed = now;
      node.confidence = Math.min(1, node.confidence + 0.1);
      this.save();
      return node;
    }

    const newNode: MemoryNode = {
      id: crypto.randomUUID(),
      entity, relation, value,
      confidence: 0.8,
      timestamp: now,
      lastAccessed: now,
      source
    };

    this.graph.nodes.unshift(newNode);
    if (this.graph.nodes.length > MAX_NODES) this.graph.nodes.pop();
    this.save();
    return newNode;
  }

  public retrieveContext(query: string): string {
    const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    if (queryTokens.length === 0) return '';

    const scored = this.graph.nodes.map(node => {
      let score = 0;
      const text = `${node.entity} ${node.relation} ${node.value}`.toLowerCase();
      if (text.includes(query.toLowerCase())) score += 10;
      queryTokens.forEach(token => {
        if (node.entity.toLowerCase().includes(token)) score += 5;
        if (node.value.toLowerCase().includes(token)) score += 3;
        if (node.relation.toLowerCase().includes(token)) score += 1;
      });
      const ageHours = (Date.now() - node.lastAccessed) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, 5 * (1 - (ageHours / 720)));
      return { node, score: score + recencyBoost };
    });

    const relevant = scored
      .filter(item => item.score > 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => {
        item.node.lastAccessed = Date.now();
        return `- ${item.node.entity} ${item.node.relation} ${item.node.value}`;
      });

    if (relevant.length > 0) this.save();
    return relevant.join('\n');
  }

  public fuzzyFilter(term: string): MemoryNode[] {
    if (!term) return this.graph.nodes;
    const lowTerm = term.toLowerCase();
    return this.graph.nodes.filter(n =>
      n.entity.toLowerCase().includes(lowTerm) ||
      n.value.toLowerCase().includes(lowTerm) ||
      n.relation.toLowerCase().includes(lowTerm)
    );
  }

  public getAllMemories(): MemoryNode[] { return this.graph.nodes; }
  public deleteMemory(id: string) { this.graph.nodes = this.graph.nodes.filter(n => n.id !== id); this.save(); }

  private prune() {
    const now = Date.now();
    this.graph.nodes = this.graph.nodes.filter(node => (now - node.timestamp) < PRUNE_AGE_MS || node.confidence > 0.9);
    this.save();
  }
}

export const memoryService = new MemoryService();