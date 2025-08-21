local type_annotations = require("../lua_helpers/typeAnnotations")
local parser = require("@std/syntax/parser")
local visitor = require("@std/syntax/visitor")
local annotateWithType = type_annotations.annotateWithType
local resolveAmbiguousTags, resolveAmbiguousKeys =
	type_annotations.resolveAmbiguousTags, type_annotations.resolveAmbiguousKeys
local typeAnnotationHelpers = require("./helpers/typeAnnotationTestHelpers")

local function annotateWithType_test()
	-- parse and annotate src code snippet (with large coverage of syntax constructs)
	local testAST = annotateWithType(parser.parse(typeAnnotationHelpers.testSrc))
	-- visit annotated tree to check for correct type assignment (using typeAnnotationVisitor)
	local typeAnnotationChecker = typeAnnotationHelpers.typeAnnotationVisitor
	visitor.visitBlock(testAST, typeAnnotationChecker)
end

-- test function on manually created AstNodes that map to expected output
local function resolveAmbiguousTags_test()
	for _, case in ipairs(typeAnnotationHelpers.ambiguousTagTestCases) do
		local result = resolveAmbiguousTags(case[1])
		assert(result == case[2], string.format("Failed %s: expected %s, got %s", case[3], case[2], result))
		print(string.format("✓ %s -> %s", case[3], result))
	end
end

-- test function on manually created AstNodes that map to expected output
local function resolveAmbiguousKeys_test()
	for _, case in ipairs(typeAnnotationHelpers.ambiguousKeyTestCases) do
		local result = resolveAmbiguousKeys(case[1], case[2], case[3])
		local expected = case[4]
		assert(
			result == expected,
			string.format("Failed %s: expected %s, got %s", case[5], tostring(expected), tostring(result))
		)
		print(string.format("✓ %s -> %s", case[5], tostring(result)))
	end
end

return function()
	resolveAmbiguousKeys_test()
	resolveAmbiguousTags_test()
	annotateWithType_test()
end
