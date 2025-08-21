// Global window interface for VSCode webview API and AST data
declare global {
  interface Window {
    acquireVsCodeApi?: () => any;
    astData?: string;
    astMode?: "json" | "text";
    selectedText?: string;
  }
}

export interface VSCodeAPI {
  postMessage(message: any): void;
  setState?(state: any): void;
  getState?(): any;
}

export interface ParseASTMessage {
  command: "parseAST";
  code: string;
}

export interface ParseResultMessage {
  command: "parseResult";
  status: "loading" | "success" | "error";
  astResult?: string;
  error?: string;
}

export interface ParseDiffMessage {
  command: "parseDiff";
  beforeCode: string;
  afterCode: string;
}

export interface ParseDiffResultMessage {
  command: "parseDiffResult";
  status: "loading" | "success" | "error";
  beforeAST?: string;
  afterAST?: string;
  changes?: JsonDiffChange[];
  error?: string;
}

export interface ASTNode {
  tag?: string;
  location?: {
    begin: { line: number; column: number };
    end: { line: number; column: number };
  };
  [key: string]: any;
}

export interface DiffASTNode extends ASTNode {
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
  diffKey?: string;
}

export interface JsonDiffChange {
  type: "ADD" | "REMOVE" | "UPDATE";
  key: string;
  value?: any;
  oldValue?: any;
  embeddedKey?: string | any;
  changes?: JsonDiffChange[]; // For nested changes
}

export interface PrintCodeMessage {
  command: "printCode";
  nodeJson: string;
  nodeId: string;
}

export interface PrintCodeResultMessage {
  command: "printCodeResult";
  status: "loading" | "success" | "error";
  nodeId: string;
  code?: string;
  error?: string;
}

export enum WindowMode {
  Explorer = "explorer", // Current AST viewer (default)
  LiveEditor = "live-editor", // Window 1: Live code editor + AST
  DiffAnalyzer = "diff-analyzer", // Window 2: Code transformation diff
}
