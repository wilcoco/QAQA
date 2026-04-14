"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence } from "framer-motion";

// 블록 컴포넌트들
import { KnowledgeBlockNodeAnimated } from "./block-node-animated";
import { BlockEdge } from "./block-edge";
import { BlockToolbar } from "./block-toolbar";
import { SlashCommandPalette } from "./slash-command-palette";
import { BlockContextMenu } from "./block-context-menu";

// 이펙트들
import {
  celebrateBlockCreation,
  celebrateMilestone,
  useFloatingEmojis,
  AchievementToast,
  Achievement,
  ZenModeOverlay,
  KeyboardHintsOverlay,
  useDragTrail,
} from "./block-effects";

// 테마
import { BlockThemeProvider, ThemePicker, ThemeParticles, useBlockTheme } from "./block-themes";

// 온보딩
import { BlockOnboarding, useFirstVisit } from "./block-onboarding";

// 사운드
import { SoundProvider, useSound, SoundSettings } from "./block-sounds";

// 타입
import {
  BlockNodeData,
  BlockType,
  BLOCK_CONFIG,
  SLASH_COMMANDS,
  KnowledgeBlockData,
  BlockLinkData,
  LinkType,
} from "@/types/knowledge-block";

import { Palette, Volume2, HelpCircle, Maximize2, Settings } from "lucide-react";

// 커스텀 노드/엣지 타입
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = {
  knowledgeBlock: KnowledgeBlockNodeAnimated,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes: any = {
  blockEdge: BlockEdge,
};

interface BlockCanvasEnhancedProps {
  topicClusterId?: string;
  initialBlocks?: KnowledgeBlockData[];
  initialLinks?: BlockLinkData[];
  onBlocksChange?: (blocks: KnowledgeBlockData[]) => void;
  onLinksChange?: (links: BlockLinkData[]) => void;
  readOnly?: boolean;
}

function BlockCanvasContent({
  topicClusterId,
  initialBlocks = [],
  initialLinks = [],
  onBlocksChange,
  onLinksChange,
  readOnly = false,
}: BlockCanvasEnhancedProps) {
  const reactFlowInstance = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);

  // 테마 & 사운드
  const { config: themeConfig } = useBlockTheme();
  const { play } = useSound();

  // 이펙트 훅들
  const { addEmoji, FloatingEmojisContainer } = useFloatingEmojis();
  const { startDrag, updateDrag, endDrag, DragTrailSvg } = useDragTrail();

  // 온보딩
  const { isFirstVisit, markAsVisited } = useFirstVisit();

  // UI 상태
  const [showSlashPalette, setShowSlashPalette] = useState(false);
  const [slashPosition, setSlashPosition] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    nodeId?: string;
  }>({ show: false, x: 0, y: 0 });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // 특수 모드
  const [zenMode, setZenMode] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(isFirstVisit);

  // 업적
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [blockCount, setBlockCount] = useState(initialBlocks.length);

  // 블록 삭제
  const handleDeleteBlock = useCallback(
    (id: string) => {
      play("delete");
      addEmoji("💨", window.innerWidth / 2, window.innerHeight / 2);
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [play, addEmoji]
  );

  // 블록 복제
  const handleDuplicateBlock = useCallback(
    (id: string) => {
      play("pop");
      setNodes((nds) => {
        const node = nds.find((n) => n.id === id);
        if (!node) return nds;

        const newId = `block-${Date.now()}`;
        const newNode: Node = {
          ...node,
          id: newId,
          position: {
            x: node.position.x + 30,
            y: node.position.y + 30,
          },
          data: {
            ...node.data,
            id: newId,
            title: `${(node.data as BlockNodeData).title} (복사본)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        return [...nds, newNode];
      });
    },
    [play]
  );

  // 연결 시작
  const startConnecting = useCallback((id: string) => {
    setIsConnecting(true);
    setSelectedBlockId(id);
  }, []);

  // 블록 접기/펼치기
  const handleCollapseBlock = useCallback(
    (id: string) => {
      play("whoosh");
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, isCollapsed: !(n.data as BlockNodeData).isCollapsed } }
            : n
        )
      );
    },
    [play]
  );

  // 블록 고정
  const handlePinBlock = useCallback(
    (id: string) => {
      play("click");
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, isPinned: !(n.data as BlockNodeData).isPinned } }
            : n
        )
      );
    },
    [play]
  );

  // 블록 -> React Flow 노드 변환
  const blocksToNodes = useCallback((blocks: KnowledgeBlockData[]): Node[] => {
    return blocks.map((block) => ({
      id: block.id,
      type: "knowledgeBlock",
      position: { x: block.posX, y: block.posY },
      data: {
        ...block,
        isSelected: selectedBlockId === block.id,
        isEditing: editingBlockId === block.id,
        onEdit: (id: string) => setEditingBlockId(id),
        onDelete: handleDeleteBlock,
        onDuplicate: handleDuplicateBlock,
        onLink: startConnecting,
        onCollapse: handleCollapseBlock,
        onPin: handlePinBlock,
      } as BlockNodeData,
      style: {
        width: block.width,
      },
    }));
  }, [selectedBlockId, editingBlockId, handleDeleteBlock, handleDuplicateBlock, startConnecting, handleCollapseBlock, handlePinBlock]);

  // 링크 -> React Flow 엣지 변환
  const linksToEdges = useCallback((links: BlockLinkData[]): Edge[] => {
    return links.map((link) => ({
      id: link.id,
      source: link.sourceId,
      target: link.targetId,
      type: "blockEdge",
      data: {
        linkType: link.linkType,
        label: link.label,
        style: link.style,
        color: link.color,
      },
      animated: link.linkType === "extends",
    }));
  }, []);

  // React Flow 상태
  const [nodes, setNodes, onNodesChange] = useNodesState(blocksToNodes(initialBlocks));
  const [edges, setEdges, onEdgesChange] = useEdgesState(linksToEdges(initialLinks));

  // 연결 처리
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      play("connect");

      const newEdge: Edge = {
        id: `${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        type: "blockEdge",
        data: {
          linkType: "reference" as LinkType,
          style: "solid",
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      setIsConnecting(false);
    },
    [setEdges, play]
  );

  // 블록 생성
  const createBlock = useCallback(
    (type: BlockType, position: { x: number; y: number }) => {
      const config = BLOCK_CONFIG[type];

      // 사운드 & 이펙트
      play("create");
      celebrateBlockCreation(position.x + 100, position.y + 50, {
        emoji: config.emoji,
        color: config.color,
      });
      addEmoji(config.emoji, window.innerWidth / 2, window.innerHeight / 2);

      const newBlockData: BlockNodeData = {
        id: `block-${Date.now()}`,
        blockType: type,
        title: `새 ${config.label}`,
        content: "",
        emoji: config.emoji,
        orderIndex: nodes.length,
        posX: position.x,
        posY: position.y,
        width: 240,
        height: 100,
        isCollapsed: false,
        isPinned: false,
        viewCount: 0,
        citationCount: 0,
        topicClusterId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isEditing: true,
        onEdit: (id: string) => setEditingBlockId(id),
        onDelete: handleDeleteBlock,
        onDuplicate: handleDuplicateBlock,
        onLink: startConnecting,
        onCollapse: handleCollapseBlock,
        onPin: handlePinBlock,
      };

      const newNode: Node = {
        id: newBlockData.id,
        type: "knowledgeBlock",
        position: { x: newBlockData.posX, y: newBlockData.posY },
        data: newBlockData,
      };

      setNodes((nds) => [...nds, newNode]);
      setEditingBlockId(newBlockData.id);
      setShowSlashPalette(false);

      // 블록 카운트 체크 (업적)
      const newCount = blockCount + 1;
      setBlockCount(newCount);

      if (newCount === 1) {
        setAchievement({
          id: "first_block",
          title: "첫 발걸음",
          description: "첫 번째 블록을 만들었습니다!",
          emoji: "🌱",
          unlocked: true,
        });
        celebrateMilestone();
      } else if (newCount === 10) {
        setAchievement({
          id: "ten_blocks",
          title: "지식 수집가",
          description: "10개의 블록을 만들었습니다!",
          emoji: "📚",
          unlocked: true,
        });
        play("achievement");
        celebrateMilestone();
      }
    },
    [nodes.length, topicClusterId, setNodes, handleDeleteBlock, handleDuplicateBlock, startConnecting, handleCollapseBlock, handlePinBlock, play, addEmoji, blockCount]
  );

  // 노드 클릭
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    play("click");
    setSelectedBlockId(node.id);
    setContextMenu({ show: false, x: 0, y: 0 });
  }, [play]);

  // 노드 더블클릭 -> 편집
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!readOnly) {
      setEditingBlockId(node.id);
    }
  }, [readOnly]);

  // 노드 우클릭 -> 컨텍스트 메뉴
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, []);

  // 노드 드래그
  const onNodeDragStart = useCallback(() => {
    startDrag();
    play("click");
  }, [startDrag, play]);

  const onNodeDrag = useCallback((_event: React.MouseEvent, node: Node) => {
    updateDrag(node.position.x, node.position.y);
  }, [updateDrag]);

  const onNodeDragStop = useCallback(() => {
    endDrag();
    play("drop");
  }, [endDrag, play]);

  // 캔버스 클릭 -> 선택 해제
  const onPaneClick = useCallback(() => {
    setSelectedBlockId(null);
    setContextMenu({ show: false, x: 0, y: 0 });
    setEditingBlockId(null);
    setShowThemePicker(false);
    setShowSoundSettings(false);
  }, []);

  // 캔버스 우클릭 -> 새 블록 메뉴
  const onPaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    const position = reactFlowInstance.screenToFlowPosition({
      x: (event as React.MouseEvent).clientX,
      y: (event as React.MouseEvent).clientY,
    });
    setSlashPosition(position);
    setShowSlashPalette(true);
  }, [reactFlowInstance]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 젠 모드 ESC로 나가기
      if (e.key === "Escape" && zenMode) {
        setZenMode(false);
        return;
      }

      // ? 키: 키보드 힌트
      if (e.key === "?" && !editingBlockId) {
        e.preventDefault();
        setShowKeyboardHints(true);
      }

      // Cmd+K: 빠른 검색
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        // TODO: 검색 모달 열기
      }

      // Cmd+N: 새 블록
      if (e.metaKey && e.key === "n") {
        e.preventDefault();
        const center = reactFlowInstance.getViewport();
        setSlashPosition({ x: -center.x + 400, y: -center.y + 300 });
        setShowSlashPalette(true);
      }

      // /: 슬래시 명령어
      if (e.key === "/" && !editingBlockId) {
        e.preventDefault();
        const center = reactFlowInstance.getViewport();
        setSlashPosition({ x: -center.x + 400, y: -center.y + 300 });
        setShowSlashPalette(true);
      }

      // Z: 젠 모드
      if (e.key === "z" && !editingBlockId && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setZenMode(true);
      }

      // Escape: 닫기
      if (e.key === "Escape") {
        setShowSlashPalette(false);
        setContextMenu({ show: false, x: 0, y: 0 });
        setEditingBlockId(null);
        setIsConnecting(false);
        setShowKeyboardHints(false);
        setShowThemePicker(false);
        setShowSoundSettings(false);
      }

      // Delete/Backspace: 선택된 블록 삭제
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId && !editingBlockId) {
        e.preventDefault();
        handleDeleteBlock(selectedBlockId);
      }

      // Cmd+D: 복제
      if (e.metaKey && e.key === "d" && selectedBlockId) {
        e.preventDefault();
        handleDuplicateBlock(selectedBlockId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reactFlowInstance, editingBlockId, selectedBlockId, handleDeleteBlock, handleDuplicateBlock, zenMode]);

  // 슬래시 명령 실행
  const handleSlashCommand = useCallback(
    (commandId: string) => {
      const command = SLASH_COMMANDS.find((c) => c.id === commandId);
      if (!command) return;

      if (command.action === "create" && command.blockType) {
        createBlock(command.blockType, slashPosition);
      }

      setShowSlashPalette(false);
    },
    [createBlock, slashPosition]
  );

  // 미니맵 색상
  const minimapNodeColor = useCallback((node: Node) => {
    const data = node.data as BlockNodeData | undefined;
    const config = BLOCK_CONFIG[data?.blockType as BlockType];
    return config?.color ?? "#6b7280";
  }, []);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative"
      style={{ background: themeConfig.colors.background }}
    >
      {/* 테마 파티클 배경 */}
      <ThemeParticles />

      {/* 드래그 트레일 */}
      <DragTrailSvg />

      {/* 플로팅 이모지 */}
      <FloatingEmojisContainer />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        connectionLineStyle={{
          stroke: themeConfig.colors.primary,
          strokeWidth: 2,
          strokeDasharray: "5,5",
        }}
        defaultEdgeOptions={{
          type: "blockEdge",
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        {/* 배경 그리드 */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={themeConfig.colors.text}
          style={{ opacity: 0.15 }}
        />

        {/* 컨트롤 */}
        {!zenMode && (
          <Controls
            showInteractive={false}
            className="bg-background border rounded-lg shadow-lg"
          />
        )}

        {/* 미니맵 */}
        {!zenMode && (
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="bg-background border rounded-lg shadow-lg"
            style={{ width: 150, height: 100 }}
          />
        )}

        {/* 상단 툴바 */}
        {!zenMode && (
          <Panel position="top-left" className="flex gap-2">
            <BlockToolbar
              onAddBlock={(type) => {
                const center = reactFlowInstance.getViewport();
                createBlock(type, { x: -center.x + 400, y: -center.y + 300 });
              }}
              onToggleGrid={() => {}}
              onZoomFit={() => reactFlowInstance.fitView()}
            />
          </Panel>
        )}

        {/* 우측 패널: 테마, 사운드, 도움말 */}
        {!zenMode && (
          <Panel position="top-right" className="flex gap-2">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-2 rounded-lg bg-background border shadow hover:bg-muted transition-colors"
              title="테마"
            >
              <Palette className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSoundSettings(!showSoundSettings)}
              className="p-2 rounded-lg bg-background border shadow hover:bg-muted transition-colors"
              title="사운드"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZenMode(true)}
              className="p-2 rounded-lg bg-background border shadow hover:bg-muted transition-colors"
              title="젠 모드 (Z)"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowKeyboardHints(true)}
              className="p-2 rounded-lg bg-background border shadow hover:bg-muted transition-colors"
              title="키보드 단축키 (?)"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </Panel>
        )}

        {/* 테마 피커 */}
        {showThemePicker && (
          <Panel position="top-right" className="mt-14">
            <ThemePicker onSelect={() => setShowThemePicker(false)} />
          </Panel>
        )}

        {/* 사운드 설정 */}
        {showSoundSettings && (
          <Panel position="top-right" className="mt-14">
            <SoundSettings />
          </Panel>
        )}

        {/* 연결 모드 표시 */}
        {isConnecting && (
          <Panel position="top-center">
            <div className="px-4 py-2 rounded-full bg-indigo-500 text-white text-sm font-medium shadow-lg animate-pulse">
              연결할 블록을 클릭하세요 (ESC로 취소)
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* 슬래시 명령어 팔레트 */}
      {showSlashPalette && (
        <SlashCommandPalette
          position={slashPosition}
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashPalette(false)}
        />
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu.show && contextMenu.nodeId && (
        <BlockContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onEdit={() => {
            setEditingBlockId(contextMenu.nodeId!);
            setContextMenu({ show: false, x: 0, y: 0 });
          }}
          onDuplicate={() => {
            handleDuplicateBlock(contextMenu.nodeId!);
            setContextMenu({ show: false, x: 0, y: 0 });
          }}
          onLink={() => {
            startConnecting(contextMenu.nodeId!);
            setContextMenu({ show: false, x: 0, y: 0 });
          }}
          onDelete={() => {
            handleDeleteBlock(contextMenu.nodeId!);
            setContextMenu({ show: false, x: 0, y: 0 });
          }}
          onClose={() => setContextMenu({ show: false, x: 0, y: 0 })}
        />
      )}

      {/* 젠 모드 오버레이 */}
      <AnimatePresence>
        {zenMode && <ZenModeOverlay onExit={() => setZenMode(false)} />}
      </AnimatePresence>

      {/* 키보드 힌트 */}
      <AnimatePresence>
        {showKeyboardHints && (
          <KeyboardHintsOverlay onClose={() => setShowKeyboardHints(false)} />
        )}
      </AnimatePresence>

      {/* 온보딩 */}
      <AnimatePresence>
        {showOnboarding && (
          <BlockOnboarding
            onComplete={() => {
              markAsVisited();
              setShowOnboarding(false);
              play("success");
            }}
            onSkip={() => {
              markAsVisited();
              setShowOnboarding(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* 업적 토스트 */}
      <AnimatePresence>
        {achievement && (
          <AchievementToast
            achievement={achievement}
            onClose={() => setAchievement(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Provider로 감싸서 export
export function BlockCanvasEnhanced(props: BlockCanvasEnhancedProps) {
  return (
    <ReactFlowProvider>
      <BlockThemeProvider>
        <SoundProvider>
          <BlockCanvasContent {...props} />
        </SoundProvider>
      </BlockThemeProvider>
    </ReactFlowProvider>
  );
}
