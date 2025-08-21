import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export class ASTParserAndPrinter {
  private luteExecutable: string;
  private extensionPath: string;

  constructor(context: vscode.ExtensionContext) {
    this.extensionPath = context.extensionPath;

    // Get the Lute executable path from configuration
    const config = vscode.workspace.getConfiguration("luauAstExplorer");
    const configuredPath = config.get("luteExecutable") as string;

    if (configuredPath) {
      this.luteExecutable = configuredPath;
    } else {
      // Auto-detect Lute executable
      this.luteExecutable = this.detectLuteExecutable();
    }

    console.log(`ASTParser: Using Lute executable at: ${this.luteExecutable}`);
    console.log(`ASTParser: Extension path: ${this.extensionPath}`);
  }

  private detectLuteExecutable(): string {
    const homeDir = os.homedir();
    const possiblePaths = [
      // Foreman installation paths
      path.join(homeDir, ".foreman", "bin", "lute"),
      path.join(homeDir, ".foreman", "bin", "lute.exe"), // Windows
      // System paths (fallback)
      "lute",
      "/usr/local/bin/lute",
      "/opt/homebrew/bin/lute",
    ];

    for (const lutePath of possiblePaths) {
      try {
        if (fs.existsSync(lutePath)) {
          console.log(`Found Lute executable at: ${lutePath}`);
          return lutePath;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    console.log("Using fallback path: lute");
    return "lute"; // Fallback to PATH
  }

  async parseCode(code: string, languageId: string): Promise<string> {
    // Check if the language is supported (Luau/Lua)
    if (!this.isLuauCode(languageId)) {
      return this.createUnsupportedLanguageAST(languageId);
    }

    try {
      // Run Lute to parse the AST
      const astResult = await this.runLuteParser(code);
      return astResult;
    } catch (error) {
      throw new Error(`Failed to parse AST: ${error}`);
    }
  }

  async printCode(nodeJson: string): Promise<string> {
    return this.runLutePrinter(nodeJson);
  }

  private async runLutePrinter(nodeJson: string): Promise<string> {
    try {
      // First, check if Lute is available
      await this.checkLuteAvailability();

      // Create a temporary file with the source code (to avoid command line escaping issues)
      const tempFilePath = await this.createTempFile(nodeJson, "json");

      try {
        // Use the permanent AST parser script from extension directory
        const astPrinterPath = path.join(
          this.extensionPath,
          "lua_helpers",
          "astJsonToCode.luau"
        );

        // Run the parser script with temp file path as argument
        const command = `${this.luteExecutable} run ${astPrinterPath} ${tempFilePath}`;
        console.log(`ASTPrinter: Running command: ${command}`);

        // Get the workspace root directory for foreman.toml
        const workspaceRoot =
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        console.log(`ASTPrinter: Using working directory: ${workspaceRoot}`);

        const { stdout, stderr } = await execAsync(command, {
          timeout: 10000, // 10 second timeout
          maxBuffer: 1024 * 1024, // 1MB buffer
          cwd: workspaceRoot, // Set working directory to workspace root
        });

        if (stderr && !stdout) {
          throw new Error(`Lute error: ${stderr}`);
        }

        return stdout || this.createErrorAST("No output from Lute");
      } finally {
        // Clean up the temporary source file
        await this.deleteTempFile(tempFilePath);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("command not found") ||
          error.message.includes("not recognized")
        ) {
          throw new Error(
            `Lute executable not found at: ${this.luteExecutable}. Please install Lute using foreman or ensure it's in your PATH.`
          );
        }
        throw new Error(`Lute execution failed: ${error.message}`);
      }
      throw error;
    }
  }

  private isLuauCode(languageId: string): boolean {
    const supportedLanguages = ["lua", "luau"];
    return supportedLanguages.includes(languageId.toLowerCase());
  }

  private async createTempFile(
    code: string,
    fileExt: string = "luau"
  ): Promise<string> {
    const tempDir = os.tmpdir();
    const tempFileName = `to_parse_${Date.now()}.${fileExt}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    await fs.promises.writeFile(tempFilePath, code, "utf8");
    return tempFilePath;
  }

  private async deleteTempFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // Ignore errors when deleting temp files
      console.warn(`Failed to delete temp file ${filePath}:`, error);
    }
  }

  private async runLuteParser(srcCode: string): Promise<string> {
    try {
      // First, check if Lute is available
      await this.checkLuteAvailability();

      // Create a temporary file with the source code (to avoid command line escaping issues)
      const tempFilePath = await this.createTempFile(srcCode);

      try {
        // Use the permanent AST parser script from extension directory

        // console.log("ASTParser: parsing selected code:", srcCode);
        
        const astParserPath = path.join(
          this.extensionPath,
          "lua_helpers",
          "astToJson.luau"
        );

        // Run the parser script with temp file path as argument
        const command = `${this.luteExecutable} run ${astParserPath} ${tempFilePath}`;
        console.log(`ASTParser: Running command: ${command}`);

        // Get the workspace root directory for foreman.toml
        const workspaceRoot =
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        console.log(`ASTParser: Using working directory: ${workspaceRoot}`);

        const { stdout, stderr } = await execAsync(command, {
          timeout: 10000, // 10 second timeout
          maxBuffer: 1024 * 1024, // 1MB buffer
          cwd: workspaceRoot, // Set working directory to workspace root
        });

        if (stderr && !stdout) {
          throw new Error(`Lute error: ${stderr}`);
        }

        return stdout || this.createErrorAST("No output from Lute");
      } finally {
        // Clean up the temporary source file
        await this.deleteTempFile(tempFilePath);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("command not found") ||
          error.message.includes("not recognized")
        ) {
          throw new Error(
            `Lute executable not found at: ${this.luteExecutable}. Please install Lute using foreman or ensure it's in your PATH.`
          );
        }
        throw new Error(`Lute execution failed: ${error.message}`);
      }
      throw error;
    }
  }

  private async checkLuteAvailability(): Promise<void> {
    try {
      console.log(
        `ASTParser: Checking Lute availability at: ${this.luteExecutable}`
      );

      // Get the workspace root directory for foreman.toml
      const workspaceRoot =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
      console.log(
        `ASTParser: Checking from working directory: ${workspaceRoot}`
      );

      await execAsync(`${this.luteExecutable} --help`, {
        timeout: 5000,
        cwd: workspaceRoot, // Set working directory to workspace root
      });
      console.log(`ASTParser: Lute is available`);
    } catch (error) {
      console.error(`ASTParser: Lute check failed:`, error);
      throw new Error(
        `Lute is not available at: ${this.luteExecutable}. Please install it using foreman or ensure it's in your PATH.`
      );
    }
  }

  private createUnsupportedLanguageAST(languageId: string): string {
    return JSON.stringify(
      {
        error: "Unsupported Language",
        message: `AST parsing is currently only supported for Luau/Lua files. Detected language: ${languageId}`,
        supportedLanguages: ["lua", "luau"],
        suggestion: "Please select Luau/Lua code to parse its AST.",
      },
      null,
      2
    );
  }

  private createErrorAST(errorMessage: string): string {
    return JSON.stringify(
      {
        error: "Parsing Error",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    );
  }
}
