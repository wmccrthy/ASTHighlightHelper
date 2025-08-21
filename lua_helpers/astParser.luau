-- AST Parser Script using our custom parser library
local fs = require("@lute/fs")
local parser = require("@std/syntax/parser")

-- Get the source file path from command line argument
local args = { ... }

if #args < 1 then
	error("Usage: lute run ast_parser.luau <source_file_path>")
end

local sourceFilePath = args[2]

-- Read the source code from file
local sourceCode = fs.readfiletostring(sourceFilePath)

-- Parse the AST using our custom parser
local success, ast = pcall(function()
	return parser.parse(sourceCode)
end)

local result
if success then
	result = ast
else
	result = {
		type = "Error",
		timestamp = os.date("%Y-%m-%d %H:%M:%S"),
		error = "Parse Error",
		message = tostring(ast),
	}
end

local function trimResult(obj)
	if obj.tag == "block" and #obj.statements == 1 then
		-- if the block has only one statement, return the statement, as user is probably highlighting a single line of text
		-- and returning the full block is not useful and unecessarily verbose. Single line inspections are probably one of the most common use cases.
		return obj.statements[1]
	else
		return obj
	end
end

-- Print AST in a clean, readable format
local function printAST(obj, indent)
	indent = indent or 0
	local indentStr = string.rep("  ", indent)

	if type(obj) == "table" then
		-- First, output tag field if it exists (priority field)
		if obj.tag ~= nil then
			print(indentStr .. "tag: " .. tostring(obj.tag))
		end

		-- Then output remaining fields
		for key, value in pairs(obj) do
			local keyStr = tostring(key)
			if keyStr ~= "tag" then -- Skip tag since we already printed it
				if type(value) == "table" then
					print(indentStr .. keyStr .. ":")
					printAST(value, indent + 1)
				else
					print(indentStr .. keyStr .. ": " .. tostring(value))
				end
			end
		end
	else
		print(indentStr .. tostring(obj))
	end
end

printAST(trimResult(result))

-- temporarily unused since we send a JSON string of the AST to the frontend instead (...)
