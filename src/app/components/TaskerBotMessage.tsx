import React from "react";
import { Sparkles } from "lucide-react";

interface TaskerBotMessageProps {
  message: string;
  action?: string | null;
  timestamp?: string;
}

export const TaskerBotMessage: React.FC<TaskerBotMessageProps> = ({
  message,
  action,
  timestamp,
}) => {
  return (
    <div className="flex gap-3 mb-4 items-end">
      {/* TaskerBot Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 text-white" />
      </div>

      {/* Message Bubble */}
      <div className="flex flex-col">
        <div className="rounded-lg px-4 py-3 bg-gradient-to-r from-purple-100 to-indigo-100 text-gray-800 max-w-md">
          <p className="text-sm">{message}</p>
          {action && action !== "null" && (
            <div className="text-xs text-purple-600 mt-2 font-semibold">
              ✓ {action}
            </div>
          )}
        </div>
        {timestamp && (
          <span className="text-xs text-gray-500 mt-1 ml-2">{timestamp}</span>
        )}
      </div>
    </div>
  );
};
