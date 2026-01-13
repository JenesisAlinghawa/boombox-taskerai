"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";

interface Channel {
  id: number;
  name: string;
  description?: string;
}

interface Props {
  onSelectChannel: (channelId: number, name: string) => void;
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

export default function ChannelsList({ onSelectChannel, selectedId }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const user = await getCurrentUser();
        const userId = user?.id;
        const res = await fetch(`/api/channels?userId=${userId}`);
        const data = await res.json();
        setChannels(data.channels || []);
      } catch (err) {
        console.error("Failed to fetch channels:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
    const interval = setInterval(fetchChannels, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div style={{ padding: "12px", color: COLORS.muted, fontSize: "12px" }}>
        Loading channels...
      </div>
    );

  return (
    <div>
      {channels.length === 0 ? (
        <div
          style={{
            padding: "12px",
            color: COLORS.muted,
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          No channels yet
        </div>
      ) : (
        channels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => onSelectChannel(channel.id, channel.name)}
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${COLORS.border}`,
              cursor: "pointer",
              background:
                selectedId === channel.id ? COLORS.hover : "transparent",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (selectedId !== channel.id) {
                (e.currentTarget as HTMLElement).style.background =
                  COLORS.hover;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedId !== channel.id) {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }
            }}
          >
            <div
              style={{ fontWeight: 500, color: COLORS.text, fontSize: "13px" }}
            >
              # {channel.name}
            </div>
            {channel.description && (
              <div
                style={{
                  fontSize: "11px",
                  color: COLORS.muted,
                  marginTop: "2px",
                }}
              >
                {channel.description}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
