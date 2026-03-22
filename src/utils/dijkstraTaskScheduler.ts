/**
 * ========================================================================
 * DIJKSTRA'S ALGORITHM FOR TASK PRIORITIZATION & WORKFLOW OPTIMIZATION
 * 
 * THIS IS THE CORE ALGORITHM OF THE TASKERAI SYSTEM THESIS
 * ========================================================================
 * 
 * PROBLEM: How to optimally prioritize and sequence tasks considering
 * multiple factors (deadlines, priority, status, dependencies)?
 * 
 * SOLUTION: Model tasks as a weighted directed graph and use Dijkstra's
 * shortest path algorithm to find the optimal execution sequence.
 * 
 * GRAPH STRUCTURE:
 * - Nodes = Tasks (priority, deadline, status, dependencies)
 * - Edges = Dependencies between tasks (weight = priority cost)
 * - Weights = Calculated from 4 factors (see calculateEdgeWeight)
 * 
 * ALGORITHM OVERVIEW:
 * 1. Build graph from tasks with weighted edges
 * 2. Run Dijkstra's algorithm from virtual START node
 * 3. Calculate shortest path (minimum cost) to each task
 * 4. Sort tasks by distance (LOWER = HIGHER PRIORITY)
 * 5. Identify critical path (longest dependency chain)
 * 
 * TIME COMPLEXITY: O(V²)  where V = number of tasks
 * SPACE COMPLEXITY: O(V²) for graph representation
 */

export interface TaskNode {
  id: number;
  title: string;
  priority: "low" | "medium" | "high" | null;
  dueDate: string | null;
  status: string | null;
  createdAt: string | null;
  dependsOnTaskIds?: number[];  // Tasks that must complete first
  estimatedEffort?: number;     // in hours
}

export interface GraphEdge {
  from: number;
  to: number;
  weight: number;
}

export interface DijkstraResult {
  taskId: number;
  title: string;
  priority: number;      // Distance from start (LOWER = HIGHER PRIORITY)
  executionOrder: number;
  urgencyScore: number;
  dependencyWeight: number;
  totalDistance: number;
  criticalPath: boolean;
}

/**
 * Calculate edge weight based on task properties
 * 
 * WEIGHT COMPONENTS (all combined into single score):
 * 
 * 1. DEADLINE URGENCY (1-30 points)
 *    - Due today: 30 points (most urgent)
 *    - Due in 30 days: 1 point (not urgent)
 *    - No deadline: 15 points (moderate default)
 * 
 * 2. PRIORITY MULTIPLIER (0.5x to 1.5x)
 *    - HIGH priority: 0.5x (BOOST - cut weight in half)
 *    - MEDIUM priority: 1.0x (NO CHANGE)
 *    - LOW priority: 1.5x (PENALIZE - 1.5x weight)
 * 
 * 3. STATUS MULTIPLIER (0.6x to 1000x)
 *    - in-progress: 0.6x (BOOST - maintain momentum)
 *    - stuck: 0.7x (BOOST - needs attention)
 *    - completed: 1000x (SKIP - already done)
 *    - other: 1.0x (NO CHANGE)
 * 
 * 4. DEPENDENCY COMPLEXITY (+2 per blocker)
 *    - Tasks with many blockers get higher weight
 * 
 * EXAMPLE: HIGH PRIORITY task due tomorrow
 *   Base urgency: 29 (31 - 2 days)
 *   Priority boost: 29 × 0.5 = 14.5
 *   Status boost: 14.5 × 1.0 = 14.5
 *   Final: ~14 (EXECUTE FIRST)
 */
function calculateEdgeWeight(
  fromTask: TaskNode,
  toTask: TaskNode,
  currentDate: Date
): number {
  let weight = 0;

  // FACTOR 1: DEADLINE URGENCY
  // Closer deadline = higher weight (more urgent)
  if (toTask.dueDate) {
    const dueDate = new Date(toTask.dueDate);
    const daysUntilDue = Math.max(
      1,
      (dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Formula: 31 - daysUntilDue
    // Tomorrow: 31 - 1 = 30 (very urgent)
    // 30 days: 31 - 30 = 1 (not urgent)
    weight += Math.max(1, Math.min(30, 31 - daysUntilDue));
  } else {
    weight += 15;  // No deadline = moderate urgency
  }

  // FACTOR 2: PRIORITY MULTIPLIER
  // High priority tasks should execute sooner (lower weight)
  const priorityMultiplier =
    toTask.priority === "high"
      ? 0.5    // HIGH: boost priority (50% of base weight)
      : toTask.priority === "medium"
        ? 1.0  // MEDIUM: baseline
        : 1.5; // LOW: lower priority (150% of base weight)
  weight *= priorityMultiplier;

  // FACTOR 3: STATUS MULTIPLIER
  // Current task state affects priority
  if (toTask.status === "inprogress") {
    weight *= 0.6;   // Boost: already in progress, keep momentum
  } else if (toTask.status === "stuck") {
    weight *= 0.7;   // Boost: needs attention to unblock
  } else if (toTask.status === "completed") {
    weight = 1000;   // Skip: already done, lowest priority
  }
  // Other statuses: weight *= 1.0 (no change)

  // FACTOR 4: DEPENDENCY COMPLEXITY
  // Tasks with blockers should execute soon to unblock dependents
  if (toTask.dependsOnTaskIds && toTask.dependsOnTaskIds.length > 0) {
    weight += toTask.dependsOnTaskIds.length * 2;  // +2 per blocking task
  }

  return Math.round(weight);
}

/**
 * Build graph representation from tasks
 * 
 * Creates edges showing:
 * - Direct dependencies (task A depends on task B)
 * - Virtual start node connections (for independent tasks)
 * 
 * Edge weights are calculated based on task properties
 */
function buildTaskGraph(
  tasks: TaskNode[]
): { edges: GraphEdge[]; taskMap: Map<number, TaskNode> } {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const edges: GraphEdge[] = [];
  const currentDate = new Date();

  // Create edges for explicit dependencies
  for (const task of tasks) {
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

  // Create edges from virtual START node for independent tasks
  // This allows Dijkstra to prioritize them with other factors
  for (const task of tasks) {
    if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
      const weight = calculateEdgeWeight(
        {
          id: 0,
          title: "START",
          priority: null,
          dueDate: null,
          status: null,
          createdAt: null,
        },
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
 * Dijkstra's Algorithm for Task Scheduling
 * 
 * MAIN ENTRY POINT: Call this to get tasks ranked by execution priority
 * 
 * ALGORITHM:
 * 1. Build weighted graph from tasks
 * 2. Initialize distances: START=0, all others=Infinity
 * 3. While unvisited nodes remain:
 *    - Pick unvisited node with smallest distance (greedy)
 *    - Mark it visited (distance is final)
 *    - Check all neighbors (dependent tasks)
 *    - If found shorter path, update neighbor distance
 * 4. Convert distances to execution rankings
 * 5. Sort by priority (lower distance = higher priority)
 * 
 * INPUT: Array of tasks
 * OUTPUT: Same tasks ranked by optimal execution order
 * 
 * KEY RESULT FIELDS:
 * - priority: distance score (LOWER = EXECUTE FIRST)
 * - executionOrder: sequence number (1, 2, 3, ...)
 * - urgencyScore: 0-100 (100 = extremely urgent)
 * - criticalPath: true if on bottleneck chain
 */
export function dijkstraTaskScheduler(tasks: TaskNode[]): DijkstraResult[] {
  const { edges, taskMap } = buildTaskGraph(tasks);

  // Initialize Dijkstra data structures
  const distances = new Map<number, number>();
  const visited = new Set<number>();
  const precedingTasks = new Map<number, number[]>(); // For critical path

  // START: all distances = Infinity except start = 0
  distances.set(0, 0);  // Virtual START node
  for (const task of tasks) {
    distances.set(task.id, Infinity);  // All tasks initially unreachable
    precedingTasks.set(task.id, []);
  }

  // Main Dijkstra loop: process nodes in order of distance
  let current = 0;

  while (visited.size < tasks.length + 1) {
    // Greedy selection: find unvisited node with smallest distance
    if (current === undefined || distances.get(current) === Infinity) {
      let minDist = Infinity;
      let nextNode: number | undefined;

      for (const task of tasks) {
        if (!visited.has(task.id) && distances.get(task.id)! < minDist) {
          minDist = distances.get(task.id)!;
          nextNode = task.id;  // Select closest unvisited task
        }
      }

      if (nextNode === undefined) break;  // No more reachable tasks
      current = nextNode;
    }

    // Mark current as visited (its distance is finalized)
    visited.add(current);

    // RELAXATION: Update distances to neighbors through current node
    for (const edge of edges) {
      if (edge.from === current && !visited.has(edge.to)) {
        // New distance through current vs previously known distance
        const newDistance = distances.get(current)! + edge.weight;

        if (newDistance < distances.get(edge.to)!) {
          distances.set(edge.to, newDistance);    // Update to shorter path
          precedingTasks.set(edge.to, [current]); // Track predecessor
        } else if (newDistance === distances.get(edge.to)!) {
          // Multiple equal-cost paths (for critical path analysis)
          precedingTasks.get(edge.to)?.push(current);
        }
      }
    }

    // Find next unvisited node
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

  // Convert distances to task rankings
  const results: DijkstraResult[] = [];
  let executionOrder = 1;

  for (const task of tasks) {
    if (task.id !== 0) {  // Skip virtual START node
      const distance = distances.get(task.id) ?? Infinity;
      const isCritical = precedingTasks.get(task.id)?.length === 1;

      results.push({
        taskId: task.id,
        title: task.title,
        priority: distance === Infinity ? 1000 : distance,  // LOWER = HIGHER PRIORITY
        executionOrder:
          distance === Infinity ? tasks.length + 1 : executionOrder++,
        urgencyScore: calculateUrgencyScore(task),
        dependencyWeight: task.dependsOnTaskIds?.length ?? 0,
        totalDistance: distance === Infinity ? 0 : distance,
        criticalPath: isCritical && distance !== Infinity,
      });
    }
  }

  // Sort by priority (lowest distance first = highest priority)
  results.sort((a, b) => a.priority - b.priority);

  return results;
}

/**
 * Calculate urgency score (0-100) for a task
 * 
 * SCORING:
 * - 0-49: Low urgency (far future or low priority)
 * - 50-74: Medium urgency (moderate deadline)
 * - 75-94: High urgency (due soon or stuck)
 * - 95-100: Critical urgency (due today or overdue)
 */
function calculateUrgencyScore(task: TaskNode): number {
  let score = 50;  // Base score: medium urgency

  // Adjust based on due date
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const daysUntilDue =
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntilDue < 1) score = 95;        // Due today/overdue
    else if (daysUntilDue < 3) score = 85;   // Due in 2-3 days
    else if (daysUntilDue < 7) score = 75;   // Due this week
    else if (daysUntilDue < 14) score = 60;  // Due next week
    else score = 40;                         // Far in future
  }

  // Adjust based on priority
  if (task.priority === "high") score = Math.min(100, score + 20);
  else if (task.priority === "low") score = Math.max(0, score - 15);

  // Adjust based on status
  if (task.status === "stuck") score = Math.min(100, score + 25);
  else if (task.status === "inprogress") score = Math.min(100, score + 10);
  else if (task.status === "completed") score = 0;

  return Math.round(Math.max(0, Math.min(100, score)));
}
