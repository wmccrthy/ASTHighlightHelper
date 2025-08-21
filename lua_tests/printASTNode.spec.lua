local printer = require("../lua_helpers/temp_vendor/lutePrinter")
local parser = require("@std/syntax/parser")
local helpers = require("./helpers/astJsonToCodeHelpers")
local getSortedChildren = require("../lua_helpers/sortByPositionTable")
local printLocalCases = helpers.testCases.printLocalCases
local createMockToken, createMockPunctuatedArray = helpers.createMockToken, helpers.createMockPunctuatedArray

local function test_printlocal()
	for expectedOutput, testCase in printLocalCases do
		local result = printer.printlocal(testCase)
		assert(result == expectedOutput, "Failed printlocal on node for src code: " .. expectedOutput)
	end
end

-- Test cases for printfallback in particular
local function test_printfallback()
	print("Testing printASTNode cascade behavior...")

	-- Test 1: Valid token should be printed successfully
	local nestedTokenNode = {
		child1 = createMockToken("test", 1, 0),
		child2 = createMockToken("hmmm", 1, 5),
	}
	local result = printer.printfallback(nestedTokenNode)
	assert(result == "testhmmm", "Failed to print simple token")

	-- Test 2: Array node should trigger fallback behavior
	local arrayNode = {
		createMockToken("hello", 1, 1),
		createMockToken(" ", 1, 6),
		createMockToken("world", 1, 7),
	}
	local arrayResult = printer.printfallback(arrayNode)
	assert(arrayResult == "hello world", "Failed to print array node")

	print("✓ printASTNode cascade tests passed")
end

-- Test position-based sorting in printFallback
local function test_position_sorting()
	print("Testing position-based sorting in printFallback...")

	-- Create node with children in reverse position order
	local unsortedNode = {
		laterChild = createMockToken("second", 2, 1), -- line 2
		earlierChild = createMockToken("first", 1, 1), -- line 1
		middleChild = createMockToken("middle", 1, 10), -- line 1, col 10
	}

	local sortedNode = getSortedChildren(unsortedNode)
	local isSorted = sortedNode[1].text == "first" and sortedNode[2].text == "middle" and sortedNode[3].text == "second"
	assert(isSorted, "getSortedChildren failed to order elements based on line and column")

	local result = printer.printASTNode(unsortedNode)

	-- Result should be sorted by position: line 1 col 1, line 1 col 10, line 2 col 1
	local firstPos = result:find("first")
	local middlePos = result:find("middle")
	local secondPos = result:find("second")

	assert(firstPos < middlePos and middlePos < secondPos, "Children not sorted by position correctly")

	print("✓ Position sorting tests passed")
end

-- Test integration with real AST nodes from parser
local function test_real_ast_integration()
	print("Testing integration with real AST nodes...")

	-- Test with valid Luau code that produces various AST structures
	local validCases = helpers.testCases.e2eCases
	for _, code in ipairs(validCases) do
		local parseSuccess, ast = pcall(function()
			return parser.parse(code)
		end)

		if parseSuccess and ast then
			-- Only test printing if parsing succeeded
			local printSuccess, result = pcall(function()
				return printer.printASTNode(ast)
			end)
			assert(printSuccess, "Failed to handle real AST for: " .. code .. " with error: " .. tostring(result))
		else
			print("Skipping invalid code: " .. code)
		end
	end

	print("✓ Real AST integration tests passed")
end

-- Test manually constructed edge case nodes based on real AST structures
local function test_manual_edge_cases()
	print("Testing manually constructed edge case nodes...")

	-- Test 1: Test unprintable node with printable descendants (nested and unnested to test recursive)
	local children = {
		createMockPunctuatedArray({
			createMockToken("a", 1, 1),
			createMockToken("b", 1, 2),
			createMockToken("c", 1, 3),
		}, {
			createMockToken(",", 1, 4),
			createMockToken(",", 1, 5),
		}),
		createMockToken("d", 1, 6),
		createMockToken("e", 1, 7),
	}

	local unprintableNode = { -- no tag, not a token so unprintable with standard print methods
		children = children,
	}
	local unprintableResult = printer.printASTNode(unprintableNode)
	assert(unprintableResult == "a,b,cde", "Failed to print node with printable descendants")

	-- Test 2: Error handling for unprintable leaf nodes (consolidated)
	local unprintableNodes = {
		{ begin = { column = 0, line = 1 }, ["end"] = { column = 10, line = 1 } },
		{ column = 5, line = 2 },
	}

	for key, node in ipairs(unprintableNodes) do
		local success, _res = pcall(function()
			return printer.printASTNode(node)
		end)
		assert(not success, "Should error on unprintable node: " .. (key or "unknown"))
	end

	print("✓ Manual edge case tests passed")
end

-- Test performance with large nested structures
local function test_performance()
	print("Testing performance with large structures...")

	-- Create a large nested array structure
	local largeArray = {}
	for i = 1, 100 do
		largeArray[i] = createMockToken("token" .. i, i, 1)
	end

	local startTime = os.clock()
	local result = printer.printASTNode(largeArray)
	local endTime = os.clock()

	-- Should complete in reasonable time (< 1 second for this test)
	assert(endTime - startTime < 1.0, "Performance test failed - took too long")
	assert(#result > 0, "Performance test produced empty result")

	print("✓ Performance tests passed")
end

-- Main test runner
return function()
	print("Running printASTNode comprehensive tests...")
	test_printlocal()
	test_printfallback()
	test_position_sorting()
	test_real_ast_integration()
	test_manual_edge_cases() -- Now includes recursive and error testing
	test_performance()

	print("🎉 All printASTNode tests passed!")
end
