export type User = {
  id: number;
  name?: string | null;
  email: string;
  active?: boolean;
};

export type Comment = {
  id: number;
  taskId: number;
  userId?: number | null;
  content: string;
  createdAt?: string;
  user?: User | null;
};

export type Attachment = {
  id: number;
  taskId: number;
  url: string;
  filename?: string | null;
  createdAt?: string;
};

export type Task = {
  id: number;
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