import React, { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentUser } from "@/utils/sessionManager";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  profilePicture?: string;
}

interface SidebarHeaderProps {
  collapsed: boolean;
  onCollapse: () => void;
}

const SidebarHeaderComponent = ({
  collapsed,
  onCollapse,
}: SidebarHeaderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
          loadedRef.current = true;
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      }
    };

    loadUser();

    // Listen for storage changes (when profile is updated in another tab or same tab)
    const handleStorageChange = () => {
      loadUser();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom event when profile is updated
    const handleProfileUpdate = () => {
      loadUser();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  return (
    <div
      style={{
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Logo & Collapse Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 24 }}>✓</div>
          {!collapsed && (
            <h1
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: "#fff",
              }}
            >
              Taskerai
            </h1>
          )}
        </div>
        <button
          onClick={onCollapse}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.7,
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* User Profile */}
      {user && (
        <div
          style={{
            padding: collapsed ? "8px" : "10px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#798CC3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={`${user.firstName} ${user.lastName}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              `${user.firstName[0]}${user.lastName[0]}`
            )}
          </div>
          {!collapsed && (
            <div style={{ width: "100%" }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>
                {`${user.firstName} ${user.lastName}` || "User"}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 9,
                  opacity: 0.8,
                  textTransform: "capitalize",
                  fontWeight: 500,
                }}
              >
                {user.role?.toLowerCase() || "user"}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 9,
                  opacity: 0.7,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.email}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SidebarHeader = React.memo(SidebarHeaderComponent);
