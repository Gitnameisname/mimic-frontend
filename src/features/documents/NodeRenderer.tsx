import type { DocumentNode } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  nodes: DocumentNode[];
  parentId?: string | null;
  depth?: number;
}

export function NodeRenderer({ nodes, parentId = null, depth = 0 }: Props) {
  const children = nodes
    .filter((n) => n.parent_id === parentId)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {children.map((node) => (
        <NodeBlock key={node.id} node={node} nodes={nodes} depth={depth} />
      ))}
    </>
  );
}

function NodeBlock({
  node,
  nodes,
  depth,
}: {
  node: DocumentNode;
  nodes: DocumentNode[];
  depth: number;
}) {
  const childNodes = nodes.filter((n) => n.parent_id === node.id);

  switch (node.node_type) {
    case "section":
      return (
        <section id={`section-${node.id}`} className="mb-6">
          {node.title && (
            <h2
              className={cn(
                "font-semibold text-gray-900 mb-2",
                depth === 0 ? "text-xl" : depth === 1 ? "text-lg" : "text-base"
              )}
            >
              {node.title}
            </h2>
          )}
          <NodeRenderer nodes={nodes} parentId={node.id} depth={depth + 1} />
        </section>
      );

    case "heading": {
      const level = Math.min(depth + 2, 6);
      const headingClass = "font-semibold text-gray-900 mt-4 mb-2";
      if (level === 2)
        return <h2 id={`section-${node.id}`} className={headingClass}>{node.content || node.title}</h2>;
      if (level === 3)
        return <h3 id={`section-${node.id}`} className={headingClass}>{node.content || node.title}</h3>;
      if (level === 4)
        return <h4 id={`section-${node.id}`} className={headingClass}>{node.content || node.title}</h4>;
      return <h5 id={`section-${node.id}`} className={headingClass}>{node.content || node.title}</h5>;
    }

    case "paragraph":
      return (
        <p id={`section-${node.id}`} className="text-gray-700 leading-relaxed mb-3">
          {node.content}
        </p>
      );

    case "list":
      return (
        <ul id={`section-${node.id}`} className="list-disc pl-5 mb-3 space-y-1">
          {childNodes
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <li key={item.id} className="text-gray-700 text-sm">
                {item.content}
              </li>
            ))}
        </ul>
      );

    case "code_block":
      return (
        <pre
          id={`section-${node.id}`}
          className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto mb-3"
        >
          <code>{node.content}</code>
        </pre>
      );

    default:
      return node.content ? (
        <p id={`section-${node.id}`} className="text-gray-700 mb-3">
          {node.content}
        </p>
      ) : null;
  }
}
