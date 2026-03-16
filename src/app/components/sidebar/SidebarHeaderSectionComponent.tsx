import React from "react";

interface SidebarHeaderProps {
  isExpanded: boolean;
}

export const SidebarHeader = React.memo(function SidebarHeaderComponent({
  isExpanded,
}: SidebarHeaderProps) {
  return (
    <div
      className={`flex flex-col  items-center gap-2 border-b border-black/25 transition-all duration-300 px-0 py-8`}
    >
      {/* Logo + Title container */}
      <div
        className={`flex items-center transition-all duration-300 w-full ${
          isExpanded ? "justify-start pt-0 px-12" : "justify-center pt-0"
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
        {isExpanded && (
          <h1 className="-ml-2.5 pt-2.5 text-sm text-black-700 whitespace-nowrap transition-all duration-300">
            askerAI
          </h1>
        )}
      </div>
    </div>
  );
});
