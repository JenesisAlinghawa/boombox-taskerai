import React from "react";
import { Activity } from "lucide-react";

const DijkstraPanel = () => {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-4">
        Dijkstra Task Optimization
      </h2>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <Activity size={32} className="text-blue-400" />
        <p className="text-sm text-gray-300">
          Task dependency optimization visualization
        </p>
        <p className="text-xs text-gray-400">
          Optimized scheduling based on task dependencies
        </p>
      </div>
    </div>
  );
};

export default DijkstraPanel;
