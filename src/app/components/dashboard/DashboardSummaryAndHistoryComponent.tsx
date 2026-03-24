"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { Search, Filter, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import TeamPerformanceCharts from "@/app/components/dashboard/TeamPerformanceChartsComponent";

interface DashboardSummaryAndHistoryProps {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  tasks: Array<{
    id: string;
    title: string;
    status?: string;
    priority: string;
    dueDate?: string;
    createdAt?: string;
    completedAt?: string;
    timeSpent?: number;
    assignees?: Array<{
      assignee?: { firstName?: string; lastName?: string; email?: string };
    }>;
    createdBy?: { firstName?: string; lastName?: string; email?: string };
  }>;
  weeklyData?: {
    labels: string[];
    inProgress: number[];
    completed: number[];
    overdue: number[];
  };
  teamPerformanceData?: Array<{
    name: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    transfers: number;
    overdueTasks: number;
    completionRate: number;
  }>;
}

const DashboardSummaryAndHistory: React.FC<DashboardSummaryAndHistoryProps> = ({
  pending,
  inProgress,
  completed,
  overdue,
  tasks,
  weeklyData,
  teamPerformanceData,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "todo" | "inprogress" | "completed" | "stuck"
  >("all");
  const [priorityFilter, setPriorityFilter] = React.useState<
    "all" | "low" | "medium" | "high"
  >("all");

  const total = tasks.length;
  const timeSpentHours = tasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0);

  const statusCounts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    inprogress: tasks.filter((t) => t.status === "inprogress").length,
    completed: tasks.filter(
      (t) => t.status === "completed" || t.status === "done",
    ).length,
    stuck: tasks.filter((t) => t.status === "stuck").length,
  };

  const statusData = [
    { name: "Todo", value: statusCounts.todo, fill: "#38bdf8" },
    { name: "In Progress", value: statusCounts.inprogress, fill: "#60a5fa" },
    { name: "Completed", value: statusCounts.completed, fill: "#22c55e" },
    { name: "Stuck", value: statusCounts.stuck, fill: "#ef4444" },
  ];

  const completedTasksHistory = tasks
    .filter((task) => task.status === "completed" || task.status === "done")
    .sort((a, b) => {
      if (a.completedAt && b.completedAt) {
        return (
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
      }
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return 0;
    });

  const filteredCompletedTasks = completedTasksHistory.filter((task) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.assignees?.[0]?.assignee &&
        `${task.assignees[0].assignee.firstName || ""} ${task.assignees[0].assignee.lastName || ""}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    const matchesPriority =
      priorityFilter === "all" ||
      task.priority.toLowerCase() === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const exportStyles = StyleSheet.create({
    page: {
      padding: 20,
      fontSize: 10,
    },
    section: {
      marginBottom: 10,
    },
    header: {
      fontSize: 14,
      marginBottom: 8,
      fontWeight: "bold",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 0.5,
      borderBottomColor: "#ccc",
      paddingVertical: 2,
    },
    cell: {
      width: "20%",
    },
    label: {
      width: "40%",
    },
  });

  const createAndDownloadPdf = async (
    fileName: string,
    doc: React.ReactNode,
  ) => {
    const blob = await pdf(<>{doc}</>).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTasksByStatus = async () => {
    const doc = (
      <Document>
        <Page size="A4" style={exportStyles.page}>
          <Text style={exportStyles.header}>Tasks by Status</Text>
          {statusData.map((item) => (
            <View key={item.name} style={exportStyles.row}>
              <Text style={exportStyles.label}>{item.name}</Text>
              <Text style={exportStyles.cell}>{item.value}</Text>
            </View>
          ))}
        </Page>
      </Document>
    );
    await createAndDownloadPdf("tasks-by-status", doc);
  };

  const exportCompletedTasks = async () => {
    const doc = (
      <Document>
        <Page size="A4" style={exportStyles.page}>
          <Text style={exportStyles.header}>Completed Tasks</Text>
          {filteredCompletedTasks.map((task: any) => (
            <View key={task.id} style={exportStyles.row}>
              <Text style={exportStyles.label}>{task.title}</Text>
              <Text style={exportStyles.cell}>
                {task.assignees?.[0]?.assignee
                  ? `${task.assignees[0].assignee.firstName || ""} ${task.assignees[0].assignee.lastName || ""}`.trim()
                  : task.createdBy
                    ? `${task.createdBy.firstName || ""} ${task.createdBy.lastName || ""}`.trim()
                    : "Unassigned"}
              </Text>
              <Text style={exportStyles.cell}>{task.status || ""}</Text>
              <Text style={exportStyles.cell}>{task.priority || ""}</Text>
              <Text style={exportStyles.cell}>
                {task.completedAt
                  ? new Date(task.completedAt).toLocaleDateString()
                  : ""}
              </Text>
            </View>
          ))}
        </Page>
      </Document>
    );
    await createAndDownloadPdf("completed-tasks", doc);
  };

  const exportTeamPerformance = async () => {
    const doc = (
      <Document>
        <Page size="A4" style={exportStyles.page}>
          <Text style={exportStyles.header}>Team Performance Report</Text>
          {teamPerformanceData?.map((member: any) => (
            <View key={member.name} style={exportStyles.row}>
              <Text style={exportStyles.label}>{member.name}</Text>
              <Text style={exportStyles.cell}>{member.totalTasks}</Text>
              <Text style={exportStyles.cell}>{member.completedTasks}</Text>
              <Text style={exportStyles.cell}>{member.inProgressTasks}</Text>
              <Text style={exportStyles.cell}>{member.transfers}</Text>
              <Text style={exportStyles.cell}>{member.overdueTasks}</Text>
            </View>
          ))}
        </Page>
      </Document>
    );
    await createAndDownloadPdf("team-performance-report", doc);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-700">
              Tasks by Status
            </h3>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">{tasks.length} tasks</div>
              <button
                onClick={exportTasksByStatus}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700"
              >
                Export PDF
              </button>
            </div>
          </div>
          <div className="mb-3">
            <ul className="space-y-2">
              <li
                className={`flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg ${
                  statusFilter === "all" ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
                onClick={() => setStatusFilter("all")}
              >
                <span className="text-gray-700 font-medium">All Statuses</span>
                <span className="text-gray-500">{total} Tasks</span>
              </li>
              {statusData.map((item) => {
                const statusKey = (
                  item.name === "In Progress"
                    ? "inprogress"
                    : item.name.toLowerCase()
                ) as "todo" | "inprogress" | "completed" | "stuck";
                const percentage =
                  total > 0 ? Math.round((item.value / total) * 100) : 0;
                const badgeClass =
                  item.name === "Todo"
                    ? "bg-sky-200 text-sky-700"
                    : item.name === "In Progress"
                      ? "bg-blue-200 text-blue-700"
                      : item.name === "Completed"
                        ? "bg-emerald-200 text-emerald-700"
                        : "bg-red-200 text-red-700";

                return (
                  <li
                    key={item.name}
                    className={`flex items-center justify-between text-xs cursor-pointer p-2 rounded-lg ${
                      statusFilter === statusKey
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    }`}
                    onClick={() => setStatusFilter(statusKey)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.fill}`} />
                      <span className="text-gray-700 font-medium">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{item.value} Tasks</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}
                      >
                        {percentage}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="h-64 flex-shrink-0 -mt-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={0}
                  outerRadius={100}
                  paddingAngle={0}
                  label={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${value} tasks`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Completed Tasks
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-black"
                value={searchQuery}
                placeholder="Search by title or assignee"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-black"
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value as "all" | "low" | "medium" | "high",
                  )
                }
              >
                <option value="all">All priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={exportCompletedTasks}
                className="flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-lg hover:bg-blue-700"
              >
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr>
                  <th className="py-2 px-2 font-medium text-gray-500">
                    Assignee
                  </th>
                  <th className="py-2 px-2 font-medium text-gray-500">Name</th>
                  <th className="py-2 px-2 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="py-2 px-2 font-medium text-gray-500">
                    Priority
                  </th>
                  <th className="py-2 px-2 font-medium text-gray-500">
                    Due Date
                  </th>
                  <th className="py-2 px-2 font-medium text-gray-500">
                    Date Completed
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCompletedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2 px-2 text-gray-600">
                      {task.assignees?.[0]?.assignee
                        ? `${task.assignees[0].assignee.firstName || ""} ${task.assignees[0].assignee.lastName || ""}`.trim()
                        : task.createdBy
                          ? `${task.createdBy.firstName || ""} ${task.createdBy.lastName || ""}`.trim()
                          : "Unassigned"}
                    </td>
                    <td className="py-2 px-2 text-gray-800 font-medium truncate max-w-[180px]">
                      {task.title}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          task.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : task.status === "inprogress"
                              ? "bg-blue-100 text-blue-700"
                              : task.status === "stuck"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {task.status || "todo"}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-600"
                            : task.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {task.completedAt
                        ? new Date(task.completedAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Team Performance Report
          </h3>
          <button
            onClick={exportTeamPerformance}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700"
          >
            Export PDF
          </button>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-xs text-left">
            <thead>
              <tr>
                <th className="py-2 px-2 font-medium text-gray-500">Name</th>
                <th className="py-2 px-2 font-medium text-gray-500">
                  Assigned
                </th>
                <th className="py-2 px-2 font-medium text-gray-500">
                  Completed
                </th>
                <th className="py-2 px-2 font-medium text-gray-500">
                  In-progress
                </th>
                <th className="py-2 px-2 font-medium text-gray-500">
                  Transfers
                </th>
                <th className="py-2 px-2 font-medium text-gray-500">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {teamPerformanceData && teamPerformanceData.length > 0 ? (
                teamPerformanceData.map((member) => (
                  <tr
                    key={member.name}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2 px-2 text-gray-700 font-medium">
                      {member.name}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {member.totalTasks}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {member.completedTasks}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {member.inProgressTasks ?? 0}
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {member.transfers ?? 0}
                    </td>
                    <td className="py-2 px-2 text-red-600">
                      {member.overdueTasks}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-3 px-2 text-center text-gray-500"
                  >
                    No team performance data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummaryAndHistory;
