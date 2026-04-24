/**
 * Workflow Simulation Engine
 * Handles graph validation, topological sorting, and step-by-step execution simulation
 */

class SimulationEngine {
  /**
   * Validate the workflow graph structure
   * @param {Object} workflow - { nodes: [], edges: [] }
   * @returns {Object} - { valid: boolean, errors: string[], warnings: string[] }
   */
  static validate(workflow) {
    const errors = [];
    const warnings = [];
    const { nodes, edges } = workflow;

    if (!nodes || nodes.length === 0) {
      errors.push('Workflow has no nodes');
      return { valid: false, errors, warnings };
    }

    // Check for start and end nodes
    const startNodes = nodes.filter(n => n.type === 'start');
    const endNodes = nodes.filter(n => n.type === 'end');

    if (startNodes.length === 0) {
      errors.push('Workflow must have at least one Start node');
    }
    if (startNodes.length > 1) {
      warnings.push('Workflow has multiple Start nodes — only the first will be used as entry point');
    }
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one End node');
    }

    // Build adjacency list
    const adjacency = {};
    const inDegree = {};
    nodes.forEach(n => {
      adjacency[n.id] = [];
      inDegree[n.id] = 0;
    });

    const nodeIds = new Set(nodes.map(n => n.id));

    edges.forEach(e => {
      if (!nodeIds.has(e.source)) {
        errors.push(`Edge references non-existent source node: ${e.source}`);
        return;
      }
      if (!nodeIds.has(e.target)) {
        errors.push(`Edge references non-existent target node: ${e.target}`);
        return;
      }
      adjacency[e.source].push(e.target);
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    });

    // Check for orphan nodes (no connections)
    nodes.forEach(n => {
      const hasOutgoing = adjacency[n.id] && adjacency[n.id].length > 0;
      const hasIncoming = inDegree[n.id] > 0;
      if (!hasOutgoing && !hasIncoming && nodes.length > 1) {
        warnings.push(`Node "${n.data?.title || n.id}" is disconnected from the workflow`);
      }
    });

    // Check Start node has no incoming edges
    startNodes.forEach(sn => {
      if (inDegree[sn.id] > 0) {
        warnings.push('Start node should not have incoming connections');
      }
    });

    // Check End node has no outgoing edges
    endNodes.forEach(en => {
      if (adjacency[en.id] && adjacency[en.id].length > 0) {
        warnings.push('End node should not have outgoing connections');
      }
    });

    // Cycle detection using DFS
    const hasCycle = this.detectCycle(nodes, adjacency);
    if (hasCycle) {
      errors.push('Workflow contains a cycle — workflows must be acyclic (DAG)');
    }

    // Check nodes without titles
    nodes.forEach(n => {
      if (n.type !== 'start' && n.type !== 'end' && (!n.data?.title || n.data.title.trim() === '')) {
        warnings.push(`Node ${n.id} (${n.type}) is missing a title`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect cycles in the graph using DFS
   */
  static detectCycle(nodes, adjacency) {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = {};
    nodes.forEach(n => (color[n.id] = WHITE));

    const dfs = (nodeId) => {
      color[nodeId] = GRAY;
      const neighbors = adjacency[nodeId] || [];
      for (const neighbor of neighbors) {
        if (color[neighbor] === GRAY) return true; // back edge = cycle
        if (color[neighbor] === WHITE && dfs(neighbor)) return true;
      }
      color[nodeId] = BLACK;
      return false;
    };

    for (const node of nodes) {
      if (color[node.id] === WHITE) {
        if (dfs(node.id)) return true;
      }
    }
    return false;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  static topologicalSort(nodes, edges) {
    const adjacency = {};
    const inDegree = {};
    nodes.forEach(n => {
      adjacency[n.id] = [];
      inDegree[n.id] = 0;
    });

    edges.forEach(e => {
      if (adjacency[e.source]) {
        adjacency[e.source].push(e.target);
        inDegree[e.target] = (inDegree[e.target] || 0) + 1;
      }
    });

    const queue = [];
    nodes.forEach(n => {
      if (inDegree[n.id] === 0) queue.push(n.id);
    });

    const sorted = [];
    while (queue.length > 0) {
      const current = queue.shift();
      sorted.push(current);
      (adjacency[current] || []).forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) queue.push(neighbor);
      });
    }

    return sorted;
  }

  /**
   * Simulate workflow execution
   * @param {Object} workflow - { nodes: [], edges: [] }
   * @returns {Object} - { success, validation, steps[], summary }
   */
  static simulate(workflow) {
    const validation = this.validate(workflow);

    if (!validation.valid) {
      return {
        success: false,
        validation,
        steps: [],
        summary: null,
      };
    }

    const { nodes, edges } = workflow;
    const nodeMap = {};
    nodes.forEach(n => (nodeMap[n.id] = n));

    const sortedIds = this.topologicalSort(nodes, edges);
    const steps = [];
    let totalDuration = 0;

    for (const nodeId of sortedIds) {
      const node = nodeMap[nodeId];
      if (!node) continue;

      const step = this.simulateStep(node, totalDuration);
      steps.push(step);
      totalDuration += step.duration;
    }

    return {
      success: true,
      validation,
      steps,
      summary: {
        totalSteps: steps.length,
        totalDuration,
        completedSteps: steps.filter(s => s.status === 'completed').length,
        failedSteps: steps.filter(s => s.status === 'failed').length,
        skippedSteps: steps.filter(s => s.status === 'skipped').length,
      },
    };
  }

  /**
   * Simulate a single step execution
   */
  static simulateStep(node, startTime) {
    const typeConfig = {
      start: {
        action: 'Initializing workflow',
        minDuration: 100,
        maxDuration: 500,
        failRate: 0,
      },
      task: {
        action: 'Executing human task',
        minDuration: 2000,
        maxDuration: 8000,
        failRate: 0.05,
      },
      approval: {
        action: 'Waiting for approval',
        minDuration: 1000,
        maxDuration: 5000,
        failRate: 0.1,
      },
      automated: {
        action: 'Running automation',
        minDuration: 500,
        maxDuration: 3000,
        failRate: 0.08,
      },
      end: {
        action: 'Completing workflow',
        minDuration: 100,
        maxDuration: 300,
        failRate: 0,
      },
    };

    const config = typeConfig[node.type] || typeConfig.task;
    const duration = Math.floor(
      Math.random() * (config.maxDuration - config.minDuration) + config.minDuration
    );
    const failed = Math.random() < config.failRate;

    let status = failed ? 'failed' : 'completed';
    let details = '';

    switch (node.type) {
      case 'start':
        details = `Workflow "${node.data?.title || 'Untitled'}" initialized`;
        break;
      case 'task':
        details = failed
          ? `Task "${node.data?.title || 'Untitled'}" failed — assignee "${node.data?.assignee || 'Unassigned'}" did not complete in time`
          : `Task "${node.data?.title || 'Untitled'}" completed by ${node.data?.assignee || 'Unassigned'}`;
        break;
      case 'approval':
        if (node.data?.autoApproveThreshold) {
          const autoApproved = Math.random() > 0.3;
          if (autoApproved) {
            details = `Auto-approved by ${node.data?.approverRole || 'Approver'} (threshold: ${node.data.autoApproveThreshold} days)`;
          } else {
            details = failed
              ? `Rejected by ${node.data?.approverRole || 'Approver'}`
              : `Approved by ${node.data?.approverRole || 'Approver'}`;
          }
        } else {
          details = failed
            ? `Rejected by ${node.data?.approverRole || 'Approver'}`
            : `Approved by ${node.data?.approverRole || 'Approver'}`;
        }
        break;
      case 'automated':
        details = failed
          ? `Automation "${node.data?.title || 'Untitled'}" failed — retrying...`
          : `Automation "${node.data?.title || 'Untitled'}" executed successfully`;
        break;
      case 'end':
        details = node.data?.endMessage || 'Workflow completed';
        status = 'completed';
        break;
    }

    return {
      nodeId: node.id,
      nodeType: node.type,
      title: node.data?.title || node.data?.endMessage || `${node.type} node`,
      action: config.action,
      status,
      details,
      duration,
      startTime,
      endTime: startTime + duration,
    };
  }
}

module.exports = SimulationEngine;
