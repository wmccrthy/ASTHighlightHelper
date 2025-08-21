import { shouldAutoCollapse, autoCollapseTypes } from "../utils/nodeEmphasisHelpers";
import { astTypeDefinitions } from "../utils/astTypeDefinitions";

describe("shouldAutoCollapse", () => {
  test("should return true for standard auto-collapse types", () => {
    autoCollapseTypes.forEach((type) => {
      expect(shouldAutoCollapse(type)).toBe(true);
    });
  });

  test("should return true for tables of auto-collapse types", () => {
    const tableTypes = autoCollapseTypes.map((type) => {
      return `{ ${type} }`;
    });

    tableTypes.forEach((type) => {
      expect(shouldAutoCollapse(type)).toBe(true);
    });
  });

  test("should return true for unions of auto-collapsable types", () => {
    const triviaTypeDefinition = astTypeDefinitions["Trivia"]; // example of type that is union of types that should auto-collapse
    const falseUnionType = astTypeDefinitions["AstExpr"]
    expect(shouldAutoCollapse("", triviaTypeDefinition)).toBe(true);
    expect(shouldAutoCollapse("", falseUnionType)).toBe(false);
  });

  test("should return true for extensions of auto-collapsable types", () => {
    const extendedTypes = Object.entries(astTypeDefinitions)
      .filter(([_, def]) => def.baseType)
      .map(([type]) => type);

    extendedTypes.forEach((type) => {
      const typeDef = astTypeDefinitions[type];
      if (autoCollapseTypes.includes(typeDef.baseType as string)) {
        expect(shouldAutoCollapse(type, typeDef)).toBe(true);
      } else {
        expect(shouldAutoCollapse(type, typeDef)).toBe(false);
      }
    });
  });
});
