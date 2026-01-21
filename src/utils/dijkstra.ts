/**
 * Dijkstra's Algorithm Implementation for Task Dependency Optimization
 * Computes shortest paths and optimal task sequences
 */

export interface TaskNode {
  id: number;
  title: string;
  duration: number; // Time to complete in days/hours
  priority: "low" | "medium" | "high";
  dependencies: number[]; // Array of task IDs this task depends on
}

export interface DijkstraGraph {
  [nodeId: number]: TaskNode;
}

export interface DijkstraResult {
  startNodeId: number;
  distances: { [nodeId: number]: number };
  previousNodes: { [nodeId: number]: number | null };
  shortestPath: (endNodeId: number) => number[];
  totalDistance: (endNodeId: number) => number;
}

export interface OptimalPathResult {
  path: number[]; // IDs of tasks in optimal sequence
  taskNames: string[];
  totalDuration: number;
  steps: {
    taskId: number;
    taskName: string;
    duration: number;
    cumulativeDuration: number;
  }[];
}

/**
 * Build a weighted graph from task dependencies
 * Weight = task duration (lower is better for shortest path)
 */
export function buildTaskGraph(tasks: TaskNode[]): DijkstraGraph {
  const graph: DijkstraGraph = {};
  tasks.forEach((task) => {
    graph[task.id] = task;
  });
  return graph;
}

/**
 * Calculate edge weight based on task duration and priority
 * Priority multiplier: high = 0.8x, medium = 1x, low = 1.2x
 */
function calculateEdgeWeight(task: TaskNode): number {
  const priorityMultiplier: { [key: string]: number } = {
    high: 0.8,
    medium: 1.0,
    low: 1.2,
  };

  return task.duration * (priorityMultiplier[task.priority] || 1);
}

/**
 * Dijkstra's Algorithm - finds shortest path from start node
 * Returns distances, previous nodes, and utility functions
 */
export function dijkstra(
  graph: DijkstraGraph,
  startNodeId: number
): DijkstraResult {
  const distances: { [nodeId: number]: number } = {};
  const previousNodes: { [nodeId: number]: number | null } = {};
  const unvisited = new Set<number>();

  // Initialize distances and unvisited set
  Object.keys(graph).forEach((id) => {
    const nodeId = parseInt(id);
    distances[nodeId] = Infinity;
    previousNodes[nodeId] = null;
    unvisited.add(nodeId);
  });

  distances[startNodeId] = 0;

  // Main Dijkstra loop
  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentNodeId: number | null = null;
    let minDistance = Infinity;

    for (const nodeId of unvisited) {
      if (distances[nodeId] < minDistance) {
        minDistance = distances[nodeId];
        currentNodeId = nodeId;
      }
    }

    if (currentNodeId === null || minDistance === Infinity) {
      break; // No path to remaining nodes
    }

    unvisited.delete(currentNodeId);
    const currentNode = graph[currentNodeId];

    // For each dependent node (nodes that depend on current node)
    // Build reverse dependency map
    Object.values(graph).forEach((task) => {
      if (task.dependencies.includes(currentNodeId)) {
        const newDistance = distances[currentNodeId] + calculateEdgeWeight(task);

        if (newDistance < distances[task.id]) {
          distances[task.id] = newDistance;
          previousNodes[task.id] = currentNodeId;
        }
      }
    });
  }

  // Utility function to get shortest path to a node
  const shortestPath = (endNodeId: number): number[] => {
    const path: number[] = [];
    let currentId: number | null = endNodeId;

    while (currentId !== null) {
      path.unshift(currentId);
      currentId = previousNodes[currentId];
    }

    // Verify path actually reaches the start node
    if (path[0] !== startNodeId && startNodeId !== endNodeId) {
      return []; // No path exists
    }

    return path;
  };

  // Utility function to get total distance to a node
  const totalDistance = (endNodeId: number): number => {
    return distances[endNodeId];
  };

  return {
    startNodeId,
    distances,
    previousNodes,
    shortestPath,
    totalDistance,
  };
}

/**
 * Find optimal task sequence from start to end task
 * Returns formatted path with task names and cumulative durations
 */
export function findOptimalPath(
  graph: DijkstraGraph,
  startTaskId: number,
  endTaskId: number
): OptimalPathResult {
  const result = dijkstra(graph, startTaskId);
  const path = result.shortestPath(endTaskId);

  if (path.length === 0) {
    throw new Error(
      `No path found from task ${startTaskId} to task ${endTaskId}`
    );
  }

  let cumulativeDuration = 0;
  const steps = path.map((taskId) => {
    const task = graph[taskId];
    const duration = calculateEdgeWeight(task);
    cumulativeDuration += duration;

    return {
      taskId,
      taskName: task.title,
      duration,
      cumulativeDuration,
    };
  });

  const taskNames = steps.map((s) => s.taskName);
  const totalDuration = steps[steps.length - 1]?.cumulativeDuration || 0;

  return {
    path,
    taskNames,
    totalDuration,
    steps,
  };
}

/**
 * Find all optimal paths (independent task sequences)
 * Useful for identifying parallel workstreams
 */
export function findAllOptimalPaths(
  graph: DijkstraGraph
): Map<number, OptimalPathResult> {
  const results = new Map<number, OptimalPathResult>();

  // Find start nodes (tasks with no dependencies)
  const startNodes = Object.values(graph).filter(
    (task) => task.dependencies.length === 0
  );

  if (startNodes.length === 0) {
    throw new Error("No start nodes found (all tasks have dependencies)");
  }

  // Find end nodes (tasks that no other task depends on)
  const endNodes = Object.values(graph).filter((task) => {
    return !Object.values(graph).some((other) =>
      other.dependencies.includes(task.id)
    );
  });

  // For each start node, find path to each end node
  startNodes.forEach((startTask) => {
    endNodes.forEach((endTask) => {
      try {
        const path = findOptimalPath(graph, startTask.id, endTask.id);
        const key = `${startTask.id}_${endTask.id}`;
        results.set(parseInt(key), path);
      } catch {
        // No path exists between these nodes, skip
      }
    });
  });

  return results;
}

/**
 * Calculate critical path (longest path in the project)
 * Important for project scheduling
 */
export function findCriticalPath(graph: DijkstraGraph): OptimalPathResult {
  const startNodes = Object.values(graph).filter(
    (task) => task.dependencies.length === 0
  );

  if (startNodes.length === 0) {
    throw new Error("No start nodes found");
  }

  const endNodes = Object.values(graph).filter((task) => {
    return !Object.values(graph).some((other) =>
      other.dependencies.includes(task.id)
    );
  });

  if (endNodes.length === 0) {
    throw new Error("No end nodes found");
  }

  let criticalPath: OptimalPathResult | null = null;
  let maxDuration = 0;

  // Try all paths and find the longest
  startNodes.forEach((startTask) => {
    endNodes.forEach((endTask) => {
      try {
        const path = findOptimalPath(graph, startTask.id, endTask.id);
        if (path.totalDuration > maxDuration) {
          maxDuration = path.totalDuration;
          criticalPath = path;
        }
      } catch {
        // No path, skip
      }
    });
  });

  if (!criticalPath) {
    throw new Error("Failed to find critical path");
  }

  return criticalPath;
}

/**
 * Format optimal path result as human-readable string
 */
export function formatPath(result: OptimalPathResult): string {
  const arrow = " → ";
  const taskSequence = result.taskNames.join(arrow);
  return `${taskSequence} (${result.totalDuration.toFixed(1)} days)`;
}

/**
 * Validate graph for circular dependencies
 */
export function hasCircularDependencies(graph: DijkstraGraph): boolean {
  const visited = new Set<number>();
  const recursionStack = new Set<number>();

  function hasCycle(nodeId: number): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const task = graph[nodeId];
    for (const depId of task.dependencies) {
      if (!visited.has(depId)) {
        if (hasCycle(depId)) {
          return true;
        }
      } else if (recursionStack.has(depId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const nodeId of Object.keys(graph).map(Number)) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) {
        return true;
      }
    }
  }

  return false;
}
