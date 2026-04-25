"use client"

import { useCallback, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Link2,
  ImageIcon,
  Paperclip,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadTaskAsset } from "@/lib/supabase"

export interface AttachedFile {
  id?: string
  name: string
  url?: string
}

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  taskId?: string
  attachedFiles?: AttachedFile[]
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Add a description…",
  className,
  taskId,
  attachedFiles = [],
}: RichTextEditorProps) {
  const [linkInputOpen, setLinkInputOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [filePickerOpen, setFilePickerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-xl max-w-full my-2" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "min-h-[120px] px-3 py-2 text-sm focus:outline-none",
      },
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items ?? [])
        const imageItem = items.find((i) => i.type.startsWith("image/"))
        if (!imageItem) return false
        event.preventDefault()
        const file = imageItem.getAsFile()
        if (!file) return false
        setUploading(true)
        uploadTaskAsset(file, taskId)
          .then((url) => {
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: url })
              )
            )
          })
          .catch(console.error)
          .finally(() => setUploading(false))
        return true
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      onChange(html === "<p></p>" ? "" : html)
    },
  })

  const applyLink = useCallback(() => {
    if (!editor) return
    const url = linkUrl.trim()
    if (!url) {
      editor.chain().focus().unsetLink().run()
    } else {
      const href = url.startsWith("http") ? url : `https://${url}`
      editor.chain().focus().setLink({ href }).run()
    }
    setLinkUrl("")
    setLinkInputOpen(false)
  }, [editor, linkUrl])

  const insertFileLink = useCallback(
    (file: AttachedFile) => {
      if (!editor) return
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to)
      const label = selectedText || file.name
      const href = file.url ?? `#file:${encodeURIComponent(file.name)}`
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="${href}" target="${file.url ? "_blank" : "_self"}" rel="noopener noreferrer" class="text-primary underline underline-offset-2">${label}</a>`
        )
        .run()
      setFilePickerOpen(false)
    },
    [editor]
  )

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return
      setUploading(true)
      try {
        const url = await uploadTaskAsset(file, taskId)
        editor.chain().focus().setImage({ src: url }).run()
      } catch (e) {
        console.error(e)
      } finally {
        setUploading(false)
      }
    },
    [editor, taskId]
  )

  if (!editor) return null

  const tools = [
    {
      label: "Bold",
      icon: <Bold className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      label: "Italic",
      icon: <Italic className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    {
      label: "Strike",
      icon: <Strikethrough className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
    },
    {
      label: "Bullet list",
      icon: <List className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      label: "Ordered list",
      icon: <ListOrdered className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
  ]

  return (
    <div className={cn("rounded-2xl border bg-background overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        {tools.map((t) => (
          <Button
            key={t.label}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t.label}
            onClick={t.action}
            className={cn("h-7 w-7 rounded-lg", t.active && "bg-muted text-foreground")}
          >
            {t.icon}
          </Button>
        ))}

        {/* Divider */}
        <span className="mx-1 h-4 w-px bg-border" />

        {/* Link button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Add link"
          onClick={() => {
            setFilePickerOpen(false)
            setLinkUrl(editor.getAttributes("link").href ?? "")
            setLinkInputOpen((o) => !o)
          }}
          className={cn("h-7 w-7 rounded-lg", editor.isActive("link") && "bg-muted text-foreground")}
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>

        {/* Image upload button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Insert image"
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
          className="h-7 w-7 rounded-lg"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageUpload(file)
            e.target.value = ""
          }}
        />

        {/* Link to file button — only shown when files are attached */}
        {attachedFiles.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Link to file"
            onClick={() => {
              setLinkInputOpen(false)
              setFilePickerOpen((o) => !o)
            }}
            className={cn("h-7 w-7 rounded-lg", filePickerOpen && "bg-muted text-foreground")}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
        )}

        {uploading && (
          <span className="ml-2 text-xs text-muted-foreground animate-pulse">Uploading…</span>
        )}
      </div>

      {/* Link URL input */}
      {linkInputOpen && (
        <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/30">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-7 rounded-xl border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink()
              if (e.key === "Escape") setLinkInputOpen(false)
            }}
          />
          <Button size="sm" variant="outline" className="h-7 rounded-xl text-xs px-2 shrink-0" onClick={applyLink}>
            Apply
          </Button>
          {editor.isActive("link") && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-xl text-xs px-2 shrink-0 text-destructive hover:text-destructive"
              onClick={() => {
                editor.chain().focus().unsetLink().run()
                setLinkInputOpen(false)
              }}
            >
              Remove
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-xl shrink-0" onClick={() => setLinkInputOpen(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* File picker */}
      {filePickerOpen && attachedFiles.length > 0 && (
        <div className="border-b bg-muted/30 px-3 py-2 space-y-1">
          <p className="text-xs text-muted-foreground mb-1.5">Link to attached file</p>
          {attachedFiles.map((f, i) => (
            <button
              key={f.id ?? i}
              type="button"
              onClick={() => insertFileLink(f)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-muted text-left"
            >
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
