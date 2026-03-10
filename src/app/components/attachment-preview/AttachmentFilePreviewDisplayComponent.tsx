import React from "react";

export default function FilePreview({ file }: { file: File | { name: string; type: string; url: string } }) {
  // Accepts File object or { name, type, url }
  const isImage = file.type.startsWith("image/");
  const isPDF = file.type === "application/pdf";
  const url = (file instanceof File) ? URL.createObjectURL(file) : file.url;
  return (
    <div style={{ marginBottom: 8 }}>
      {isImage && (
        <img src={url} alt={file.name} style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: "1px solid #2D3142" }} />
      )}
      {isPDF && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
          <span role="img" aria-label="PDF">📄</span> {file.name}
        </a>
      )}
      {!isImage && !isPDF && (
        <span>{file.name}</span>
      )}
    </div>
  );
}
