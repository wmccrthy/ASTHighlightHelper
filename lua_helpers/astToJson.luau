-- we can write a separate script for getting the AST in JSON format for simplicity
local fs = require("@lute/fs")
local parser = require("@std/syntax/parser")
local json = require("./json")
local annotateWithType = require("./typeAnnotations").annotateWithType

-- Get the source file path from command line argument
local args = { ... }

if #args < 1 then
	error("Usage: lute run ast_to_json.luau <source_file_path>")
end

local sourceFilePath = args[2]

-- Read the source code from file
local sourceCode = fs.readfiletostring(sourceFilePath)

-- Parse the AST using our custom parser
local function parseBlock(src)
	local success, ast = pcall(function()
		return annotateWithType(parser.parse(sourceCode), "root")
	end)
	return success, ast
end
local function parseExpr(src)
	local success, exprAST = pcall(function()
		return annotateWithType(parser.parseexpr(sourceCode), "root")
	end)
	return success, exprAST
end
local function handleCommonErrs(src)
	local success, ast = parseBlock(src)
	if not success then
		success, ast = parseExpr(src)
	end
	return if success
		then ast
		else {
			type = "Error",
			timestamp = os.date("%Y-%m-%d %H:%M:%S"),
			error = "Parse Error",
			message = tostring(ast),
		}
end

result = handleCommonErrs(sourceCode)
print(json.encode(result))
