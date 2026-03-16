export type User = {
  id: string;
  name?: string | null;
  firstName?: string;
  lastName?: string;
  email: string;
  active?: boolean;
  role?: "EMPLOYEE" | "ADMIN" | "OWNER";
  profilePicture?: string | null;
};

export type Comment = {
  id: number;
  taskId: string;
  userId?: string | null;
  content: string;
  createdAt?: string;
  parentCommentId?: number | null;
  user?: User | null;
  replies?: Comment[];
};

export type Attachment = {
  id: number;
  taskId: string;
  url: string;
  filename?: string | null;
  createdAt?: string;
};

export type TaskAssignee = {
  assigneeId: string;
  assignee: User;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  createdById?: string;
  createdBy?: User | null;
  assignee?: User | null; // Legacy - kept for backward compatibility
  assignees?: TaskAssignee[]; // New - multiple assignees
  comments?: Comment[];
  attachments?: Attachment[];
  _count?: {
    comments: number;
    attachments: number;
  };
};