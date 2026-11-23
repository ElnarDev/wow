local elapsed = 0

LatencyBridgeDB = LatencyBridgeDB or {}

local frame = CreateFrame("Frame")
frame:RegisterEvent("PLAYER_LOGIN")
frame:RegisterEvent("PLAYER_ENTERING_WORLD")
frame:SetScript("OnUpdate", function(self, delta)
    elapsed = elapsed + delta
    if elapsed < 1 then
        return
    end

    elapsed = 0
    local _, _, home, world = GetNetStats()
    if type(home) == "number" and type(world) == "number" then
        LatencyBridgeDB.home = home
        LatencyBridgeDB.world = world
        LatencyBridgeDB.timestamp = time()
        LatencyBridgeDB.updatedAt = date("%Y-%m-%d %H:%M:%S")
    end
end)
