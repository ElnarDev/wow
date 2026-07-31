-- SeasonChecklist – Core
-- Responsable de: inicialización, escaneo de logros, persistencia y eventos.

local ADDON_NAME = "SeasonChecklist"
SeasonChecklist = SeasonChecklist or {}
local SC = SeasonChecklist

-- ─────────────────────────────────────────────────────────────────────────────
--  Constantes
-- ─────────────────────────────────────────────────────────────────────────────
SC.VERSION    = "1.0.0"
SC.DB_VERSION = 1

-- ─────────────────────────────────────────────────────────────────────────────
--  Frame de eventos principal
-- ─────────────────────────────────────────────────────────────────────────────
local eventFrame = CreateFrame("Frame", ADDON_NAME .. "EventFrame")

-- ─────────────────────────────────────────────────────────────────────────────
--  Inicialización de la base de datos guardada
-- ─────────────────────────────────────────────────────────────────────────────
local function InitDB()
    if not SeasonChecklistDB then
        SeasonChecklistDB = { version = SC.DB_VERSION, collapsed = {} }
    end
    -- Migración futura de versión
    SeasonChecklistDB.version = SeasonChecklistDB.version or SC.DB_VERSION
    if not SeasonChecklistDB.collapsed then
        SeasonChecklistDB.collapsed = {}
    end
    SC.db = SeasonChecklistDB
end

-- ─────────────────────────────────────────────────────────────────────────────
--  Escaneo de logros
-- ─────────────────────────────────────────────────────────────────────────────
-- Devuelve true si el personaje ya tiene el logro.
function SC:HasAchievement(achievementID)
    local _, _, _, completed = GetAchievementInfo(achievementID)
    return completed == true
end

-- Recorre todas las categorías y actualiza el estado en el cache SC.status.
-- sc.status[achievementID] = true/false
function SC:ScanAll()
    SC.status = SC.status or {}
    for _, cat in ipairs(SeasonChecklist_Data.categories) do
        for _, entry in ipairs(cat.entries) do
            SC.status[entry.achievementID] = SC:HasAchievement(entry.achievementID)
        end
    end
end

-- Calcula cuántos logros completados/total tiene una categoría.
-- Devuelve: done (int), total (int)
function SC:CategoryProgress(cat)
    local done, total = 0, #cat.entries
    for _, entry in ipairs(cat.entries) do
        if SC.status and SC.status[entry.achievementID] then
            done = done + 1
        end
    end
    return done, total
end

-- ─────────────────────────────────────────────────────────────────────────────
--  Navegación al panel de logros
-- ─────────────────────────────────────────────────────────────────────────────
function SC:OpenAchievement(achievementID)
    if not AchievementFrame then
        LoadAddOn("Blizzard_AchievementUI")
    end
    if AchievementFrame then
        if not AchievementFrame:IsShown() then
            AchievementFrame:Show()
        end
        AchievementFrame_SelectAchievement(achievementID)
    end
end

-- ─────────────────────────────────────────────────────────────────────────────
--  Manejo de eventos
-- ─────────────────────────────────────────────────────────────────────────────
local function OnEvent(self, event, ...)
    if event == "ADDON_LOADED" then
        local name = ...
        if name == ADDON_NAME then
            InitDB()
            -- Primera pasada de escaneo (diferida para cuando el personaje esté listo)
        end

    elseif event == "PLAYER_LOGIN" then
        SC:ScanAll()
        if SeasonChecklist.UI and SeasonChecklist.UI.Refresh then
            SeasonChecklist.UI:Refresh()
        end

    elseif event == "ACHIEVEMENT_EARNED" then
        local id = ...
        if SC.status then
            SC.status[id] = true
        end
        if SeasonChecklist.UI and SeasonChecklist.UI.RefreshEntry then
            SeasonChecklist.UI:RefreshEntry(id)
        end
    end
end

eventFrame:RegisterEvent("ADDON_LOADED")
eventFrame:RegisterEvent("PLAYER_LOGIN")
eventFrame:RegisterEvent("ACHIEVEMENT_EARNED")
eventFrame:SetScript("OnEvent", OnEvent)

-- ─────────────────────────────────────────────────────────────────────────────
--  Comando de slash
-- ─────────────────────────────────────────────────────────────────────────────
SLASH_SEASONCHECKLIST1 = "/sc"
SLASH_SEASONCHECKLIST2 = "/seasonchecklist"
SlashCmdList["SEASONCHECKLIST"] = function()
    if SeasonChecklist.UI and SeasonChecklist.UI.Toggle then
        SeasonChecklist.UI:Toggle()
    end
end
