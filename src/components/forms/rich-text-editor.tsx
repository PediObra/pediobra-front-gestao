"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function RichTextEditor({
  value,
  onChange,
  onImageUpload,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      selectionRef.current = range;
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = selectionRef.current;
    if (!selection || !range) return;

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML ?? "");
    saveSelection();
  };

  const runCommand = (command: string, valueArg?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, valueArg);
    emitChange();
  };

  const formatBlock = (tag: "p" | "h2" | "h3" | "blockquote") => {
    runCommand("formatBlock", tag);
  };

  const addLink = () => {
    const url = window.prompt("https://");
    if (!url) return;
    runCommand("createLink", url);
  };

  const insertImage = async (file: File) => {
    if (!onImageUpload) return;

    setIsUploading(true);
    try {
      const url = await onImageUpload(file);
      const alt = window.prompt("Alt text") ?? "";
      restoreSelection();
      document.execCommand(
        "insertHTML",
        false,
        `<figure><img src="${escapeAttribute(url)}" alt="${escapeAttribute(
          alt,
        )}" loading="lazy" decoding="async" /></figure>`,
      );
      emitChange();
    } catch {
      // The caller owns user-facing upload errors.
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 p-1.5">
        <ToolbarButton
          label={t("blogCms.editor.paragraph")}
          onClick={() => formatBlock("p")}
          disabled={disabled}
        >
          <Pilcrow className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.heading2")}
          onClick={() => formatBlock("h2")}
          disabled={disabled}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.heading3")}
          onClick={() => formatBlock("h3")}
          disabled={disabled}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("blogCms.editor.bold")}
          onClick={() => runCommand("bold")}
          disabled={disabled}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.italic")}
          onClick={() => runCommand("italic")}
          disabled={disabled}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("blogCms.editor.bulletList")}
          onClick={() => runCommand("insertUnorderedList")}
          disabled={disabled}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.orderedList")}
          onClick={() => runCommand("insertOrderedList")}
          disabled={disabled}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.quote")}
          onClick={() => formatBlock("blockquote")}
          disabled={disabled}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("blogCms.editor.link")}
          onClick={addLink}
          disabled={disabled}
        >
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.image")}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || !onImageUpload}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("blogCms.editor.undo")}
          onClick={() => runCommand("undo")}
          disabled={disabled}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.redo")}
          onClick={() => runCommand("redo")}
          disabled={disabled}
        >
          <Redo2 className="size-4" />
        </ToolbarButton>
      </div>

      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className={cn(
          "blog-editor-prose min-h-[22rem] overflow-y-auto break-words px-4 py-4 text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[28rem]",
          "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          disabled && "cursor-not-allowed opacity-70",
        )}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) void insertImage(file);
        }}
      />
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      disabled={disabled}
      className="size-8"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
