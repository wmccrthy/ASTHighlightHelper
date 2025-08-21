import CodeEditor from "./CodeEditor";
import FilterDropdown from "./filterDropdown";
import { parseDiff } from "../utils/parsingMessageHandlers";
import { ASTNode, VSCodeAPI } from "../types/typesAndInterfaces";
import TreeNodeContainer from "./TreeNode";

interface DiffAnalyzerProps {
  codeSnippet1: string;
  setCodeSnippet1: (codeSnippet1: string) => void;
  codeSnippet2: string;
  setCodeSnippet2: (codeSnippet2: string) => void;
  vscodeApi: VSCodeAPI;
  setParseDiffError: (parseDiffError: string | null) => void;
  isParsingDiff: boolean;
  parseDiffError: string | null;
  diffTree: ASTNode;
  hiddenNodes: string[];
  setHiddenNodes: (hiddenNodes: string[]) => void;
}

const DiffAnalyzer = ({
  codeSnippet1,
  setCodeSnippet1,
  codeSnippet2,
  setCodeSnippet2,
  vscodeApi,
  setParseDiffError,
  isParsingDiff,
  parseDiffError,
  diffTree,
  hiddenNodes,
  setHiddenNodes,
}: DiffAnalyzerProps) => {
  return (
    <div className="diff-analyzer-layout">
      <div className="diff-header">
        <h3>🔄 Codemod Transformation Analyzer</h3>
        <p>
          Compare two code snippets to see how the AST needs to be modified to
          transform the first into the second
        </p>
      </div>
      <div className="code-inputs-section">
        <div className="code-input">
          <h4>📝 Before (Code to Transform)</h4>
          <CodeEditor
            value={codeSnippet1}
            onChange={setCodeSnippet1}
            placeholder="Original code..."
            height="180px"
          />
        </div>
        <div className="code-input">
          <h4>✨ After (Target Result)</h4>
          <CodeEditor
            value={codeSnippet2}
            onChange={setCodeSnippet2}
            placeholder="Transformed code..."
            height="180px"
          />
        </div>
      </div>
      <div className="button-section">
        <button
          className="btn"
          onClick={() =>
            parseDiff(codeSnippet1, codeSnippet2, vscodeApi, setParseDiffError)
          }
          disabled={
            isParsingDiff || !codeSnippet1.trim() || !codeSnippet2.trim()
          }
        >
          {isParsingDiff ? "⏳ Analyzing..." : "🔍 Analyze Transformation"}
        </button>
        <FilterDropdown
          hiddenNodes={hiddenNodes}
          setHiddenNodes={setHiddenNodes}
        />
      </div>
      <div className="ast-view-section">
        <h4>🌳 AST Transformation Diff</h4>
        {parseDiffError ? (
          <div className="error-message">❌ Diff Error: {parseDiffError}</div>
        ) : isParsingDiff ? (
          <div className="loading-message">⏳ Analyzing transformation...</div>
        ) : diffTree ? (
          <div className="ast-content tree-view">
            <TreeNodeContainer
              nodeKey="root"
              path="root"
              value={diffTree}
              level={0}
              isDiffMode={true}
              hiddenNodes={hiddenNodes}
            />
          </div>
        ) : (
          <div className="placeholder">
            Enter code in both fields and click "Analyze Transformation" to see
            the AST diff
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffAnalyzer;
