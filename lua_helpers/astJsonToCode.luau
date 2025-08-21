local fs = require("@lute/fs")
local printer = require("./temp_vendor/lutePrinter") -- temp vendoring printer until my updates to support printStatement are released
local json = require("./json")
local process = require("@lute/process")

-- Get the source file path from command line argument
local args = { ... }

if #args < 1 then
	error("Usage: lute run ast_json_to_code.luau <source_file_path>")
end

local sourceFilePath = args[2]

-- Read the source code from file
local sourceCode = fs.readfiletostring(sourceFilePath)

local astNode = json.decode(sourceCode)

local code, success = printer.printASTNode(astNode)

if success then
	-- stylua src code for readable output
	fs.writestringtofile(sourceFilePath, code)
	process.run({ "stylua", sourceFilePath })
	code = fs.readfiletostring(sourceFilePath)
end
print(code)
