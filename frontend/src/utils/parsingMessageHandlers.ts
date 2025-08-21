// Module for helper functions that handle messaging with luau "backend" that does all the parsing
import {
  ASTNode,
  ParseASTMessage,
  ParseResultMessage,
  VSCodeAPI,
  ParseDiffResultMessage,
  DiffASTNode,
} from "../types/typesAndInterfaces";
import { diff as jsonDiff } from "json-diff-ts";
import { annotateDiffTree } from "./diffUtils";

// Handle parse result messages from extension
export const handleParseResult = (
  message: ParseResultMessage,
  setIsParsing1: (isParsing: boolean) => void,
  setParseError1: (error: string | null) => void,
  setAstTree1: (astTree: ASTNode | null) => void
) => {
  switch (message.status) {
    case "loading":
      setIsParsing1(true);
      setParseError1(null);
      break;
    case "success":
      setIsParsing1(false);
      setParseError1(null);
      if (message.astResult) {
        try {
          // Try to parse as JSON for tree view
          const parsedAST = JSON.parse(message.astResult);
          setAstTree1(parsedAST);
        } catch (e) {
          // If not JSON, handle as text (though we expect JSON from our parser)
          console.warn("Received non-JSON AST result:", e);
          setAstTree1(null);
        }
      }
      break;
    case "error":
      setIsParsing1(false);
      setParseError1(message.error || "Unknown parsing error");
      setAstTree1(null);
      break;
  }
};

// Send parse request to extension
export const parseAST = (
  code: string,
  vscodeApi: VSCodeAPI | null,
  setParseError1: (error: string | null) => void
) => {
  if (!vscodeApi) {
    setParseError1("VSCode API not available");
    return;
  }

  if (!code.trim()) {
    setParseError1("Please enter some code to parse");
    return;
  }

  const message: ParseASTMessage = {
    command: "parseAST",
    code: code,
  };

  vscodeApi.postMessage(message);
};

// Handle diff result messages from extension
export const handleParseDiffResult = (
  message: ParseDiffResultMessage,
  setIsParsingDiff: (isParsing: boolean) => void,
  setParseDiffError: (error: string | null) => void,
  setDiffTree: (tree: DiffASTNode | null) => void
) => {
  switch (message.status) {
    case "loading":
      setIsParsingDiff(true);
      setParseDiffError(null);
      break;
    case "success":
      setIsParsingDiff(false);
      setParseDiffError(null);
      if (message.beforeAST && message.afterAST) {
        try {
          // Parse both AST JSON strings
          const beforeASTObj = JSON.parse(message.beforeAST) as ASTNode;
          const afterASTObj = JSON.parse(message.afterAST) as ASTNode;

          // Generate diff tree using our diffUtils
          console.log("Before AST:", beforeASTObj);
          console.log("After AST:", afterASTObj);

          // Simple test with json-diff-ts directly
          const rawChanges = jsonDiff(beforeASTObj, afterASTObj);
          console.log("Raw json-diff-ts changes:", rawChanges);

          const { diffTree: annotatedTree, changes } = annotateDiffTree(
            beforeASTObj,
            afterASTObj
          );
          console.log("Processed changes:", changes);
          console.log("Annotated tree:", annotatedTree);

          setDiffTree(annotatedTree);
        } catch (e) {
          console.error("Failed to process diff ASTs:", e);
          setParseDiffError("Failed to process AST comparison");
          setDiffTree(null);
        }
      }
      break;
    case "error":
      setIsParsingDiff(false);
      setParseDiffError(message.error || "Unknown diff parsing error");
      setDiffTree(null);
      break;
  }
};

// Send diff parse request to extension
export const parseDiff = (
  beforeCode: string,
  afterCode: string,
  vscodeApi: VSCodeAPI | null,
  setParseDiffError: (error: string | null) => void
) => {
  if (!vscodeApi) {
    setParseDiffError("VSCode API not available");
    return;
  }

  if (!beforeCode.trim() || !afterCode.trim()) {
    setParseDiffError("Please enter code in both fields");
    return;
  }

  const message = {
    command: "parseDiff",
    beforeCode: beforeCode,
    afterCode: afterCode,
  };

  vscodeApi.postMessage(message);
};
