"use client";

import { useEffect, useRef } from "react";
import {
  Edit3,
  Copy,
  Link2,
  FolderInput,
  Tag,
  Star,
  GitMerge,
  Download,
  Trash2,
  ChevronRight,
} from "lucide-react";

interface BlockContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onLink: () => void;
  onDelete: () => void;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  submenu?: MenuItem[];
}

export function BlockContextMenu({
  x,
  y,
  nodeId,
  onEdit,
  onDuplicate,
  onLink,
  onDelete,
  onClose,
}: BlockContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const menuItems: MenuItem[] = [
    {
      id: "edit",
      label: "편집",
      icon: <Edit3 className="w-4 h-4" />,
      shortcut: "Enter",
      onClick: onEdit,
    },
    {
      id: "duplicate",
      label: "복제",
      icon: <Copy className="w-4 h-4" />,
      shortcut: "⌘D",
      onClick: onDuplicate,
    },
    {
      id: "link",
      label: "연결 추가",
      icon: <Link2 className="w-4 h-4" />,
      shortcut: "⌘L",
      onClick: onLink,
    },
    { id: "divider1", label: "", icon: null, divider: true },
    {
      id: "move",
      label: "폴더로 이동...",
      icon: <FolderInput className="w-4 h-4" />,
      onClick: () => {
        // TODO: 폴더 선택 모달
        onClose();
      },
    },
    {
      id: "tag",
      label: "태그 추가...",
      icon: <Tag className="w-4 h-4" />,
      onClick: () => {
        // TODO: 태그 선택 모달
        onClose();
      },
    },
    {
      id: "canonical",
      label: "정식 답변 지정",
      icon: <Star className="w-4 h-4" />,
      onClick: () => {
        // TODO: 정식 답변 설정
        onClose();
      },
    },
    { id: "divider2", label: "", icon: null, divider: true },
    {
      id: "merge",
      label: "병합 대상으로...",
      icon: <GitMerge className="w-4 h-4" />,
      onClick: () => {
        // TODO: 병합 모달
        onClose();
      },
    },
    {
      id: "export",
      label: "내보내기",
      icon: <Download className="w-4 h-4" />,
      onClick: () => {
        // TODO: 내보내기
        onClose();
      },
    },
    { id: "divider3", label: "", icon: null, divider: true },
    {
      id: "delete",
      label: "삭제",
      icon: <Trash2 className="w-4 h-4" />,
      shortcut: "⌫",
      onClick: onDelete,
      danger: true,
    },
  ];

  // 화면 경계 처리
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 400);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="w-52 py-1.5 bg-background/95 backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden">
        {menuItems.map((item) => {
          if (item.divider) {
            return (
              <div key={item.id} className="my-1 mx-2 border-t border-border/50" />
            );
          }

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`
                w-full flex items-center gap-2 px-3 py-1.5 text-sm
                transition-colors duration-100
                ${item.danger
                  ? "hover:bg-red-500/10 hover:text-red-500"
                  : "hover:bg-muted/80"
                }
              `}
            >
              <span className={item.danger ? "text-red-500" : "text-muted-foreground"}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-muted-foreground font-mono">
                  {item.shortcut}
                </span>
              )}
              {item.submenu && (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
