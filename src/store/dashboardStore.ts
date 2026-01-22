import { create } from "zustand";

interface DashboardData {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  weeklyData: {
    labels: string[];
    inProgress: number[];
    completed: number[];
    overdue: number[];
  };
  calendarTasks: Array<{
    date: number;
    taskCount: number;
  }>;
  aiInsight: string;
}

interface DashboardStore {
  data: DashboardData;
  setData: (data: DashboardData) => void;
  currentTime: string;
  setCurrentTime: (time: string) => void;
  currentMonth: number;
  currentYear: number;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  fetchData: (userId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  data: {
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    weeklyData: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      inProgress: [0, 0, 0, 0, 0, 0, 0],
      completed: [0, 0, 0, 0, 0, 0, 0],
      overdue: [0, 0, 0, 0, 0, 0, 0],
    },
    calendarTasks: [],
    aiInsight: "",
  },
  setData: (data: DashboardData) => set({ data }),
  currentTime: new Date().toLocaleTimeString(),
  setCurrentTime: (time: string) => set({ currentTime: time }),
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  setCurrentMonth: (month: number) => set({ currentMonth: month }),
  setCurrentYear: (year: number) => set({ currentYear: year }),
  fetchData: async (userId: string) => {
    try {
      const response = await fetch(`/api/dashboard`, {
        headers: {
          "x-user-id": userId,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const dashboardData: DashboardData = await response.json();
      console.log("Dashboard data received:", dashboardData);
      set({ data: dashboardData });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  },
}));
