--!strict
local luau = require("@lute/luau")
local visitor = require("@std/syntax/visitor")
local getSortedChildren = require("../sortByPositionTable")

local function exhaustiveMatch(value: never): never
	error(`Unknown value in exhaustive match: {value}`)
end

local function printTrivia(trivia: luau.Trivia): string
	if trivia.tag == "whitespace" or trivia.tag == "comment" or trivia.tag == "blockcomment" then
		return trivia.text
	else
		return exhaustiveMatch(trivia.tag)
	end
end

local function printTriviaList(trivia: { luau.Trivia })
	-- print("DEBUG, passed trivia to printTriviaList with val:", trivia)
	local result = ""
	for _, trivia in trivia do
		-- print("checking trivia of val:", trivia)
		result ..= printTrivia(trivia) or ""
	end
	return result or ""
end

local function printToken(token: luau.Token): string
	-- print("Printing Token:")
	-- printTable(" ", token)
	return printTriviaList(token.leadingTrivia or {}) .. token.text .. printTriviaList(token.trailingTrivia or {})
end

local function printFallback(node: any): string
	--[[
		Function to serve as fallback when nodes are not printable with printstatement, printexpr, printtype, printlocal, printtoken
		Catches array nodes and other unique cases (nodes without tag that aren't tokens);
		if array node: iteratively call printASTNode (tries to printstatement, printexpr, printtype, printlocal, printtoken on a node) on children
		if non-array node: sort children by position, iteratively try to print children (same way as above)
	]]
	local nodeSrcStr = ""
	if node[1] then -- handle arrays
		for i = 1, #node do
			nodeSrcStr ..= printASTNode(node[i]) or ""
		end
	else
		local sortedChildren = getSortedChildren(node)
		for key, child in sortedChildren do
			-- print("printing child", key, child)
			nodeSrcStr ..= printASTNode(child) or ""
		end
	end
	if nodeSrcStr == "" then
		error("Node is empty")
	end
	return nodeSrcStr
end

local function printString(expr: luau.AstExprConstantString): string
	local result = printTriviaList(expr.leadingTrivia)

	if expr.quoteStyle == "single" then
		result ..= `'{expr.text}'`
	elseif expr.quoteStyle == "double" then
		result ..= `"{expr.text}"`
	elseif expr.quoteStyle == "block" then
		local equals = string.rep("=", expr.blockDepth)
		result ..= `[{equals}[{expr.text}]{equals}]`
	elseif expr.quoteStyle == "interp" then
		result ..= "`" .. expr.text .. "`"
	else
		return exhaustiveMatch(expr.quoteStyle)
	end

	result ..= printTriviaList(expr.trailingTrivia)
	return result
end

local function printInterpolatedString(expr: luau.AstExprInterpString): string
	local result = ""

	for i = 1, #expr.strings do
		result ..= printTriviaList(expr.strings[i].leadingTrivia)
		if i == 1 then
			result ..= "`"
		else
			result ..= "}"
		end
		result ..= expr.strings[i].text

		if i == #expr.strings then
			result ..= "`"
			result ..= printTriviaList(expr.strings[i].trailingTrivia)
		else
			result ..= "{"
			result ..= printTriviaList(expr.strings[i].trailingTrivia)
			result ..= printExpr(expr.expressions[i])
		end
	end

	return result
end

type PrintVisitor = visitor.Visitor & {
	result: buffer,
	cursor: number,
}

local function printVisitor()
	local printer = visitor.createVisitor() :: PrintVisitor

	printer.result = buffer.create(1024)
	printer.cursor = 0

	local function write(str: string)
		local totalSize = printer.cursor + #str
		local bufferSize = buffer.len(printer.result)

		if totalSize >= bufferSize then
			repeat
				bufferSize *= 2
			until bufferSize >= totalSize

			local newBuffer = buffer.create(bufferSize)
			buffer.copy(newBuffer, 0, printer.result)
			printer.result = newBuffer
		end

		buffer.writestring(printer.result, printer.cursor, str)
		printer.cursor = totalSize
	end

	printer.visitToken = function(node: luau.Token)
		if node.text then
			write(printToken(node))
		else -- if we get to this point, node has not been printable by any other functions, so we fallback to this exhaustive function
			-- print("attempting fallback print")
			write(printFallback(node))
		end
		return false
	end

	printer.visitString = function(node: luau.AstExprConstantString)
		write(printString(node))
		return false
	end

	printer.visitTypeString = function(node: luau.AstTypeSingletonString)
		write(printString(node))
		return false
	end

	printer.visitInterpolatedString = function(node: luau.AstExprInterpString)
		write(printInterpolatedString(node))
		return false
	end

	return printer
end

local function localVisitor(printer)
	local auxVisitor = visitor.createVisitor()
	auxVisitor.visitLocal = function(node: luau.AstLocal)
		if node.name then
			printer.visitToken(node.name)
		end
		if node.colon then
			printer.visitToken(node.colon)
		end
		if node.annotation then
			visitor.visitType(node.annotation, printer)
		end
		return false
	end
	return auxVisitor
end

--- Returns a string representation of an AstExpr
function printExpr(block: luau.AstExpr): string
	local printer = printVisitor()
	visitor.visitExpression(block, printer)
	return buffer.readstring(printer.result, 0, printer.cursor)
end

function printLocal(node: luau.AstLocal): string
	local printer = printVisitor()
	local localVisitor = localVisitor(printer)
	localVisitor.visitLocal(node)
	return buffer.readstring(printer.result, 0, printer.cursor)
end

function printtoken(token: luau.Token): string
	local printer = printVisitor()
	if token then
		printer.visitToken(token)
	end
	return buffer.readstring(printer.result, 0, printer.cursor)
end

--- Returns a string representation of an AstStat
function printStatement(statement: luau.AstStat): string
	local printer = printVisitor()
	visitor.visitStatement(statement, printer)
	return buffer.readstring(printer.result, 0, printer.cursor)
end

function printFile(result: { root: luau.AstStatBlock, eof: luau.Eof }): string
	local printer = printVisitor()
	visitor.visitBlock(result.root, printer)
	visitor.visitToken(result.eof, printer)
	return buffer.readstring(printer.result, 0, printer.cursor)
end

function printType(node: luau.AstType): string
	local printer = printVisitor()
	visitor.visitType(node, printer)
	return buffer.readstring(printer.result, 0, printer.cursor)
end

function printASTNode(astNode: any): string | nil
	local code, success
	success, code = pcall(function()
		return printStatement(astNode)
	end)
	if not success then
		success, code = pcall(function()
			return printExpr(astNode)
		end)
	end
	if not success then
		success, code = pcall(function()
			return printType(astNode)
		end)
	end
	if not success then
		if astNode.name and not (astNode.tag or astNode.type) then -- has to be AstLocal if this cond is true
			success, code = pcall(function()
				return printLocal(astNode)
			end)
		else
			success, code = pcall(function()
				return printtoken(astNode)
			end)
		end
	end
	if not success then
		error(`Failed to print {astNode} with error message: {code}`)
	end
	return code
end

return {
	printfallback = printFallback,
	printtoken = printtoken,
	printlocal = printLocal,
	printexpr = printExpr,
	printtype = printType,
	printstatement = printStatement,
	printfile = printFile,
	printASTNode = printASTNode,
}
