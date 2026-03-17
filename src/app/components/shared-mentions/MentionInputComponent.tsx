"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MentionData,
  getMentionSuggestions,
  parseMentions,
  ParsedMention,
} from "@/utils/mentionUtils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentions: ParsedMention[]) => void;
  placeholder?: string;
  availableUsers: MentionData[];
  currentUserId?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

const MentionInputComponent = ({
  value,
  onChange,
  onMentionsChange,
  placeholder = "Type @ to mention someone...",
  availableUsers,
  currentUserId,
  className = "",
  disabled = false,
  rows = 3,
}: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionData[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastParsedValueRef = useRef<string>(value);

  // Handle external value changes (e.g., when input is cleared)
  useEffect(() => {
    if (value !== lastParsedValueRef.current) {
      const { mentions } = parseMentions(value);
      onMentionsChange?.(mentions);
      lastParsedValueRef.current = value;
    }
  }, [value]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart || 0;

      onChange(newValue);
      setCursorPosition(cursorPos);

      // Parse mentions and notify parent
      const { mentions } = parseMentions(newValue);
      onMentionsChange?.(mentions);
      lastParsedValueRef.current = newValue;

      // Check for @ mentions
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex !== -1) {
        const mentionQuery = textBeforeCursor.slice(atIndex);
        if (mentionQuery.length > 0) {
          const suggs = getMentionSuggestions(
            mentionQuery,
            availableUsers,
            currentUserId,
          );
          setSuggestions(suggs);
          setShowSuggestions(suggs.length > 0);
          setSelectedSuggestionIndex(0);
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    },
    [onChange, availableUsers, currentUserId],
  );

  const insertMention = useCallback(
    (user: MentionData) => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const textBeforeCursor = value.slice(0, cursorPosition);
      const textAfterCursor = value.slice(cursorPosition);

      // Find the @ that triggered the suggestion
      const atIndex = textBeforeCursor.lastIndexOf("@");
      if (atIndex === -1) return;

      // Replace from @ to cursor with the mention
      const newTextBefore =
        textBeforeCursor.slice(0, atIndex) +
        `@${user.name.replace(/\s+/g, "")} `;
      const newValue = newTextBefore + textAfterCursor;
      const newCursorPos = newTextBefore.length;

      onChange(newValue);
      setShowSuggestions(false);

      // Set cursor position after the mention
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, cursorPosition, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (suggestions[selectedSuggestionIndex]) {
            insertMention(suggestions[selectedSuggestionIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          break;
      }
    },
    [showSuggestions, suggestions, selectedSuggestionIndex, insertMention],
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${className}`}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((user, index) => (
            <div
              key={user.id}
              className={`px-3 py-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100 ${
                index === selectedSuggestionIndex ? "bg-blue-50" : ""
              }`}
              onClick={() => insertMention(user)}
            >
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-700">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const MentionInput = React.memo(MentionInputComponent);
MentionInput.displayName = "MentionInput";
