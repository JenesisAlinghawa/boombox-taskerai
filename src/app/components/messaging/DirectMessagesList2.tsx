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
  onSelectUser: (userId: number, name: string) => void;
  selectedId?: number | null;
}

const COLORS = {
  sidebar: "#ffffff",
  text: "#ffffff",
  muted: "#a0aec0",
  border: "rgba(0,0,0,0.1)",
  hover: "rgba(0,0,0,0.05)",
  primary: "#5d8bb1",
  shadow: "#E1F1FD",
};

export default function DirectMessagesList({
  onSelectUser,
  selectedId,
}: Props) {
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
    const interval = setInterval(fetchDMUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div style={{ padding: "12px", color: COLORS.muted, fontSize: "12px" }}>
        Loading conversations...
      </div>
    );

  return (
    <div>
      {users.length === 0 ? (
        <div
          style={{
            padding: "12px",
            color: COLORS.muted,
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          No conversations yet
        </div>
      ) : (
        users.map((user) => (
          <div
            key={user.id}
            onClick={() => onSelectUser(user.id, user.name)}
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${COLORS.border}`,
              cursor: "pointer",
              background: selectedId === user.id ? COLORS.hover : "transparent",
              transition: "all 0.2s",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              if (selectedId !== user.id) {
                (e.currentTarget as HTMLElement).style.background =
                  COLORS.hover;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedId !== user.id) {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 500,
                  color: COLORS.text,
                  fontSize: "13px",
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: COLORS.muted,
                  marginTop: "2px",
                }}
              >
                {user.email}
              </div>
            </div>
            {user.unreadCount > 0 && (
              <div
                style={{
                  background: COLORS.primary,
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "2px 6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  marginLeft: "8px",
                }}
              >
                {user.unreadCount}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
