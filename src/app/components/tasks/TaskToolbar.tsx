import React from "react";
import type { Dispatch, SetStateAction } from "react";

interface Props {
  setShowCreateModal: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  sortBy: string;
  setSortBy: Dispatch<SetStateAction<string>>;
  sortOrder: "asc" | "desc";
  setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
  viewMode: "list" | "grid";
  setViewMode: Dispatch<SetStateAction<"list" | "grid">>;
}

export default function TaskToolbar({
  setShowCreateModal,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
}: Props) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {/* Search Bar */}
      <div className="flex items-center gap-15 px-[18px] py-2 rounded-full bg-blue-500/15 shadow-md">
        <span className="text-base">🔍</span>
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-none -ml-[50px] border-none text-white text-sm outline-none w-[200px]"
        />
      </div>

      {/* Toolbar Controls */}
      <div className="flex gap-2">
        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-2.5 py-1 rounded-lg bg-blue-500/25 text-white shadow-sm text-sm cursor-pointer"
        >
          <option value="task">Task</option>
          <option value="assignee">Assignee</option>
          <option value="status">Status</option>
          <option value="priority">Priority</option>
          <option value="duedate">Due Date</option>
        </select>

        {/* Sort Order */}
        <button
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          className="p-2 rounded-lg bg-transparent text-white shadow-md cursor-pointer text-xs font-normal hover:bg-white/10 transition-colors"
        >
          {sortOrder === "asc" ? "↑ ASC" : "↓ DESC"}
        </button>

        {/* View Mode */}
        <button
          onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
          className={`px-3 py-2 rounded-lg border border-blue-500/50 text-white cursor-pointer text-xs font-semibold transition-all ${
            viewMode === "grid" ? "bg-blue-600" : "bg-blue-500/30"
          }`}
        >
          {viewMode === "grid" ? "📊 Grid" : "📋 List"}
        </button>
      </div>

      {/* Create Button */}
      <div className="ml-auto">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white border-none cursor-pointer text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + New task
        </button>
      </div>
    </div>
  );
}
