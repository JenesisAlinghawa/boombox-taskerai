/**
 * Dijkstra's Algorithm for Task Prioritization and Workflow Optimization
 * 
 * Converts tasks into a directed graph where:
 * - Nodes = Tasks
 * - Edges = Dependencies between tasks
 * - Weights = Cost based on deadline urgency, priority, and complexity
 * 
 * Returns optimal execution sequence to minimize total completion time
 */

export interface TaskNode {
  id: number;
  title: string;
  priority: "low" | "medium" | "high" | null;
  dueDate: string | null;
  status: string | null;
  createdAt: string | null;
  dependsOnTaskIds?: number[]; // Tasks that must complete before this one
  estimatedEffort?: number; // in hours
}

export interface GraphEdge {
  from: number;
  to: number;
  weight: number;
}

export interface DijkstraResult {
  taskId: number;
  title: string;
  priority: number; // Lower number = higher priority
  executionOrder: number;
  urgencyScore: number;
  dependencyWeight: number;
  totalDistance: number;
  criticalPath: boolean;
}

/**
 * Calculate edge weight based on task properties
 * Lower weight = higher priority to execute
 */
function calculateEdgeWeight(
  fromTask: TaskNode,
  toTask: TaskNode,
  currentDate: Date
): number {
  let weight = 0;

  // 1. Urgency based on due date (higher weight if due soon)
  if (toTask.dueDate) {
    const dueDate = new Date(toTask.dueDate);
    const daysUntilDue = Math.max(
      1,
      (dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Tasks due within 1 day get weight of 1, tasks due in 30 days get weight of 30
    weight += Math.max(1, Math.min(30, 31 - daysUntilDue));
  } else {
    weight += 15; // Default weight for tasks without due dates
  }

  // 2. Priority multiplier (high priority = lower weight)
  const priorityMultiplier =
    toTask.priority === "high"
      ? 0.5
      : toTask.priority === "medium"
        ? 1.0
        : 1.5;
  weight *= priorityMultiplier;

  // 3. Status penalty (in-progress tasks get priority)
  if (toTask.status === "inprogress") {
    weight *= 0.6;
  } else if (toTask.status === "stuck") {
    weight *= 0.7; // Stuck tasks need attention
  } else if (toTask.status === "completed") {
    weight = 1000; // Completed tasks have lowest priority
  }

  // 4. Dependency complexity (tasks with more dependencies get higher weight)
  if (toTask.dependsOnTaskIds && toTask.dependsOnTaskIds.length > 0) {
    weight += toTask.dependsOnTaskIds.length * 2;
  }

  return Math.round(weight);
}

/**
 * Build graph representation from tasks
 */
function buildTaskGraph(
  tasks: TaskNode[]
): { edges: GraphEdge[]; taskMap: Map<number, TaskNode> } {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const edges: GraphEdge[] = [];
  const currentDate = new Date();

  for (const task of tasks) {
    // For each dependency, create an edge
    if (task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0) {
      for (const dependencyId of task.dependsOnTaskIds) {
        const fromTask = taskMap.get(dependencyId);
        if (fromTask) {
          const weight = calculateEdgeWeight(fromTask, task, currentDate);
          edges.push({
            from: dependencyId,
            to: task.id,
            weight,
          });
        }
      }
    }
  }

  // For tasks without explicit dependencies, create virtual start node connections
  // This allows independent tasks to be prioritized
  for (const task of tasks) {
    if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
      const weight = calculateEdgeWeight(
        { id: 0, title: "START", priority: null, dueDate: null, status: null, createdAt: null },
        task,
        currentDate
      );
      edges.push({
        from: 0,
        to: task.id,
        weight,
      });
    }
  }

  return { edges, taskMap };
}

/**
 * Dijkstra's Algorithm implementation for task scheduling
 * Returns tasks sorted by optimal execution priority
 */
export function dijkstraTaskScheduler(tasks: TaskNode[]): DijkstraResult[] {
  const { edges, taskMap } = buildTaskGraph(tasks);

  // Distance map: task ID -> minimum distance from start
  const distances = new Map<number, number>();
  const visited = new Set<number>();
  const precedingTasks = new Map<number, number[]>(); // For critical path analysis

  // Initialize distances
  distances.set(0, 0); // Virtual start node
  for (const task of tasks) {
    distances.set(task.id, Infinity);
    precedingTasks.set(task.id, []);
  }

  // Dijkstra's main loop
  let current = 0;

  while (visited.size < tasks.length + 1) {
    if (current === undefined || distances.get(current) === Infinity) {
      // Find next unvisited node with minimum distance
      let minDist = Infinity;
      let nextNode: number | undefined;

      for (const task of tasks) {
        if (!visited.has(task.id) && distances.get(task.id)! < minDist) {
          minDist = distances.get(task.id)!;
          nextNode = task.id;
        }
      }

      if (nextNode === undefined) break;
      current = nextNode;
    }

    visited.add(current);

    // Update distances for neighbors
    for (const edge of edges) {
      if (edge.from === current && !visited.has(edge.to)) {
        const newDistance = distances.get(current)! + edge.weight;

        if (newDistance < distances.get(edge.to)!) {
          distances.set(edge.to, newDistance);
          precedingTasks.set(edge.to, [current]);
        } else if (newDistance === distances.get(edge.to)!) {
          // Multiple paths with same cost
          precedingTasks.get(edge.to)?.push(current);
        }
      }
    }

    // Find next unvisited node with minimum distance
    let minDist = Infinity;
    let nextNode: number | undefined = undefined;

    for (const task of tasks) {
      if (!visited.has(task.id) && distances.get(task.id)! < minDist) {
        minDist = distances.get(task.id)!;
        nextNode = task.id;
      }
    }

    if (nextNode === undefined) break;
    current = nextNode;
  }

  // Convert results to sorted list
  const results: DijkstraResult[] = [];
  let executionOrder = 1;

  for (const task of tasks) {
    if (task.id !== 0) {
      const distance = distances.get(task.id) ?? Infinity;
      const isCritical = precedingTasks.get(task.id)?.length === 1; // Part of critical path

      results.push({
        taskId: task.id,
        title: task.title,
        priority: distance === Infinity ? 1000 : distance,
        executionOrder:
          distance === Infinity ? tasks.length + 1 : executionOrder++,
        urgencyScore: calculateUrgencyScore(task),
        dependencyWeight: task.dependsOnTaskIds?.length ?? 0,
        totalDistance: distance === Infinity ? 0 : distance,
        criticalPath: isCritical && distance !== Infinity,
      });
    }
  }

  // Sort by execution order (lowest total distance first = highest priority)
  results.sort((a, b) => a.priority - b.priority);

  return results;
}

/**
 * Calculate urgency score (0-100) for a task
 * Higher score = more urgent
 */
function calculateUrgencyScore(task: TaskNode): number {
  let score = 50; // Base score

  // Due date urgency
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDue < 1) score = 95; // Due today
    else if (daysUntilDue < 3) score = 85;
    else if (daysUntilDue < 7) score = 70;
    else if (daysUntilDue < 14) score = 60;
    else score = 40;
  }

  // Priority modifier
  if (task.priority === "high") score = Math.min(100, score + 20);
  else if (task.priority === "low") score = Math.max(0, score - 15);

  // Status modifier
  if (task.status === "stuck") score = Math.min(100, score + 30);
  else if (task.status === "completed") score = 0;

  return Math.round(score);
}

/**
 * Find critical path (longest path through dependencies)
 */
export function findCriticalPath(tasks: TaskNode[]): number[] {
  const { edges } = buildTaskGraph(tasks);
  const inDegree = new Map<number, number>();
  const outgoing = new Map<number, number[]>();

  // Build adjacency list
  for (const task of tasks) {
    inDegree.set(task.id, 0);
    outgoing.set(task.id, []);
  }

  for (const edge of edges) {
    if (edge.from !== 0) {
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      outgoing.get(edge.from)?.push(edge.to);
    }
  }

  // Topological sort + path tracking
  const queue: number[] = [];
  const distance: Map<number, number> = new Map();

  for (const task of tasks) {
    if (inDegree.get(task.id) === 0) {
      queue.push(task.id);
      distance.set(task.id, 0);
    }
  }

  const path: number[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    path.push(current);

    for (const next of outgoing.get(current) || []) {
      const newDist = (distance.get(current) ?? 0) + 1;
      distance.set(next, Math.max(distance.get(next) ?? 0, newDist));

      inDegree.set(next, (inDegree.get(next) ?? 0) - 1);
      if (inDegree.get(next) === 0) {
        queue.push(next);
      }
    }
  }

  return path.filter((id) => id !== 0);
}

/**
 * Recalculate priorities when tasks are updated
 */
export function updateTaskPriorities(
  tasks: TaskNode[],
  updatedTaskIds: number[]
): DijkstraResult[] {
  // Rerun Dijkstra on the subset of tasks or all if critical
  return dijkstraTaskScheduler(tasks);
}
