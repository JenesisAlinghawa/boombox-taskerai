export type Employee = {
  id: number;
  name?: string | null;
  email: string;
  active?: boolean;
  role?: "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "CO_OWNER" | "OWNER";
};

export type Comment = {
  id: number;
  taskId: string;
  userId?: number | null;
  content: string;
  createdAt?: string;
  user?: User | null;
};

export type Attachment = {
  id: number;
  taskId: string;
  url: string;
  filename?: string | null;
  createdAt?: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  createdById?: number;
  createdBy?: User | null;
  assignee?: User | null;
  comments?: Comment[];
  attachments?: Attachment[];
};