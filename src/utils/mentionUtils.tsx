"use client";

/**
 * Utility functions for handling mentions in text
 */

import React from "react";

export interface MentionData {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

export interface ParsedMention {
  userId: string;
  username: string;
  displayName: string;
}

/**
 * Parse text for @mentions and return structured data
 * Supports @username format
 */
export function parseMentions(text: string): {
  text: string;
  mentions: ParsedMention[];
} {
  const mentionRegex = /@(\w+)(?:\s|$)/g;
  const mentions: ParsedMention[] = [];

  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    // For now, we'll store the username - this will be resolved later
    mentions.push({
      userId: username, // This will be resolved to actual user ID
      username: username,
      displayName: username,
    });
  }

  return {
    text,
    mentions,
  };
}

/**
 * Resolve mention usernames to actual user data
 */
export async function resolveMentions(
  mentions: ParsedMention[],
  availableUsers: MentionData[],
): Promise<ParsedMention[]> {
  return mentions.map((mention) => {
    // Try to find user by email (username@domain) or by name
    const user = availableUsers.find(
      (u) =>
        u.email.toLowerCase().startsWith(mention.username.toLowerCase()) ||
        u.name
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(mention.username.toLowerCase()) ||
        u.email.split("@")[0].toLowerCase() === mention.username.toLowerCase(),
    );

    if (user) {
      return {
        ...mention,
        userId: user.id,
        displayName: user.name,
      };
    }

    return mention; // Keep original if not found
  });
}

/**
 * Render text with mentions highlighted
 */
export function renderTextWithMentions(
  text: string,
  mentions: ParsedMention[] = [],
  onMentionClick?: (mention: ParsedMention) => void,
): React.ReactNode {
  if (!mentions.length) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort mentions by their position in text
  const sortedMentions = mentions
    .map((mention) => ({
      ...mention,
      index: text.indexOf(`@${mention.username}`),
    }))
    .filter((m) => m.index !== -1)
    .sort((a, b) => a.index - b.index);

  sortedMentions.forEach((mention, index) => {
    const mentionText = `@${mention.username}`;

    // Add text before mention
    if (mention.index > lastIndex) {
      parts.push(text.slice(lastIndex, mention.index));
    }

    // Add highlighted mention
    parts.push(
      <span
        key={index}
        className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded cursor-pointer hover:bg-blue-200 transition-colors font-medium"
        onClick={() => onMentionClick?.(mention)}
        title={`@${mention.displayName}`}
      >
        @{mention.displayName}
      </span>,
    );

    lastIndex = mention.index + mentionText.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Extract unique user IDs from mentions
 */
export function extractMentionedUserIds(mentions: ParsedMention[]): string[] {
  return [...new Set(mentions.map((m) => m.userId))];
}

/**
 * Create mention suggestions based on input
 */
export function getMentionSuggestions(
  input: string,
  availableUsers: MentionData[],
  currentUserId?: string,
): MentionData[] {
  if (!input.startsWith("@")) return [];

  const query = input.slice(1).toLowerCase();
  if (!query) return availableUsers.slice(0, 5); // Show first 5 when just @

  return availableUsers
    .filter(
      (user) =>
        user.id !== currentUserId && // Don't suggest current user
        (user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.email.split("@")[0].toLowerCase().includes(query)),
    )
    .slice(0, 5); // Limit to 5 suggestions
}
