// components/sidebar/ClientItem.tsx
import React from "react";
import { UserIcon } from "@heroicons/react/24/solid";
import { ClientItemProps } from "../../types";
import { COLORS } from "../../constants";

export function ClientItem({
  client,
  isSelected,
  collapsed,
  onClick,
}: ClientItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: collapsed ? "column" : "row",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: collapsed ? 0 : 12,
        padding: collapsed ? "8px 0" : "8px 12px",
        cursor: "pointer",
        background: isSelected ? COLORS.hover : "transparent",
        borderRadius: 8,
        margin: "0 0 4px 0",
        color: COLORS.text,
        width: collapsed ? 48 : "100%",
        border: "none",
        textAlign: "left",
      }}
      aria-label={collapsed ? client.name : undefined}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: COLORS.muted,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {client.logo ? (
          <img
            src={client.logo}
            alt={`${client.name} logo`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <UserIcon width={16} height={16} color={COLORS.text} />
        )}
      </div>
      {!collapsed && <span>{client.name}</span>}
    </button>
  );
}
