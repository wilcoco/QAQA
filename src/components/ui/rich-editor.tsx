"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect } from "react";
import { Button } from "./button";

// ── 툴바 버튼 설정 ───────────────────────────────────────────
interface ToolbarButtonProps {
  editor: Editor;
  action: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({ action, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={action}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded text-sm transition-colors ${
        isActive
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

// ── 에디터 툴바 ───────────────────────────────────────────
function EditorToolbar({ editor, onImageUpload }: { editor: Editor; onImageUpload?: (file: File) => Promise<string> }) {
  const addImage = useCallback(() => {
    if (!onImageUpload) {
      // 직접 URL 입력 (fallback)
      const url = window.prompt("이미지 URL을 입력하세요:");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
      return;
    }

    // 파일 선택 다이얼로그
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const url = await onImageUpload(file);
          editor.chain().focus().setImage({ src: url }).run();
        } catch (error) {
          console.error("Image upload failed:", error);
          alert("이미지 업로드에 실패했습니다.");
        }
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const addLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("링크 URL을 입력하세요:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap gap-0.5 p-1.5 border-b bg-muted/30">
      {/* 텍스트 서식 */}
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="굵게 (Ctrl+B)"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="기울임 (Ctrl+I)"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="취소선"
      >
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="인라인 코드"
      >
        <code className="text-xs">{`</>`}</code>
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1 self-center" />

      {/* 헤딩 */}
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="제목"
      >
        H
      </ToolbarButton>

      {/* 리스트 */}
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="글머리 기호"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="번호 매기기"
      >
        1.
      </ToolbarButton>

      {/* 인용 */}
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="인용"
      >
        &ldquo;
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1 self-center" />

      {/* 링크 & 이미지 */}
      <ToolbarButton
        editor={editor}
        action={addLink}
        isActive={editor.isActive("link")}
        title="링크 삽입"
      >
        🔗
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        action={addImage}
        title="이미지 삽입"
      >
        🖼️
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1 self-center" />

      {/* 실행 취소/다시 실행 */}
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="실행 취소 (Ctrl+Z)"
      >
        ↩
      </ToolbarButton>
      <ToolbarButton
        editor={editor}
        action={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="다시 실행 (Ctrl+Y)"
      >
        ↪
      </ToolbarButton>
    </div>
  );
}

// ── 메인 에디터 컴포넌트 ───────────────────────────────────────────
export interface RichEditorProps {
  content?: string;
  contentJson?: object;
  onChange?: (data: { html: string; json: object; text: string }) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
  editable?: boolean;
  minHeight?: string;
  maxLength?: number;
  className?: string;
  showToolbar?: boolean;
}

export function RichEditor({
  content = "",
  contentJson,
  onChange,
  placeholder = "내용을 입력하세요...",
  onImageUpload,
  editable = true,
  minHeight = "120px",
  maxLength,
  className = "",
  showToolbar = true,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg my-2",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: contentJson || content,
    editable,
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-3 py-2 ${
          editable ? "" : "cursor-default"
        }`,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor }) => {
      if (!onChange) return;

      const html = editor.getHTML();
      const json = editor.getJSON();
      const text = editor.getText();

      // maxLength 체크
      if (maxLength && text.length > maxLength) {
        return;
      }

      onChange({ html, json, text });
    },
  });

  // content prop 변경 시 에디터 내용 업데이트
  useEffect(() => {
    if (editor && contentJson) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(contentJson);
      if (currentJson !== newJson) {
        editor.commands.setContent(contentJson);
      }
    }
  }, [editor, contentJson]);

  if (!editor) {
    return (
      <div className={`border rounded-lg bg-background ${className}`} style={{ minHeight }}>
        <div className="p-3 text-muted-foreground text-sm">로딩 중...</div>
      </div>
    );
  }

  const charCount = editor.getText().length;

  return (
    <div className={`border rounded-lg bg-background overflow-hidden ${className}`}>
      {showToolbar && editable && <EditorToolbar editor={editor} onImageUpload={onImageUpload} />}
      <EditorContent editor={editor} />
      {maxLength && editable && (
        <div className={`text-xs px-3 py-1 border-t text-right ${
          charCount > maxLength ? "text-red-500" : "text-muted-foreground"
        }`}>
          {charCount} / {maxLength}
        </div>
      )}
    </div>
  );
}

// ── 읽기 전용 렌더러 (HTML 콘텐츠 표시용) ───────────────────────────────────────────
export function RichContent({ html, className = "" }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
