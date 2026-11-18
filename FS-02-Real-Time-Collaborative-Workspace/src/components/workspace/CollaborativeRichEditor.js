
"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";

function ToolbarButton({ editor, command, active, children }) {
  if (!editor) return null;

  return (
    <button
      type="button"
      onClick={() => editor.chain().focus()[command]().run()}
      disabled={!editor.isEditable}
      className={`rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${
        editor.isActive(active)
          ? "border-indigo-300 bg-indigo-100 text-indigo-700"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function CollaborativeRichEditor({
  doc,
  provider,
  user,
  canEdit,
  synced,
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit && synced,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: doc,
        field: "richContent",
      }),
      CollaborationCaret.configure({
        provider,
        user: {
          name: user.name,
          color: user.color,
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[420px] w-full px-5 py-4 text-base leading-7 text-slate-900 outline-none",
      },
    },
  });

  // Update edit permission when role or sync status changes.
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit && synced);
    }
  }, [editor, canEdit, synced]);

  if (!editor) {
    return (
      <div className="min-h-[420px] p-5 text-sm text-slate-500">
        Initializing rich text editor...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3">
        <ToolbarButton editor={editor} command="toggleBold" active="bold">
          B
        </ToolbarButton>

        <ToolbarButton editor={editor} command="toggleItalic" active="italic">
          I
        </ToolbarButton>

        <ToolbarButton editor={editor} command="toggleStrike" active="strike">
          S
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          command="toggleBulletList"
          active="bulletList"
        >
          • List
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          command="toggleOrderedList"
          active="orderedList"
        >
          1. List
        </ToolbarButton>

        <ToolbarButton
          editor={editor}
          command="toggleBlockquote"
          active="blockquote"
        >
          Quote
        </ToolbarButton>

        <button
          type="button"
          disabled={!editor.isEditable}
          onClick={() => editor.chain().focus().undo().run()}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:opacity-40"
        >
          Undo
        </button>

        <button
          type="button"
          disabled={!editor.isEditable}
          onClick={() => editor.chain().focus().redo().run()}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:opacity-40"
        >
          Redo
        </button>
      </div>

      <EditorContent editor={editor} />

      {!canEdit && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-xs text-slate-500">
          You have read-only access to this document.
        </div>
      )}
    </div>
  );
}
