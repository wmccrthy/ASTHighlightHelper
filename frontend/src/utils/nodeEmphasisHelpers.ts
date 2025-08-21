import { ASTTypeDefinition } from "./astTypeDefinitions";
import { unpackArrayType } from "./astTypeHelpers";

export const autoCollapseTypes = [
  "Token",
  "Whitespace",
  "SingleLineComment",
  "MultiLineComment",
  "Location",
  "Position",
];

// auto-collapse if type is:
//   one of the autoCollapseTypes
//   an array of autoCollapseTypes
//   a union of autoCollapseTypes
//   an extension of autoCollapseTypes
export const shouldAutoCollapse = (
  type: string | string[],
  typeDefinition?: ASTTypeDefinition
): boolean => {
  if (type) {
    if (typeof type == "string") {
      if (autoCollapseTypes.includes(type)) return true;

      if (autoCollapseTypes.includes(unpackArrayType(type))) return true;
    } else {
      for (const t of type) {
        if (shouldAutoCollapse(t)) {
          return true;
        }
      }
      autoCollapseTypes.forEach((type) => {
        if (shouldAutoCollapse(type)) {
          return true;
        }
      });
    }
  }

  if (typeDefinition && typeDefinition.unionMembers) {
    for (const member of typeDefinition.unionMembers) {
      if (shouldAutoCollapse(member)) {
        return true;
      }
    }
  }

  if (
    typeDefinition &&
    typeDefinition.baseType &&
    autoCollapseTypes.includes(typeDefinition.baseType)
  ) {
    return true;
  }

  return false;
};
