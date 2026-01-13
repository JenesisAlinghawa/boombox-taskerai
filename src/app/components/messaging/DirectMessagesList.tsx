"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";

interface DirectMessageUser {
  id: number;
  name: string;
  email: string;
  unreadCount: number;
}

interface Props {
  onSelectUser: (userId: number) => void;
}

export default function DirectMessagesList({ onSelectUser }: Props) {
  const [users, setUsers] = useState<DirectMessageUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDMUsers = async () => {
      try {
        const user = await getCurrentUser();
        if (!user?.id) return;
        const res = await fetch(`/api/direct-messages/users?userId=${user.id}`);
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error("Failed to fetch DM users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDMUsers();
  }, []);

  if (loading)
    return (
      <div style={{ padding: "12px", color: "#718096" }}>
        Loading conversations...
      </div>
    );

  return (
    <div>
      {users.map((user) => (
        <div
          key={user.id}
          onClick={() => onSelectUser(user.id)}
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 500, color: "#2d3748" }}>{user.name}</div>
            <div style={{ fontSize: "12px", color: "#718096" }}>
              {user.email}
            </div>
          </div>
          {user.unreadCount > 0 && (
            <div
              style={{
                background: "#2b6cb0",
                color: "#fff",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "12px",
              }}
            >
              {user.unreadCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
