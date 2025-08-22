import { diff } from "json-diff-ts";
import { ASTNode, DiffASTNode, JsonDiffChange } from "./typesAndInterfaces";

export function annotateDiffTree(
  beforeAST: ASTNode,
  afterAST: ASTNode
): { diffTree: DiffASTNode; changes: JsonDiffChange[] } {
  // Generate diff using json-diff-ts
  const changes = diff(beforeAST, afterAST);

  // Convert json-diff-ts format to our JsonDiffChange format (preserving nested structure)
  const formattedChanges: JsonDiffChange[] = changes.map((change) =>
    convertNestedChange(change)
  );

  // Create a deep copy of the afterAST as our base tree
  const diffTree = deepClone(afterAST) as DiffASTNode;

  // Build a flat map of paths to changes for easier lookup
  const changeMap = new Map<string, JsonDiffChange>();
  buildChangeMap(formattedChanges, "", changeMap);

  console.log("Change map paths:", Array.from(changeMap.keys()));
  console.log("Change map entries:", Array.from(changeMap.entries()));

  // Recursively annotate the tree
  annotateDiffTreeRecursive(diffTree, changeMap, beforeAST, "");

  return { diffTree, changes: formattedChanges };
}

/**
 * Converts a nested json-diff-ts change to our format
 */
function convertNestedChange(change: any): JsonDiffChange {
  const converted: JsonDiffChange = {
    type: change.type as "ADD" | "REMOVE" | "UPDATE",
    key: change.key,
    value: change.value,
    oldValue: change.oldValue,
    embeddedKey: change.embeddedKey,
  };

  if (change.changes && Array.isArray(change.changes)) {
    converted.changes = change.changes.map(convertNestedChange);
  }

  return converted;
}

/**
 * Builds a flat map of paths to changes from the nested structure
 */
function buildChangeMap(
  changes: JsonDiffChange[],
  parentPath: string,
  changeMap: Map<string, JsonDiffChange>
) {
  changes.forEach((change) => {
    const currentPath = parentPath ? `${parentPath}.${change.key}` : change.key;

    // If this change has nested changes, recurse deeper and don't add this intermediate node
    if (change.changes && change.changes.length > 0) {
      buildChangeMap(change.changes, currentPath, changeMap);
    } else {
      // Only add leaf changes (changes with actual oldValue/value) to the map
      if (change.oldValue !== undefined || change.value !== undefined) {
        changeMap.set(currentPath, change);
      }
    }
  });
}

/**
 * Get direct child changes given a nodePath and changeMap
 * Returns filtered changeMap only containing changes in children of node at nodePath
 */
function getDirectChildChanges(
  nodePath: string,
  changeMap: Map<string, JsonDiffChange>
): [string[], boolean] {
  let anyDescendantChanges = false;
  return [
    Array.from(changeMap.keys()).filter((path) => {
      const pathPrefix = nodePath ? `${nodePath}.` : "";
      if (!path.startsWith(pathPrefix)) return false;
      const remainingPath = path.substring(nodePath.length + 1);
      const isDirectChild = !remainingPath.includes("."); // No further dots = direct child
      anyDescendantChanges = anyDescendantChanges || !isDirectChild;
      return isDirectChild;
    }),
    anyDescendantChanges,
  ];
}

/**
 * Set childChanges property given a node and array of changed children keys
 * (WIP) injects removed nodes on the fly
 */
function setChildChanges(
  node: DiffASTNode,
  nodePath: string,
  directChildChanges: string[],
  changeMap: Map<string, JsonDiffChange>
): void {
  (node as any).childChanges = directChildChanges.reduce((acc, changePath) => {
    const change = changeMap.get(changePath);
    const childKey = changePath.substring(nodePath.length + 1);
    if (change?.type == "REMOVE") {
      console.log("Injecting removal:", change);
      // inject removed child to node
      node[childKey] = change.value;
    }

    // Only store if this is actually a direct child (no further nesting)
    if (!childKey.includes(".")) {
      // Store with full path to avoid false matches
      acc[childKey] = {
        ...change,
        fullPath: changePath,
      };
    }

    return acc;
  }, {} as any);
}

/**
 * Recursively walks the tree and annotates nodes based on detected changes
 */
function annotateDiffTreeRecursive(
  node: DiffASTNode,
  changeMap: Map<string, JsonDiffChange>,
  beforeNode: any,
  currentPath: string,
  hasAdd?: boolean // whenever we come across an add, all of the children should be annotated as ADD too (can just propogate down)
): void {
  if (hasAdd) {
    node.diffStatus = "nested-add";
  } // simple check and can bypass subsequent checks of directChange/childChanges
  else {
    // Check if this exact path has a direct change
    const directChange = changeMap.get(currentPath);

    // Find immediate child and descendant changes
    const [directChildChanges, anyDescendantChanges] = getDirectChildChanges(
      currentPath,
      changeMap
    );

    if (directChange) {
      // This node itself has changed - annotate it if possible
      if (typeof node === "object" && node !== null) {
        switch (directChange.type) {
          case "ADD":
            node.diffStatus = "added";
            node.beforeValue = undefined;
            node.afterValue = directChange.value;
            break;
          case "REMOVE":
            node.diffStatus = "removed";
            node.beforeValue = directChange.oldValue;
            node.afterValue = undefined;
            break;
          case "UPDATE":
            node.diffStatus = "updated";
            node.beforeValue = directChange.oldValue;
            node.afterValue = directChange.value;
            break;
        }
        node.diffKey = directChange.key;
      }
    }

    if (directChildChanges.length > 0) {
      // This is a parent with child changes
      // Highlight the direct parent of changed nodes
      node.diffStatus = "contains-changes";

      // Store change information for child rendering with full path context
      setChildChanges(node, currentPath, directChildChanges, changeMap);
    } else if (anyDescendantChanges) {
      node.diffStatus = "contains-nested-changes";
    } else if (!directChange) {
      node.diffStatus = "unchanged";
    }
  }

  // Recursively process children
  if (node && typeof node === "object") {
    Object.keys(node).forEach((key) => {
      if (
        key === "diffStatus" ||
        key === "beforeValue" ||
        key === "afterValue" ||
        key === "diffKey" ||
        key === "childChanges"
      ) {
        return; // Skip our added diff properties
      }

      const childPath = currentPath ? `${currentPath}.${key}` : key;
      const beforeChildNode = beforeNode?.[key];
      if (Array.isArray(node[key])) {
        const arrayPath = currentPath ? `${currentPath}.${key}` : `${key}`;

        const arrayDirectChange = changeMap.get(childPath);
        if (arrayDirectChange) {
          (node[key] as any).diffStatus =
            arrayDirectChange.type === "ADD"
              ? "added"
              : arrayDirectChange.type === "REMOVE"
              ? "removed"
              : "updated";
        } else {
          const [arrayDirectChildChanges, arrayDescendantChanges] =
            getDirectChildChanges(arrayPath, changeMap);

          if (arrayDirectChildChanges.length > 0) {
            // This is a parent with child changes
            // Highlight the direct parent of changed nodes
            (node[key] as any).diffStatus = "contains-changes";

            // Store change information for child rendering with full path context
            setChildChanges(
              node[key],
              arrayPath,
              arrayDirectChildChanges,
              changeMap
            );
          } else {
            // if node[key] is array, we don't call annotate on the array itself, so make sure we assign nested-add appropriately
            if (node.diffStatus === "added" || hasAdd) {
              (node[key] as any).diffStatus = "nested-add";
            } else {
              (node[key] as any).diffStatus = arrayDescendantChanges
                ? "contains-nested-changes"
                : "unchanged";
            }
          }
        }

        // Handle arrays - use dot notation to match json-diff-ts format
        node[key].forEach((item: any, index: number) => {
          if (item && typeof item === "object") {
            // console.log("Handling array item:", item, index);
            const arrayPath = `${childPath}.${index}`;
            annotateDiffTreeRecursive(
              item,
              changeMap,
              beforeChildNode?.[index],
              arrayPath,
              node[key].diffStatus === "added" ||
                node[key].diffStatus === "nested-add" ||
                hasAdd
            );
          }
        });
      } else if (node[key] && typeof node[key] === "object") {
        // Handle nested objects
        annotateDiffTreeRecursive(
          node[key],
          changeMap,
          beforeChildNode,
          childPath,
          node.diffStatus === "added" || hasAdd
        );
      }
    });
  }
}

/**
 * Deep clone utility function
 */
function deepClone(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item));
  }

  const cloned: any = {};
  Object.keys(obj).forEach((key) => {
    cloned[key] = deepClone(obj[key]);
  });

  return cloned;
}

/**
 * Generate a human-readable description of a change
 */
export function getChangeDescription(change: JsonDiffChange): string {
  switch (change.type) {
    case "ADD":
      return `Added: ${change.value}`;
    case "REMOVE":
      return `Removed: ${change.oldValue}`;
    case "UPDATE":
      return `Changed: ${change.oldValue} → ${change.value}`;
    default:
      return "Unknown change";
  }
}
