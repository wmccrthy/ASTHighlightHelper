import React from "react";
import { TypeAnnotation } from "./TypeAnnotation";
import { shouldAutoCollapse } from "../utils/nodeEmphasisHelpers";
import { JSX } from "react/jsx-runtime";
import {
  getTypeString,
  getType,
  unpackArrayType,
} from "../utils/astTypeHelpers";
import { CodeTooltip } from "./CodeTooltip";

import { ASTTypeDefinition } from "../utils/astTypeDefinitions";
import { useCodeTranslationContext } from "../context/codeTranslationContext";

interface TreeNodeProps {
  nodeKey: string;
  value: any;
  level: number;
  expanded: boolean;
  onToggle: () => void;
  path: string;
  type: string;
  typeDefinition: ASTTypeDefinition | undefined;
  kind: string;
  arrayType: boolean;
  searchTerm?: string;
  isDiffMode?: boolean;
  diffStatus?:
    | "added"
    | "nested-add"
    | "removed"
    | "updated"
    | "unchanged"
    | "contains-changes"
    | "contains-nested-changes";
  beforeValue?: any;
  afterValue?: any;
  hiddenNodes?: string[];
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  nodeKey,
  value,
  level,
  expanded,
  path,
  onToggle,
  type,
  typeDefinition,
  kind,
  arrayType,
  searchTerm = "",
  isDiffMode = false,
  diffStatus = "unchanged",
  beforeValue,
  afterValue,
  hiddenNodes = [],
}) => {
  // Always reserve space for diff indicator to maintain consistent indentation
  const baseIndent = "  ".repeat(level);
  const indent = baseIndent;
  const { codeTooltips, requestCodeTooltip, generateNodeId } =
    useCodeTranslationContext();

  const nodeId = React.useMemo(() => {
    return generateNodeId ? generateNodeId(value, nodeKey) : "";
  }, [value, nodeKey, generateNodeId]);

  const renderTypeAnnotations = React.useCallback(() => {
    if (type) {
      return (
        <TypeAnnotation
          typeName={type}
          typeDefinition={typeDefinition}
          isArrayType={arrayType}
          kind={kind}
        ></TypeAnnotation>
      );
    }
    return null;
  }, [type, arrayType, typeDefinition, kind]);

  // Get diff-specific styling
  const getDiffClassName = React.useCallback(() => {
    if (!isDiffMode) return "";

    switch (diffStatus) {
      case "added":
        return "diff-added";
      case "removed":
        return "diff-removed";
      case "updated":
        return "diff-updated";
      case "contains-changes":
      case "contains-nested-changes":
        return expanded ? "" : "diff-contains-changes";
      default:
        return "";
    }
  }, [isDiffMode, diffStatus, expanded]);

  const getChildDiffProps = React.useCallback(
    (value: any, key: string | number, child: any) => {
      const nodeChildChanges = (value as any)?.childChanges || {};
      const childChange =
        nodeChildChanges[typeof key == "number" ? key.toString() : key];

      const childDiffProps =
        child && typeof child === "object" && "diffStatus" in child
          ? {
              isDiffMode,
              diffStatus: child.diffStatus,
              beforeValue: child.beforeValue,
              afterValue: child.afterValue,
            }
          : childChange // handles cases where child is primitive value
          ? {
              isDiffMode,
              diffStatus:
                childChange.type === "ADD"
                  ? ("added" as const)
                  : childChange.type === "REMOVE"
                  ? ("removed" as const)
                  : ("updated" as const),
              beforeValue: childChange.oldValue,
              afterValue: childChange.value,
            }
          : {
              isDiffMode,
              diffStatus: "unchanged" as const,
            };

      return childDiffProps;
    },
    [isDiffMode]
  );

  const diffClassName = getDiffClassName();

  // Simple highlight with pronounced styling
  const highlightText = React.useCallback(
    (text: string) => {
      if (!searchTerm) return text;
      const regex = new RegExp(searchTerm, "gi");
      const parts = text.split(regex);
      const matches = text.match(regex) || [];

      return parts.reduce((acc, part, i) => {
        acc.push(part);
        if (matches[i]) {
          acc.push(
            <mark key={i} className="search-match tree-highlight">
              {matches[i]}
            </mark>
          );
        }
        return acc;
      }, [] as React.ReactNode[]);
    },
    [searchTerm]
  );

  // Render diff indicator for changed values - always render to maintain consistent indentation
  const renderDiffIndicator = React.useCallback(() => {
    if (!isDiffMode) return <span className="diff-indicator"></span>;

    switch (diffStatus) {
      case "added":
        return <span className="diff-indicator diff-added-indicator">+</span>;
      case "removed":
        return <span className="diff-indicator diff-removed-indicator">-</span>;
      case "updated":
        return <span className="diff-indicator diff-updated-indicator">~</span>;
      case "contains-changes":
      case "contains-nested-changes":
        return expanded ? (
          ""
        ) : (
          <span className="diff-indicator diff-updated-indicator">○</span>
        );
      default:
        return <span className="diff-indicator"></span>;
    }
  }, [isDiffMode, diffStatus, expanded]);

  // Render value with diff information
  const renderValueWithDiff = React.useCallback(
    (displayValue: string) => {
      if (!isDiffMode) {
        return highlightText(`${nodeKey}: ${displayValue}`);
      }
      // Fall back to node's own diff status
      if (diffStatus === "unchanged") {
        return highlightText(`${nodeKey}: ${displayValue}`);
      }

      switch (diffStatus) {
        case "added":
          return highlightText(`${nodeKey}: ${displayValue}`);
        case "removed":
          const beforeDisplayValue =
            typeof beforeValue === "string"
              ? `"${beforeValue}"`
              : String(beforeValue);
          return highlightText(`${nodeKey}: ${beforeDisplayValue}`);
        case "updated":
          const beforeDisplay =
            typeof beforeValue === "string"
              ? `"${beforeValue}"`
              : String(beforeValue);
          const afterDisplay =
            typeof afterValue === "string"
              ? `"${afterValue}"`
              : String(afterValue);
          return (
            <>
              {highlightText(`${nodeKey}: `)}
              <span className="diff-before">{beforeDisplay}</span>
              <span className="diff-arrow"> → </span>
              <span className="diff-after">{afterDisplay}</span>
            </>
          );
        default:
          return highlightText(`${nodeKey}: ${displayValue}`);
      }
    },
    [isDiffMode, diffStatus, beforeValue, afterValue, nodeKey, highlightText]
  );

  const arrow = expanded ? "▼" : "▶";

  const getRenderedContent = React.useCallback(
    (
      renderArrow: boolean,
      renderValue: string | JSX.Element | React.ReactNode[],
      renderTypeAnnotation: boolean,
      isArray?: boolean
    ) => {
      return (
        <React.Fragment>
          {indent}
          {renderArrow ? (
            <span
              className="tree-arrow"
              style={{
                color: isArray
                  ? "var(--vscode-symbolIcon-arrayForeground)"
                  : "var(--vscode-symbolIcon-objectForeground)",
              }}
            >
              {arrow}
            </span>
          ) : null}
          {renderDiffIndicator()}
          {renderValue}
          {renderTypeAnnotation ? renderTypeAnnotations() : null}
        </React.Fragment>
      );
    },
    [arrow, indent, renderDiffIndicator, renderTypeAnnotations]
  );

  // Handle hover to request code tooltip
  const handleMouseEnter = React.useCallback(() => {
    if (value && (typeof value === "object" || Array.isArray(value))) {
      // Only request if we don't have cached content
      if (!codeTooltips[nodeId]) {
        requestCodeTooltip(value, nodeKey);
      }
    }
  }, [value, nodeKey, requestCodeTooltip, codeTooltips, nodeId]);

  // Render primitive values
  if (value === null || value === undefined) {
    return (
      <div className={diffClassName} onMouseEnter={handleMouseEnter}>
        {getRenderedContent(false, renderValueWithDiff("null"), false)}
      </div>
    );
  }

  if (typeof value !== "object") {
    if (nodeKey === "_astType") return null;
    const displayValue =
      typeof value === "string" ? `"${value}"` : String(value);
    return (
      <div className={diffClassName} onMouseEnter={handleMouseEnter}>
        {/* include empty span to ensure indentation aligns with expandable nodes */}
        <span className="tree-arrow"></span>
        {getRenderedContent(false, renderValueWithDiff(displayValue), false)}
      </div>
    );
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className={diffClassName}>
          {/* include empty span to ensure indentation aligns with expandable nodes */}
          <span className="tree-arrow"></span>
          {getRenderedContent(false, renderValueWithDiff("[]"), false)}
        </div>
      );
    }

    // check if node is an array of a Punctuated type (TO-DO: add more robust check than this)
    const punctuatedType = typeDefinition?.properties?.find(
      (item) => item.name === ""
    );

    return (
      <div className={diffClassName}>
        <div
          style={{ cursor: "pointer" }}
          onClick={onToggle}
          onMouseEnter={handleMouseEnter}
        >
          {getRenderedContent(
            true,
            <CodeTooltip
              isCode={codeTooltips[nodeId] !== undefined}
              text={codeTooltips[nodeId] || path}
            >
              <span>{highlightText(nodeKey)}</span>
            </CodeTooltip>,
            true,
            true
          )}
        </div>
        {expanded &&
          value.map((item, index) => {
            // Pass through diff props for child nodes if they have diff annotations
            const childDiffProps = getChildDiffProps(value, index, item);

            return (
              <TreeNodeContainer
                key={index}
                nodeKey={`[${index}]`}
                value={item}
                level={level + 1}
                parentInferredType={
                  punctuatedType
                    ? unpackArrayType(punctuatedType.type as string)
                    : undefined
                }
                searchTerm={searchTerm}
                path={`${path}.${index}`}
                hiddenNodes={hiddenNodes}
                {...childDiffProps}
              />
            );
          })}
      </div>
    );
  }

  // Handle objects (normal case)
  const keys = Object.keys(value).filter(
    (key) =>
      ![
        "diffStatus",
        "beforeValue",
        "afterValue",
        "diffKey",
        "childChanges",
      ].includes(key)
  );

  if (keys.length === 0) {
    return (
      <div className={diffClassName}>
        {/* include empty span to ensure indentation aligns with expandable nodes */}
        <span className="tree-arrow"></span>
        {indent}
        {renderDiffIndicator()}
        {renderValueWithDiff("{}")}
      </div>
    );
  }

  return (
    <div className={diffClassName}>
      <div
        style={{ cursor: "pointer" }}
        onClick={onToggle}
        onMouseEnter={handleMouseEnter}
      >
        {getRenderedContent(
          true,
          <CodeTooltip
            isCode={codeTooltips[nodeId] !== undefined}
            text={codeTooltips[nodeId] || path}
          >
            <span>{highlightText(nodeKey)}</span>
          </CodeTooltip>,
          true
        )}
      </div>
      {expanded &&
        keys.map((key) => {
          // Pass through diff props for child nodes if they have diff annotations
          const childValue = value[key];
          const childDiffProps = getChildDiffProps(value, key, childValue);
          const childPropertyDefinition = typeDefinition?.properties?.find(
            (prop) => prop.name === key
          );
          const parentInferredType = childPropertyDefinition?.generic
            ? childPropertyDefinition.generic
            : childPropertyDefinition?.type;

          return (
            <TreeNodeContainer
              key={key}
              nodeKey={key}
              value={childValue}
              level={level + 1}
              parentInferredType={parentInferredType}
              searchTerm={searchTerm}
              hiddenNodes={hiddenNodes}
              path={`${path}.${key}`}
              {...childDiffProps}
            />
          );
        })}
    </div>
  );
};

// Container component that manages expand/collapse state for each node
interface TreeNodeContainerProps {
  nodeKey: string;
  value: any;
  level: number;
  path: string;
  searchTerm?: string;
  parentInferredType?: string | string[];
  isDiffMode?: boolean;
  diffStatus?:
    | "added"
    | "nested-add"
    | "removed"
    | "updated"
    | "unchanged"
    | "contains-changes"
    | "contains-nested-changes";
  beforeValue?: any;
  afterValue?: any;
  hiddenNodes?: string[];
}

const TreeNodeContainer: React.FC<TreeNodeContainerProps> = (props) => {
  // get all this metadata at tree node level; pass to TypeTooltip
  const [type, kind] = React.useMemo(() => {
    return getTypeString(props.value, props.nodeKey, props.parentInferredType);
  }, [props.value, props.nodeKey, props.parentInferredType]);

  const [typeDefinition, arrayType] = React.useMemo(() => {
    if (type) {
      return getType(type);
    }
    return [undefined, false];
  }, [type]);

  const autoCollapse = props.isDiffMode
    ? props.diffStatus === "unchanged" ||
      shouldAutoCollapse(type, typeDefinition)
    : shouldAutoCollapse(type, typeDefinition);

  const [expanded, setExpanded] = React.useState(!autoCollapse);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  // Hide nodes that are in the hidden nodes list (when filtering is active)
  if (props.hiddenNodes && props.hiddenNodes.includes(props.nodeKey)) {
    return null;
  }

  return (
    <TreeNode
      {...props}
      expanded={expanded}
      onToggle={handleToggle}
      type={type}
      typeDefinition={typeDefinition}
      kind={kind}
      arrayType={arrayType}
    />
  );
};

export default TreeNodeContainer;
