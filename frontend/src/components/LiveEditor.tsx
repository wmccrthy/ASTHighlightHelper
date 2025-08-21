import CodeEditor from "./CodeEditor";
import FilterDropdown from "./filterDropdown";
import { parseAST } from "../utils/parsingMessageHandlers";
import { VSCodeAPI, ASTNode } from "../types/typesAndInterfaces";
import TreeNodeContainer from "./TreeNode";

interface LiverEditorProps {
  codeSnippet1: string;
  setCodeSnippet1: (codeSnippet1: string) => void;
  hiddenNodes: string[];
  setHiddenNodes: (hiddenNodes: string[]) => void;
  vscodeApi: VSCodeAPI;
  setParseError: (parseError: string | null) => void;
  isParsing: boolean;
  parseError: string;
  astTree: ASTNode;
  searchTerm: string;
}

const LiveEditor = ({
  codeSnippet1,
  setCodeSnippet1,
  hiddenNodes,
  setHiddenNodes,
  vscodeApi,
  setParseError,
  isParsing,
  parseError,
  astTree,
  searchTerm,
}: LiverEditorProps) => {
  return (
    <div className="live-editor-layout">
      <div className="code-preview-section">
        <h3>📝 Code Preview</h3>
        <CodeEditor
          value={codeSnippet1}
          onChange={setCodeSnippet1}
          placeholder="Edit your Luau code here..."
          height="200px"
        />
      </div>
      <div className="button-section">
        <button
          className="btn"
          onClick={() => parseAST(codeSnippet1, vscodeApi, setParseError)}
          disabled={isParsing || !codeSnippet1.trim()}
        >
          {isParsing ? "⏳ Parsing..." : "🔄 Parse AST"}
        </button>
        <FilterDropdown
          hiddenNodes={hiddenNodes}
          setHiddenNodes={setHiddenNodes}
        />
      </div>
      <div className="ast-view-section">
        <h3>🌳 Live AST</h3>
        <div className="ast-view-content">
          {parseError ? (
            <div className="error-message">❌ Parse Error: {parseError}</div>
          ) : isParsing ? (
            <div className="loading-message">⏳ Parsing AST...</div>
          ) : astTree ? (
            <div className="ast-content tree-view">
              <TreeNodeContainer
                nodeKey="root"
                path="root"
                value={astTree}
                level={0}
                searchTerm={searchTerm}
                hiddenNodes={hiddenNodes}
              />
            </div>
          ) : (
            <div className="placeholder">
              Click "Parse AST" to see the AST structure
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveEditor;
