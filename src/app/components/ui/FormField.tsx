// components/ui/FormField.tsx
import React from "react";
import { FormFieldProps } from "../../types";
import { COLORS } from "../../constants";

export function FormField({
  placeholder,
  value,
  onChange,
  required,
  style,
  multiline,
}: FormFieldProps) {
  const baseStyle: React.CSSProperties = {
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.bg,
    color: COLORS.text,
    fontSize: 15,
    ...style,
  };

  if (multiline) {
    return (
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{
          ...baseStyle,
          resize: "vertical" as const,
          minHeight: 48,
          fontFamily: "inherit",
        }}
      />
    );
  }

  return (
    <input
      type="text"
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={baseStyle}
    />
  );
}
