import React from "react";
import { SidebarClose, SidebarOpen } from "lucide-react";

interface SidebarHeaderProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const SidebarHeader = React.memo(function SidebarHeaderComponent({
  collapsed,
  setCollapsed,
}: SidebarHeaderProps) {
  return (
    <div
      className={`flex flex-col  items-center gap-2 border-b border-black/25 transition-all duration-300 px-0 py-5`}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute right-3 top-3 z-10 bg-transparent border-none cursor-pointer text-black px-3 py-2 flex items-center justify-center hover:text-gray-700 transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <SidebarOpen size={16} /> : <SidebarClose size={16} />}
      </button>

      {/* Logo + Title container */}
      <div
        className={`flex items-center transition-all duration-300 w-full ${
          collapsed
            ? "justify-center pt-[52px]"
            : "justify-start pt-[52px] px-12"
        }`}
      >
        {/* Logo that scales */}
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 transition-all duration-300 flex items-center justify-center">
          <img
            src="/assets/images/taskeraiLogo.png"
            alt="TaskerAI Logo"
            className="w-full h-full object-cover transition-all duration-300"
          />
        </div>

        {/* Title appears only when expanded */}
        {!collapsed && (
          <h1 className="-ml-2.5 pt-2.5 text-sm text-black-700 whitespace-nowrap transition-all duration-300">
            askerAI
          </h1>
        )}
      </div>
    </div>
  );
});
