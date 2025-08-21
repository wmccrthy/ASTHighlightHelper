local fs = require("@lute/fs")
local json = require("../lua_helpers/json")
local parser = require("@std/syntax/parser")
local process = require("@lute/process")
local helpers = require("./helpers/astJsonToCodeHelpers")
local e2eCases = helpers.testCases.e2eCases

function trim(s)
	return s:gsub("^%s*(.-)%s*$", "%1")
end

local function ast_json_to_code_test()
	local tmpFilePath = "tmpastJsonPath.lua"
	for _, code in pairs(e2eCases) do
		fs.writestringtofile(tmpFilePath, code)
		process.run({ "stylua", tmpFilePath })
		local formattedCode = trim(fs.readfiletostring(tmpFilePath))
		local ast = parser.parse(fs.readfiletostring(tmpFilePath))
		local astJson = json.encode(ast)
		fs.writestringtofile(tmpFilePath, astJson)
		local cmd = process.run({ "lute", `lua_helpers/astJsonToCode.luau`, tmpFilePath })
		local formattedResult = trim(cmd.stdout)
		process.run({ "rm", tmpFilePath })
		assert(
			formattedResult == formattedCode,
			"Incorrectly parsed:\n" .. formattedCode .. "\n as:\n" .. formattedResult
		)
	end
end

return function()
	ast_json_to_code_test()
end
