"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imageAltText, setImageAltText] = useState("");
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const { t } = useI18n();

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: value || "",
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        link: {
          autolink: true,
          defaultProtocol: "https",
          openOnClick: false,
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: null,
          },
        },
      }),
      Image.configure({
        HTMLAttributes: {
          decoding: "async",
          loading: "lazy",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "",
      }),
    ],
    editorProps: {
      attributes: {
        "aria-label": t("blogCms.form.editorPlaceholder"),
        "aria-multiline": "true",
        class: "focus-visible:outline-none",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;

    const nextValue = value || "";
    const currentValue = editor.isEmpty ? "" : editor.getHTML();

    if (currentValue !== nextValue) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
    }
  }, [editor, value]);

  const run = (command: () => void) => {
    if (!editor || disabled) return;
    command();
  };

  const openLinkDialog = () => {
    if (!editor || disabled) return;

    setLinkUrl(editor.getAttributes("link").href || "");
    setIsLinkDialogOpen(true);
  };

  const closeLinkDialog = () => {
    setIsLinkDialogOpen(false);
    setLinkUrl("");
  };

  const submitLinkDialog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || disabled) return;

    const href = normalizeHref(linkUrl.trim());

    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      closeLinkDialog();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    closeLinkDialog();
  };

  const removeLink = () => {
    if (!editor || disabled) return;

    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    closeLinkDialog();
  };

  const insertImage = async (file: File, alt: string) => {
    if (!editor || !onImageUpload || disabled) return false;

    setIsUploading(true);
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url, alt }).run();
      return true;
    } catch {
      // The caller owns user-facing upload errors.
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const closeImageDialog = () => {
    setPendingImageFile(null);
    setImageAltText("");
  };

  const submitImageDialog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingImageFile) return;

    const didInsert = await insertImage(pendingImageFile, imageAltText);
    if (didInsert) {
      closeImageDialog();
    }
  };

  const isEditorReady = Boolean(editor);
  const isActionDisabled = disabled || !isEditorReady;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div
        className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 p-1.5"
        role="toolbar"
        aria-label={t("blogCms.editor.toolbar")}
      >
        <ToolbarButton
          label={t("blogCms.editor.paragraph")}
          onClick={() =>
            run(() => editor?.chain().focus().setParagraph().run())
          }
          active={editor?.isActive("paragraph")}
          disabled={isActionDisabled}
        >
          <Pilcrow className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.heading2")}
          onClick={() =>
            run(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())
          }
          active={editor?.isActive("heading", { level: 2 })}
          disabled={isActionDisabled}
        >
          <Heading2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.heading3")}
          onClick={() =>
            run(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())
          }
          active={editor?.isActive("heading", { level: 3 })}
          disabled={isActionDisabled}
        >
          <Heading3 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("blogCms.editor.bold")}
          onClick={() => run(() => editor?.chain().focus().toggleBold().run())}
          active={editor?.isActive("bold")}
          disabled={isActionDisabled}
        >
          <Bold className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.italic")}
          onClick={() =>
            run(() => editor?.chain().focus().toggleItalic().run())
          }
          active={editor?.isActive("italic")}
          disabled={isActionDisabled}
        >
          <Italic className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("blogCms.editor.bulletList")}
          onClick={() =>
            run(() => editor?.chain().focus().toggleBulletList().run())
          }
          active={editor?.isActive("bulletList")}
          disabled={isActionDisabled}
        >
          <List className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.orderedList")}
          onClick={() =>
            run(() => editor?.chain().focus().toggleOrderedList().run())
          }
          active={editor?.isActive("orderedList")}
          disabled={isActionDisabled}
        >
          <ListOrdered className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.quote")}
          onClick={() =>
            run(() => editor?.chain().focus().toggleBlockquote().run())
          }
          active={editor?.isActive("blockquote")}
          disabled={isActionDisabled}
        >
          <Quote className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("blogCms.editor.link")}
          onClick={openLinkDialog}
          active={editor?.isActive("link")}
          disabled={isActionDisabled}
        >
          <Link2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.image")}
          onClick={() => fileInputRef.current?.click()}
          disabled={isActionDisabled || isUploading || !onImageUpload}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-4" aria-hidden="true" />
          )}
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("blogCms.editor.undo")}
          onClick={() => run(() => editor?.chain().focus().undo().run())}
          disabled={isActionDisabled || !editor?.can().undo()}
        >
          <Undo2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blogCms.editor.redo")}
          onClick={() => run(() => editor?.chain().focus().redo().run())}
          disabled={isActionDisabled || !editor?.can().redo()}
        >
          <Redo2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        className={cn(
          "blog-editor-prose break-words text-sm leading-7",
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
          if (file) {
            setPendingImageFile(file);
            setImageAltText("");
          }
        }}
      />

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <form onSubmit={submitLinkDialog} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t("blogCms.editor.linkTitle")}</DialogTitle>
              <DialogDescription>
                {t("blogCms.editor.linkDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="editor-link-url">
                {t("blogCms.editor.linkUrl")}
              </Label>
              <Input
                id="editor-link-url"
                type="text"
                inputMode="url"
                value={linkUrl}
                disabled={disabled}
                autoFocus
                placeholder="https://"
                onChange={(event) => setLinkUrl(event.target.value)}
              />
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={disabled || !editor?.isActive("link")}
                onClick={removeLink}
              >
                <Unlink className="size-4" aria-hidden="true" />
                {t("blogCms.editor.removeLink")}
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={closeLinkDialog}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={disabled}>
                  {t("blogCms.editor.applyLink")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingImageFile)}
        onOpenChange={(open) => {
          if (!open && !isUploading) {
            closeImageDialog();
          }
        }}
      >
        <DialogContent>
          <form onSubmit={submitImageDialog} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t("blogCms.editor.imageAltTitle")}</DialogTitle>
              <DialogDescription>
                {t("blogCms.editor.imageAltDescription")}
              </DialogDescription>
            </DialogHeader>
            {pendingImageFile && (
              <p className="truncate rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                {pendingImageFile.name}
              </p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="editor-image-alt">
                {t("blogCms.form.imageAlt")}
              </Label>
              <Input
                id="editor-image-alt"
                value={imageAltText}
                disabled={isUploading}
                autoFocus
                onChange={(event) => setImageAltText(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isUploading}
                onClick={closeImageDialog}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                {t("blogCms.editor.insertImage")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="icon"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className="size-9 shrink-0"
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

function normalizeHref(value: string) {
  if (!value || value.startsWith("/") || value.startsWith("#")) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;

  return `https://${value}`;
}
