"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import ImageExtension from "@tiptap/extension-image";
import type { Editor } from "@tiptap/react";
import VoiceMicButton from "./VoiceMicButton";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  entryId?: string;
  onVoiceNoteSaved?: () => void;
  onEditorReady?: (insertText: (text: string) => void) => void;
  aiOpen?: boolean;
  onAiToggle?: () => void;
  isPrivate?: boolean;
  onPrivateToggle?: () => void;
  onImageInsert?: (file: File) => Promise<string | null>;
  onImagePickerReady?: (trigger: () => void) => void;
}

// ── Toolbar ──────────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor losing focus
        onClick();
      }}
      title={title}
      className={`px-1.5 py-1 rounded text-sm transition-colors ${
        active
          ? "bg-primary text-white"
          : "text-foreground/60 hover:text-foreground hover:bg-foreground/8"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-foreground/20 mx-0.5" />;
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-foreground/10 bg-card/50">
      <div className="flex items-center gap-0.5 flex-wrap flex-1 min-w-0">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Inline code"
        >
          <code className="text-xs font-mono">`c`</code>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered list"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h1v4M4 6H3m1 4H3m0 0h2M3 14h2l-2 3h2M8 8h13M8 14h13" />
          </svg>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          active={false}
          title="Horizontal rule"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
          </svg>
        </ToolbarButton>
      </div>
    </div>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  entryId,
  onVoiceNoteSaved,
  onEditorReady,
  aiOpen,
  onAiToggle,
  isPrivate,
  onPrivateToggle,
  onImageInsert,
  onImagePickerReady,
}: MarkdownEditorProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEditorReadyRef = useRef(onEditorReady);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const onImageInsertRef = useRef(onImageInsert);
  useEffect(() => { onImageInsertRef.current = onImageInsert; }, [onImageInsert]);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (window.innerWidth >= 768) setToolbarOpen(true);
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);

      setIsTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setIsTyping(false), 1500);
    },
    [onChange],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder ?? "Write something…",
      }),
      ImageExtension.configure({ inline: false, allowBase64: false }),
    ],
    content: value || "",
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: "fw-prose outline-none min-h-full px-6 py-4 pb-20 md:pb-4",
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items || !onImageInsertRef.current) return false;
        // Take the first image item we find — stop immediately regardless of
        // whether getAsFile() succeeds, so iOS multi-representation clipboards
        // don't trigger a second upload.
        const imageItem = Array.from(items).find((i) => i.type.startsWith("image/"));
        if (!imageItem) return false;
        const file = imageItem.getAsFile();
        if (file) {
          event.preventDefault();
          uploadImage(file);
        }
        return true;
      },
    },
  });

  const uploadImage = useCallback(async (file: File) => {
    if (!onImageInsertRef.current) return;
    setImageUploading(true);
    try {
      const url = await onImageInsertRef.current(file);
      if (url && editorRef.current) {
        editorRef.current.chain().focus().setImage({ src: url }).createParagraphNear().run();
      }
    } finally {
      setImageUploading(false);
    }
  }, []);

  const handleTranscript = useCallback((text: string) => {
    editor?.chain().focus().insertContent({ type: "paragraph", content: [{ type: "text", text }] }).run();
  }, [editor]);

  useEffect(() => { editorRef.current = editor ?? null; }, [editor]);

  useEffect(() => {
    if (onImagePickerReady) {
      onImagePickerReady(() => imageInputRef.current?.click());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose insertText to parent for the mobile floating footer mic button
  useEffect(() => {
    if (!editor || !onEditorReadyRef.current) return;
    onEditorReadyRef.current((text: string) => {
      editor.chain().focus().insertContent({ type: "paragraph", content: [{ type: "text", text }] }).run();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Sync when value changes externally (e.g. template applied)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  return (
    <div className="flex flex-col flex-1 min-h-0 border border-foreground/20 rounded-xl overflow-hidden">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
          e.target.value = "";
        }}
      />
      {/* Toolbar strip — Format toggle on the left, action pills on the right (desktop) */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-foreground/10 bg-card/50">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setToolbarOpen((v) => !v); }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
            toolbarOpen
              ? "bg-primary/10 text-primary"
              : "text-foreground/40 hover:text-foreground hover:bg-foreground/8"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
          Format
        </button>
        {/* Action pills — desktop only (mobile has floating footer) */}
        <div className="hidden md:flex items-center gap-2">
          <VoiceMicButton
            pill
            onTranscript={handleTranscript}
            entryId={entryId}
            onSaved={onVoiceNoteSaved}
          />
          {onImageInsert && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => imageInputRef.current?.click()}
              disabled={imageUploading}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors text-foreground/50 hover:text-foreground bg-foreground/5 hover:bg-foreground/10 disabled:opacity-40"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              {imageUploading ? "Uploading…" : "Image"}
            </button>
          )}
          {onPrivateToggle && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onPrivateToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
                isPrivate
                  ? "bg-foreground/20 text-foreground"
                  : "text-foreground/50 hover:text-foreground bg-foreground/5 hover:bg-foreground/10"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Private
            </button>
          )}
          {onAiToggle && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onAiToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
                aiOpen
                  ? "bg-primary text-white"
                  : "text-foreground/50 hover:text-foreground bg-foreground/5 hover:bg-foreground/10"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              AI
            </button>
          )}
        </div>
      </div>

      {/* Toolbar — smooth collapse on all screen sizes */}
      <div className={`grid transition-all duration-200 ease-in-out ${toolbarOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className={`overflow-hidden transition-opacity duration-500 hover:opacity-100 ${isTyping ? "opacity-[0.15]" : "opacity-100"}`}>
          <Toolbar editor={editor} />
        </div>
      </div>
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}
