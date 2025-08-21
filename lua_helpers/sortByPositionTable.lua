local function getNodePosition(node)
	-- Direct position access
	if node.position then
		return node.position.line, node.position.column
	end
	if node.location then
		return node.location.begin.line, node.location.begin.column
	end

	if typeof(node) ~= "table" then return nil, nil end
	
	-- Recursive search for position in children
	local minLine, minCol
	for _, child in node do
		if typeof(child) == "table" then
			local childLine, childCol = getNodePosition(child)
			if childLine and childCol then
				if not minLine or childLine < minLine or (childLine == minLine and childCol < minCol) then
					minLine, minCol = childLine, childCol
				end
			end
		end
	end
	return minLine, minCol
end

local function sortByPosition(node1, node2)
	local line1, col1 = getNodePosition(node1)
	local line2, col2 = getNodePosition(node2)
	return line1 < line2 or (line1 == line2 and col1 < col2)
end

local function getSortedChildren(node: any)
	local sorted = {}
	for key, child in node do
		-- Filter out diff metadata and nodes without position
		if key ~= "beforeValue" and key ~= "afterValue" then
			local line, col = getNodePosition(child)
			if line and col then
				table.insert(sorted, child)
			end
		end
	end
	table.sort(sorted, sortByPosition)
	return sorted
end

return getSortedChildren
