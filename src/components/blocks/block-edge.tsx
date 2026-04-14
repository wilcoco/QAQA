"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
} from "@xyflow/react";
import { LINK_CONFIG, LinkType, LinkStyle } from "@/types/knowledge-block";

interface BlockEdgeData {
  linkType: LinkType;
  label?: string;
  style?: LinkStyle;
  color?: string;
}

function BlockEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as BlockEdgeData | undefined;
  const linkType = edgeData?.linkType ?? "reference";
  const config = LINK_CONFIG[linkType];
  const edgeColor = edgeData?.color ?? config.color;
  const edgeStyle = edgeData?.style ?? config.style;

  // 베지어 곡선 경로
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.3,
  });

  // 스타일에 따른 strokeDasharray
  const dashArray =
    edgeStyle === "dashed"
      ? "8,4"
      : edgeStyle === "dotted"
        ? "2,4"
        : undefined;

  return (
    <>
      {/* 히트 영역 (투명, 클릭 감지용) */}
      <BaseEdge
        id={`${id}-hit`}
        path={edgePath}
        style={{
          stroke: "transparent",
          strokeWidth: 20,
          cursor: "pointer",
        }}
      />

      {/* 메인 엣지 */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: dashArray,
          filter: selected ? "drop-shadow(0 0 4px rgba(99, 102, 241, 0.5))" : undefined,
          transition: "all 0.2s ease",
        }}
      />

      {/* 화살표 마커 */}
      <defs>
        <marker
          id={`arrow-${id}`}
          markerWidth="12"
          markerHeight="12"
          refX="10"
          refY="6"
          orient="auto"
        >
          <path
            d="M2,2 L10,6 L2,10"
            fill="none"
            stroke={edgeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>

      {/* 라벨 */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div
            className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              bg-background/95 backdrop-blur border shadow-sm
              transition-all duration-200
              ${selected ? "ring-2 ring-indigo-400 scale-110" : ""}
              hover:scale-105 hover:shadow-md cursor-pointer
            `}
            style={{
              borderColor: edgeColor,
              color: edgeColor,
            }}
          >
            <span className="mr-1">{config.emoji}</span>
            {edgeData?.label ?? config.label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const BlockEdge = memo(BlockEdgeComponent);
