--[[
	Module that serves as reference for Luau AST types so we can annotate the AST with type information
	This is all based directly on Luau AST type definitions
	Might be more robust to scrape the Luau type definitions file directly to get the type definitions... (can be a future feature)
]]

local typeDefinitions = {
	-- Tag-based mappings (existing)
	tags = {
		-- missing keys are resolved manually in resolveAmbiguousTypes
		["nil"] = "AstExprConstantNil",
		["boolean"] = "AstExprConstantBool",
		["number"] = "AstExprConstantNumber",
		["global"] = "AstExprGlobal",
		["vararg"] = "AstExprVarargs",
		["call"] = "AstExprCall",
		["indexname"] = "AstExprIndexName",
		["index"] = "AstExprIndexExpr",
		["unary"] = "AstExprUnary",
		["binary"] = "AstExprBinary",
		["interpolatedstring"] = "AstExprInterpString",
		["cast"] = "AstExprTypeAssertion",

		-- Statements
		["block"] = "AstStatBlock",
		["while"] = "AstStatWhile",
		["repeat"] = "AstStatRepeat",
		["break"] = "AstStatBreak",
		["continue"] = "AstStatContinue",
		["return"] = "AstStatReturn",
		["expression"] = "AstStatExpr",
		["assign"] = "AstStatAssign",
		["for"] = "AstStatFor",
		["forin"] = "AstStatForIn",
		["compoundassign"] = "AstStatCompoundAssign",
		["localfunction"] = "AstStatLocalFunction",

		-- Types
		["reference"] = "AstTypeReference",
		["typeof"] = "AstTypeTypeof",
		["union"] = "AstTypeUnion",
		["intersection"] = "AstTypeIntersection",
		["optional"] = "AstTypeOptional",
		["typealias"] = "AstStatTypeAlias",
		["typefunction"] = "AstStatTypeFunction",
		["genericpack"] = "AstGenericTypePack",
		["explicit"] = "AstTypePackExplicit",

		-- Special cases
		["whitespace"] = "Whitespace",
		["comment"] = "SingleLineComment",
		["blockcomment"] = "MultiLineComment",
	},

	-- Key-based mappings (new fallback)
	-- missing keys are resolved manually in resolveAmbiguousKeys
	keys = {
		-- Location and position
		["location"] = "Location",
		["position"] = "Position",
		["argLocation"] = "Location",
		["indexLocation"] = "Location",

		-- Common token properties (fallback to Token)
		["functionKeyword"] = "Token",
		["localKeyword"] = "Token",
		["ifKeyword"] = "Token",
		["thenKeyword"] = "Token",
		["elseKeyword"] = "Token",
		["elseifKeyword"] = "Token",
		["endKeyword"] = "Token",
		["whileKeyword"] = "Token",
		["doKeyword"] = "Token",
		["forKeyword"] = "Token",
		["inKeyword"] = "Token",
		["repeatKeyword"] = "Token",
		["untilKeyword"] = "Token",
		["returnKeyword"] = "Token",
		["breakKeyword"] = "Token",
		["continueKeyword"] = "Token",
		["export"] = "Token",
		["typeToken"] = "Token",
		["typeof"] = "Token",

		-- Punctuation tokens
		["openParens"] = "Token",
		["closeParens"] = "Token",
		["openBrace"] = "Token",
		["closeBrace"] = "Token",
		["openBrackets"] = "Token",
		["closeBrackets"] = "Token",
		["openGenerics"] = "Token",
		["closeGenerics"] = "Token",
		["indexerOpen"] = "Token",
		["indexerClose"] = "Token",
		["returnArrow"] = "Token",

		-- Operators and symbols
		["equals"] = "Token",
		["colon"] = "Token",
		["semicolon"] = "Token",
		["comma"] = "Token",
		["accessor"] = "Token",
		["operator"] = "Token",
		["ellipsis"] = "Token",
		["varargColon"] = "Token",
		["returnSpecifier"] = "Token",
		["toComma"] = "Token",
		["stepComma"] = "Token",

		-- Special names/identifiers
		["token"] = "Token",

		-- Expression/Statement specific
		["expression"] = "AstExpr",
		-- ["expressions"] = "{ AstExpr }",
		["func"] = "AstExpr",
		["condition"] = "AstExpr",
		["from"] = "AstExpr",
		["to"] = "AstExpr",
		["step"] = "AstExpr",
		["lhsoperand"] = "AstExpr",
		["rhsoperand"] = "AstExpr",
		-- ["strings"] = "{ Token }",

		-- Statement collections
		-- ["statements"] = "{ AstStat }",
		-- ["entries"] = "{ AstExprTableItem }",  -- Note: ambiguous with AstTypeTable

		-- Variables and locals
		["local"] = "AstLocal",
		["shadows"] = "AstLocal",
		-- ["self"] = "AstLocal",  -- Note: ambiguous with boolean in AstExprCall

		-- Type system
		["annotation"] = "AstType",
		["varargAnnotation"] = "AstTypePack",
		["returnAnnotation"] = "AstTypePack",
		["returnTypes"] = "AstTypePack",
		["vararg"] = "AstTypePack",
		["tailType"] = "AstTypePack",

		-- Special properties
		["text"] = "string",
		["upvalue"] = "boolean",
		["quoteStyle"] = "string",
		["blockDepth"] = "number",
		["line"] = "number",
		["column"] = "number",
		-- ["attributes"] = "{ AstAttribute }",
		["access"] = "Token",
		["separator"] = "Token",
		["leading"] = "Token",
		-- ["pairs"] = "{ Pair }",
		-- ["value"] = "boolean",  -- Note: highly ambiguous, needs manual resolution

		-- Trivia
		-- ["leadingTrivia"] = "{ Trivia }",
		-- ["trailingTrivia"] = "{ Trivia }",

		-- Specific type references
		["prefix"] = "Token",
		["prefixPoint"] = "Token",
		["openParameters"] = "Token",
		["closeParameters"] = "Token",
		["begin"] = "Position",
		["end"] = "Position",

		-- ParseResult specific
		["root"] = "AstStatBlock",
		["eof"] = "Eof",
		["lines"] = "number",
		-- ["lineOffsets"] = "{ number }",
	},

	kinds = {
		["property"] = "AstTypeTableItem",
		["indexr"] = "AstTypeTableItem",
		["stringproperty"] = "AstTypeTableItem",
		["record"] = "AstExprTableItem",
		["general"] = "AstExprTableItem",
		["list"] = "AstExprTableItem",
	},
}

-- Context-aware type resolution for ambiguous tags
local function resolveAmbiguousTags(node)
	local tag = node.tag
	if not tag then
		return nil
	end

	-- Handle ambiguous cases based on distinguishing properties
	if tag == "conditional" then
		-- AstStatIf has endKeyword, AstExprIfElse doesn't
		if node.endKeyword then
			return "AstStatIf"
		else
			return "AstExprIfElse"
		end
	elseif tag == "function" then
		-- AstTypeFunction has returnArrow
		if node.returnArrow then
			return "AstTypeFunction"
		-- AstStatFunction has name, AstExprAnonymousFunction doesn't
		elseif node.name then
			return "AstStatFunction"
		else
			return "AstExprAnonymousFunction"
		end
	elseif tag == "group" then
		-- AstExprGroup has expression, AstTypeGroup has type
		if node.expression then
			return "AstExprGroup"
		elseif node.type then
			return "AstTypeGroup"
		end
	elseif tag == "local" then
		-- AstExprLocal has token/upvalue, AstStatLocal has localKeyword/variables
		if node.token and node.upvalue ~= nil then
			return "AstExprLocal"
		elseif node.localKeyword and node.variables then
			return "AstStatLocal"
		end
	elseif tag == "generic" then
		-- AstTypePackGeneric has ellipsis, AstGenericType doesn't
		if node.ellipsis then
			return "AstTypePackGeneric"
		else
			return "AstGenericType"
		end
	elseif tag == "table" then
		-- Both are similar, but we can check entry types or assume context
		-- For now, try to distinguish by checking if we're in a type context
		-- This is a heuristic - could be improved with better context analysis
		if node.entries and #node.entries > 0 then
			-- Check first entry structure for type-like patterns
			local firstEntry = node.entries[1]
			if firstEntry and (firstEntry.kind ~= "record" and firstEntry.kind ~= "general") then
				return "AstTypeTable" -- More likely a type table
			end
		end
		return "AstExprTable" -- Default to expression table
	elseif tag == "string" then
		-- AstTypeSingletonString typically has fewer quote styles
		if node.quoteStyle == "block" or node.quoteStyle == "interp" or node.blockDepth then
			return "AstExprConstantString" -- Only expressions have these
		else
			return "AstTypeSingletonString"
		end
	end

	-- Fallback to original mapping if no disambiguation needed
	return typeDefinitions.tags[tag]
end

local function resolveAmbiguousKeys(nodeKey, node, parentNode, parentKey)
	-- Ambiguous keys that need context-aware resolution:
	if nodeKey == "body" then
		-- AstStatBlock vs AstFunctionBody
		if node.openParens then
			return "AstFunctionBody"
		else
			return "AstStatBlock"
		end
	elseif nodeKey == "name" then
		-- Token vs AstExpr vs AstLocal
		if node.text then
			return "Token"
		elseif node.name then
			return "AstLocal"
		else
			return "AstExpr"
		end
	elseif nodeKey == "value" then
		-- boolean vs number vs AstExpr vs AstType
		if parentNode.colon then
			return "AstType"
		elseif parentNode.kind or parentNode.operand then
			return "AstExpr"
		else
			return if parentNode.tag == "boolean" then "boolean" else "number"
		end
	elseif nodeKey == "consequent" or nodeKey == "antecedent" then
		-- AstExpr vs AstStatBlock
		if node.statements then
			return "AstStatBlock"
		else
			return "AstExpr"
		end
	elseif nodeKey == "key" then
		-- Token vs AstExpr vs AstType vs AstTypeSingletonString
		local kind = parentNode.kind
		if kind == "record" then
			return "Token"
		elseif kind == "general" then
			return "AstExpr"
		elseif kind == "indexer" then
			return "AstType"
		else
			return "AstTypeSingletonString"
		end
	elseif nodeKey == "operand" then
		-- AstExpr vs Token
		if parentNode.operator then
			return "AstExpr"
		else
			return "Token"
		end
	elseif nodeKey == "variable" then
		-- AstLocal vs AstExpr
		if parentNode.equals then
			return "AstLocal"
		else
			return "AstExpr"
		end
	elseif nodeKey == "type" then
		-- AstType vs Token
		if parentNode.functionKeyword then
			return "Token"
		else
			return "AstType"
		end
	elseif nodeKey == "default" then
		-- AstType vs AstTypePack
		if parentNode.ellipsis then
			return "AstTypePack"
		else
			return "AstType"
		end
	elseif nodeKey == "self" then
		-- boolean vs AstLocal
		if parentNode.tag then
			return "boolean"
		else
			return "AstLocal"
		end
	elseif nodeKey == "index" then
		-- Token vs AstExpr
		if parentNode.accessor then
			return "Token"
		else
			return "AstExpr"
		end
	end

	-- Fallback to original key mapping
	return typeDefinitions.keys[nodeKey]
end

local function annotateWithType(node, nodeKey, parent, parentKey)
	if type(node) ~= "table" then
		return node
	end

	local astType = nil

	-- Priority 1: Context-aware tag-based type resolution
	if node.tag then
		astType = resolveAmbiguousTags(node)
	elseif node.kind then
		astType = typeDefinitions.kinds[node.kind]

	-- Priority 2: Key-based type resolution (fallback)
	elseif nodeKey then
		astType = resolveAmbiguousKeys(nodeKey, node, parent, parentKey)

	-- Priority 3: Generic token detection
	elseif nodeKey and nodeKey:match("Keyword$") then
		-- Any property ending in "Keyword" is probably a token
		astType = "Token"
	elseif nodeKey and (nodeKey:match("^open") or nodeKey:match("^close")) then
		-- Properties like openParen, closeBrace, etc.
		astType = "Token"
	end

	-- Add type annotation (skip arrays to avoid JSON encoding issues)
	if astType and not (#node > 0) then
		node._astType = astType
	end

	-- Recursively annotate children, passing key context
	for key, value in pairs(node) do
		if key ~= "_astType" then
			node[key] = annotateWithType(value, if typeof(key) == "string" then key else tostring(key), node, nodeKey)
		end
	end
	return node
end

return {
	annotateWithType = annotateWithType,
	resolveAmbiguousTags = resolveAmbiguousTags,
	resolveAmbiguousKeys = resolveAmbiguousKeys,
}
