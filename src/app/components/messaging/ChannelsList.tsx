"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/sessionManager";

interface Channel {
  id: number;
  name: string;
  description?: string;
}

interface Props {
  onSelectChannel: (channelId: number) => void;
}

export default function ChannelsList({ onSelectChannel }: Props) {
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
  }, []);

  if (loading)
    return (
      <div style={{ padding: "12px", color: "#718096" }}>
        Loading channels...
      </div>
    );

  return (
    <div>
      {channels.map((channel) => (
        <div
          key={channel.id}
          onClick={() => onSelectChannel(channel.id)}
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          <div style={{ fontWeight: 500, color: "#2d3748" }}>
            #{channel.name}
          </div>
          {channel.description && (
            <div style={{ fontSize: "12px", color: "#718096" }}>
              {channel.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
