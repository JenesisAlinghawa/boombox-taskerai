"use client";

import React from "react";

export const DijkstraPlaceholder: React.FC = () => {
  return (
    <div className="w-full aspect-square max-h-96 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
      <div className="text-center">
        <p className="text-gray-400 font-semibold text-lg">
          DIJSKTRA APPEAR HERE
        </p>
        <p className="text-gray-300 text-sm mt-2">
          Graph visualization placeholder
        </p>
      </div>
    </div>
  );
};
