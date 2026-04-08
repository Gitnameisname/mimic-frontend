"use client";

import { cn } from "@/lib/utils";
import type { DocumentNode } from "@/types";
import { useState } from "react";

interface Props {
  nodes: DocumentNode[];
}

export function DocumentTree({ nodes }: Props) {
  const roots = nodes
    .filter((n) => !n.parent_id)
    .sort((a, b) => a.order - b.order);

  if (roots.length === 0) {
    return <p className="px-3 text-xs text-gray-400">구조 없음</p>;
  }

  return (
    <ul className="space-y-0.5">
      {roots.map((node) => (
        <TreeNode key={node.id} node={node} all={nodes} depth={0} />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  all,
  depth,
}: {
  node: DocumentNode;
  all: DocumentNode[];
  depth: number;
}) {
  const children = all
    .filter((n) => n.parent_id === node.id)
    .sort((a, b) => a.order - b.order);
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(depth === 0);

  const label = node.title || node.node_type;

  return (
    <li>
      <button
        onClick={() => {
          if (hasChildren) setOpen((v) => !v);
          const el = document.getElementById(`section-${node.id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        className={cn(
          "w-full flex items-center gap-1.5 px-3 py-1 text-left text-xs rounded-md transition-colors hover:bg-gray-100 text-gray-600",
          depth > 0 && "pl-" + (3 + depth * 3)
        )}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {hasChildren && (
          <span className="text-gray-400">{open ? "▾" : "▸"}</span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span className="truncate">{label}</span>
      </button>
      {hasChildren && open && (
        <ul>
          {children.map((child) => (
            <TreeNode key={child.id} node={child} all={all} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
