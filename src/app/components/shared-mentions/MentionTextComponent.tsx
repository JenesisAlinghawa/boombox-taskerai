"use client";

import React from "react";
import { renderTextWithMentions, ParsedMention } from "@/utils/mentionUtils";

interface MentionTextProps {
  text: string;
  mentions?: ParsedMention[];
  onMentionClick?: (mention: ParsedMention) => void;
  className?: string;
}

export function MentionText({
  text,
  mentions = [],
  onMentionClick,
  className = "",
}: MentionTextProps) {
  return (
    <span className={className}>
      {renderTextWithMentions(text, mentions, onMentionClick)}
    </span>
  );
}
