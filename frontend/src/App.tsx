import React, { useState, useEffect } from "react";
import { isSearchable } from "./utils/helpers";
import "./App.css";
import {
  handleParseResult,
  handleParseDiffResult,
} from "./utils/parsingMessageHandlers";
import {
  ASTNode,
  ParseResultMessage,
  ParseDiffResultMessage,
  VSCodeAPI,
  WindowMode,
  DiffASTNode,
  PrintCodeResultMessage,
} from "./types/typesAndInterfaces";
import LiveEditor from "./components/LiveEditor";
import DiffAnalyzer from "./components/DiffAnalyzer";
import { useCodeTranslation } from "./hooks/useCodeTranslation";
import { CodeTranslationContext } from "./context/codeTranslationContext";

const App: React.FC = () => {
  // Get all available node keys and start with none hidden (all visible)
  const [hiddenNodes, setHiddenNodes] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [astMode, setAstMode] = useState<"json" | "text">("text");
  const [astTree, setAstTree] = useState<ASTNode | null>(null);

  // Multi-window state
  const [windowMode, setWindowMode] = useState<WindowMode>(
    WindowMode.LiveEditor
  );
  const [codeSnippet1, setCodeSnippet1] = useState<string>(""); // Live editor / Before code
  const [codeSnippet2, setCodeSnippet2] = useState<string>(""); // After code (diff analyzer only)

  // Live parsing state
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [vscodeApi, setVscodeApi] = useState<VSCodeAPI | null>(null);

  // Diff parsing state
  const [isParsingDiff, setIsParsingDiff] = useState<boolean>(false);
  const [parseDiffError, setParseDiffError] = useState<string | null>(null);
  const [diffTree, setDiffTree] = useState<DiffASTNode | null>(null);

  // Initialize with AST data from window
  useEffect(() => {
    const mode = window.astMode || "text";
    setAstMode(mode);

    if (window.astData) {
      const content = window.astData;

      if (mode === "json") {
        try {
          const parsedAST = JSON.parse(content);
          setAstTree(parsedAST);
        } catch (e) {
          // Fallback to text mode if JSON parsing fails
          setAstMode("text");
        }
      }

      setCodeSnippet1(window.selectedText || "");
    }
  }, []);

  // Add the code tooltip hook at the app level (single instance for entire app)
  const {
    handlePrintCodeResult,
    codeTooltips,
    requestCodeTooltip,
    generateNodeId,
  } = useCodeTranslation(vscodeApi);

  // Set up VSCode API and message listener
  useEffect(() => {
    if (window.acquireVsCodeApi) {
      const api = window.acquireVsCodeApi();
      setVscodeApi(api);

      const messageListener = (event: MessageEvent) => {
        const message = event.data;

        if (message.command === "parseResult") {
          handleParseResult(
            message as ParseResultMessage,
            setIsParsing,
            setParseError,
            setAstTree
          );
        } else if (message.command === "parseDiffResult") {
          handleParseDiffResult(
            message as ParseDiffResultMessage,
            setIsParsingDiff,
            setParseDiffError,
            setDiffTree
          );
        } else if (message.command === "printCodeResult") {
          // Handle code tooltip responses
          handlePrintCodeResult(message as PrintCodeResultMessage);
        }
      };

      window.addEventListener("message", messageListener);

      return () => window.removeEventListener("message", messageListener);
    }
  }, [handlePrintCodeResult]);

  // Search functionality
  const performSearch = (term: string) => {
    if (!term || !isSearchable(term)) {
      setTotalMatches(0);
      return;
    }

    // Text mode search with HTML marks and navigation
    const regex = new RegExp(term, "gi");
    let matchCount = 0;
    codeSnippet1.replace(regex, (match) => {
      matchCount++;
      return `<mark id="match-${matchCount}" class="search-match">${match}</mark>`;
    });

    setTotalMatches(matchCount);
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    performSearch(term);
  };

  // Render different window content based on mode
  const renderWindowContent = () => {
    switch (windowMode) {
      case WindowMode.LiveEditor:
        // Window 1: Live code editor + AST view
        return (
          <LiveEditor
            codeSnippet1={codeSnippet1}
            setCodeSnippet1={setCodeSnippet1}
            hiddenNodes={hiddenNodes}
            setHiddenNodes={setHiddenNodes}
            vscodeApi={vscodeApi!}
            setParseError={setParseError}
            isParsing={isParsing}
            parseError={parseError || ""}
            astTree={astTree!}
            searchTerm={searchTerm}
          />
        );

      case WindowMode.DiffAnalyzer:
        // Window 2: Codemod transformation diff
        return (
          <DiffAnalyzer
            codeSnippet1={codeSnippet1}
            setCodeSnippet1={setCodeSnippet1}
            codeSnippet2={codeSnippet2}
            setCodeSnippet2={setCodeSnippet2}
            vscodeApi={vscodeApi!}
            setParseDiffError={setParseDiffError}
            isParsingDiff={isParsingDiff}
            parseDiffError={parseDiffError || ""}
            diffTree={diffTree!}
            hiddenNodes={hiddenNodes}
            setHiddenNodes={setHiddenNodes}
          />
        );

      default:
        return <div>Unknown window mode</div>;
    }
  };

  return (
    <div className="ast-explorer">
      <div className="header">
        <div className="title">
          🌳 AST Explorer
          <span
            style={{
              fontSize: "12px",
              marginLeft: "8px",
              padding: "2px 6px",
              backgroundColor:
                astMode === "json"
                  ? "var(--vscode-statusBarItem-prominentBackground)"
                  : "var(--vscode-badge-background)",
              borderRadius: "3px",
            }}
          >
            {astMode.toUpperCase()}
          </span>
        </div>

        <div className="window-mode-toggle">
          <button
            className={`btn ${
              windowMode === WindowMode.LiveEditor ? "active" : ""
            }`}
            onClick={() => setWindowMode(WindowMode.LiveEditor)}
          >
            ✏️ Live Editor
          </button>
          <button
            className={`btn ${
              windowMode === WindowMode.DiffAnalyzer ? "active" : ""
            }`}
            onClick={() => setWindowMode(WindowMode.DiffAnalyzer)}
          >
            🔄 Codemod Diff
          </button>
        </div>
        {windowMode === WindowMode.LiveEditor && (
          <div className="controls">
            <input
              type="text"
              className="search-box"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <span className="search-info">
              {totalMatches > 0 ? `${totalMatches} matches` : ""}
            </span>
          </div>
        )}
      </div>

      <CodeTranslationContext.Provider
        value={{
          codeTooltips: codeTooltips,
          requestCodeTooltip: requestCodeTooltip,
          generateNodeId: generateNodeId,
        }}
      >
        {renderWindowContent()}
      </CodeTranslationContext.Provider>
    </div>
  );
};

export default App;
