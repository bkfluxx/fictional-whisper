"use client";

import dynamic from "next/dynamic";

// Must be lazy-loaded with ssr:false — @uiw/react-md-editor accesses window on init
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
}: MarkdownEditorProps) {
  return (
    <div data-color-mode="dark" className="flex-1 flex flex-col min-h-0">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height="100%"
        preview="live"
        data-color-mode="dark"
        textareaProps={{ placeholder: placeholder ?? "Write something…" }}
        style={{ flex: 1 }}
      />
    </div>
  );
}
