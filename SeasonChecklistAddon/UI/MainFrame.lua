-- SeasonChecklist – MainFrame
-- Ventana principal: barra de título, botón de cierre, scroll y header global.

local SC = SeasonChecklist
SC.UI   = SC.UI or {}
local UI = SC.UI

-- ─────────────────────────────────────────────────────────────────────────────
--  Paleta de colores
-- ─────────────────────────────────────────────────────────────────────────────
local COLOR = {
    bg          = { 0.06, 0.06, 0.10, 0.95 },
    titleBar    = { 0.08, 0.08, 0.16, 1.00 },
    border      = { 0.40, 0.30, 0.70, 0.90 },
    titleText   = { 0.85, 0.75, 1.00, 1.00 },
    subText     = { 0.65, 0.65, 0.75, 1.00 },
    progressBar = { 0.50, 0.25, 0.85, 1.00 },
    progressBg  = { 0.15, 0.10, 0.25, 1.00 },
    gold        = { 1.00, 0.82, 0.00, 1.00 },
}

-- ─────────────────────────────────────────────────────────────────────────────
--  Helpers de estilo
-- ─────────────────────────────────────────────────────────────────────────────
local function SetBackdropColor(frame, r, g, b, a)
    if frame.SetBackdropColor then
        frame:SetBackdropColor(r, g, b, a)
    end
end

local function CreatePixelBorder(frame)
    local b = CreateFrame("Frame", nil, frame, "BackdropTemplate")
    b:SetPoint("TOPLEFT",     frame, "TOPLEFT",    -1, 1)
    b:SetPoint("BOTTOMRIGHT", frame, "BOTTOMRIGHT", 1, -1)
    b:SetBackdrop({
        edgeFile = "Interface\\Buttons\\WHITE8X8",
        edgeSize = 1,
    })
    b:SetBackdropBorderColor(COLOR.border[1], COLOR.border[2], COLOR.border[3], COLOR.border[4])
    b:SetFrameLevel(frame:GetFrameLevel() - 1)
end

local function MakeLabel(parent, text, size, r, g, b, a)
    local fs = parent:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    fs:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", size, "OUTLINE")
    fs:SetText(text)
    fs:SetTextColor(r or 1, g or 1, b or 1, a or 1)
    return fs
end

-- ─────────────────────────────────────────────────────────────────────────────
--  Creación de la ventana principal
-- ─────────────────────────────────────────────────────────────────────────────
local FRAME_W  = 440
local FRAME_H  = 560
local TITLE_H  = 36
local FOOTER_H = 28

local function BuildMainFrame()
    -- Contenedor raíz
    local f = CreateFrame("Frame", "SeasonChecklistMainFrame", UIParent, "BackdropTemplate")
    f:SetSize(FRAME_W, FRAME_H)
    f:SetPoint("CENTER")
    f:SetMovable(true)
    f:EnableMouse(true)
    f:RegisterForDrag("LeftButton")
    f:SetScript("OnDragStart", f.StartMoving)
    f:SetScript("OnDragStop",  f.StopMovingOrSizing)
    f:SetFrameStrata("DIALOG")
    f:SetBackdrop({
        bgFile   = "Interface\\Buttons\\WHITE8X8",
        edgeFile = "Interface\\Buttons\\WHITE8X8",
        edgeSize = 1,
    })
    SetBackdropColor(f, COLOR.bg[1], COLOR.bg[2], COLOR.bg[3], COLOR.bg[4])
    f:SetBackdropBorderColor(COLOR.border[1], COLOR.border[2], COLOR.border[3], COLOR.border[4])
    f:Hide()

    -- ── Barra de título ───────────────────────────────────────────────────────
    local titleBar = CreateFrame("Frame", nil, f, "BackdropTemplate")
    titleBar:SetHeight(TITLE_H)
    titleBar:SetPoint("TOPLEFT",  f, "TOPLEFT",  0, 0)
    titleBar:SetPoint("TOPRIGHT", f, "TOPRIGHT", 0, 0)
    titleBar:SetBackdrop({ bgFile = "Interface\\Buttons\\WHITE8X8" })
    SetBackdropColor(titleBar, COLOR.titleBar[1], COLOR.titleBar[2], COLOR.titleBar[3], COLOR.titleBar[4])

    -- Icono de temporada
    local icon = titleBar:CreateTexture(nil, "ARTWORK")
    icon:SetSize(22, 22)
    icon:SetPoint("LEFT", titleBar, "LEFT", 10, 0)
    icon:SetTexture("Interface\\Icons\\Achievement_Quests_Completed_04")
    icon:SetTexCoord(0.08, 0.92, 0.08, 0.92)

    -- Título
    local title = titleBar:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    title:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", 13, "OUTLINE")
    title:SetPoint("LEFT", icon, "RIGHT", 8, 0)
    title:SetText(SC_L["ADDON_TITLE"] or "Season Checklist")
    title:SetTextColor(COLOR.titleText[1], COLOR.titleText[2], COLOR.titleText[3], COLOR.titleText[4])

    -- Temporada actual
    local seasonLabel = titleBar:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    seasonLabel:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", 10, "OUTLINE")
    seasonLabel:SetPoint("RIGHT", titleBar, "RIGHT", -40, 0)
    seasonLabel:SetText(SeasonChecklist_Data.season)
    seasonLabel:SetTextColor(COLOR.subText[1], COLOR.subText[2], COLOR.subText[3], COLOR.subText[4])

    -- Botón de cierre
    local closeBtn = CreateFrame("Button", nil, titleBar, "UIPanelCloseButton")
    closeBtn:SetSize(24, 24)
    closeBtn:SetPoint("RIGHT", titleBar, "RIGHT", -4, 0)
    closeBtn:SetScript("OnClick", function() f:Hide() end)

    -- ── Barra de progreso global ──────────────────────────────────────────────
    local progressBg = CreateFrame("Frame", nil, f, "BackdropTemplate")
    progressBg:SetHeight(6)
    progressBg:SetPoint("TOPLEFT",  f, "TOPLEFT",   8, -(TITLE_H + 6))
    progressBg:SetPoint("TOPRIGHT", f, "TOPRIGHT", -8, -(TITLE_H + 6))
    progressBg:SetBackdrop({ bgFile = "Interface\\Buttons\\WHITE8X8" })
    SetBackdropColor(progressBg, COLOR.progressBg[1], COLOR.progressBg[2], COLOR.progressBg[3], COLOR.progressBg[4])

    local progressFill = progressBg:CreateTexture(nil, "ARTWORK")
    progressFill:SetAllPoints(false)
    progressFill:SetPoint("TOPLEFT",  progressBg, "TOPLEFT")
    progressFill:SetPoint("BOTTOMLEFT", progressBg, "BOTTOMLEFT")
    progressFill:SetWidth(1) -- se actualiza en Refresh
    progressFill:SetColorTexture(COLOR.progressBar[1], COLOR.progressBar[2], COLOR.progressBar[3], COLOR.progressBar[4])
    UI.globalProgressFill  = progressFill
    UI.globalProgressBg    = progressBg

    local globalPctLabel = f:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    globalPctLabel:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", 9, "OUTLINE")
    globalPctLabel:SetPoint("TOPRIGHT", progressBg, "BOTTOMRIGHT", 0, -2)
    globalPctLabel:SetTextColor(COLOR.subText[1], COLOR.subText[2], COLOR.subText[3], COLOR.subText[4])
    UI.globalPctLabel = globalPctLabel

    -- ── Área de scroll ────────────────────────────────────────────────────────
    local scrollY = TITLE_H + 6 + 6 + 6 + 14  -- debajo del progressbar
    local scroll = CreateFrame("ScrollFrame", "SeasonChecklistScroll", f, "UIPanelScrollFrameTemplate")
    scroll:SetPoint("TOPLEFT",     f, "TOPLEFT",     6, -scrollY)
    scroll:SetPoint("BOTTOMRIGHT", f, "BOTTOMRIGHT", -26, FOOTER_H + 6)

    local content = CreateFrame("Frame", "SeasonChecklistScrollContent", scroll)
    content:SetWidth(scroll:GetWidth() or (FRAME_W - 32))
    content:SetHeight(1) -- se ajusta dinámicamente
    scroll:SetScrollChild(content)

    UI.scrollFrame   = scroll
    UI.scrollContent = content

    -- ── Footer ────────────────────────────────────────────────────────────────
    local footer = CreateFrame("Frame", nil, f, "BackdropTemplate")
    footer:SetHeight(FOOTER_H)
    footer:SetPoint("BOTTOMLEFT",  f, "BOTTOMLEFT",  0, 0)
    footer:SetPoint("BOTTOMRIGHT", f, "BOTTOMRIGHT", 0, 0)
    footer:SetBackdrop({ bgFile = "Interface\\Buttons\\WHITE8X8" })
    SetBackdropColor(footer, COLOR.titleBar[1], COLOR.titleBar[2], COLOR.titleBar[3], COLOR.titleBar[4])

    local scanBtn = CreateFrame("Button", nil, footer, "UIPanelButtonTemplate")
    scanBtn:SetSize(120, 20)
    scanBtn:SetPoint("LEFT", footer, "LEFT", 8, 0)
    scanBtn:SetText(SC_L["BTN_SCAN"] or "Escanear")
    scanBtn:SetScript("OnClick", function()
        SC:ScanAll()
        UI:Refresh()
    end)

    local versionLabel = footer:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    versionLabel:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", 8, "OUTLINE")
    versionLabel:SetPoint("RIGHT", footer, "RIGHT", -8, 0)
    versionLabel:SetText("v" .. SC.VERSION)
    versionLabel:SetTextColor(COLOR.subText[1], COLOR.subText[2], COLOR.subText[3], COLOR.subText[4])

    UI.mainFrame = f
    return f
end

-- ─────────────────────────────────────────────────────────────────────────────
--  Actualización del progreso global
-- ─────────────────────────────────────────────────────────────────────────────
local function UpdateGlobalProgress()
    local totalDone, totalAll = 0, 0
    for _, cat in ipairs(SeasonChecklist_Data.categories) do
        local d, t = SC:CategoryProgress(cat)
        totalDone = totalDone + d
        totalAll  = totalAll  + t
    end

    local pct = totalAll > 0 and (totalDone / totalAll) or 0
    local barW = UI.globalProgressBg:GetWidth()
    UI.globalProgressFill:SetWidth(math.max(1, barW * pct))

    local pctText = string.format("%d / %d  (%.0f%%)", totalDone, totalAll, pct * 100)
    if UI.globalPctLabel then
        UI.globalPctLabel:SetText(pctText)
    end
end

-- ─────────────────────────────────────────────────────────────────────────────
--  Refresh completo de la UI
-- ─────────────────────────────────────────────────────────────────────────────
function UI:Refresh()
    -- Limpia el contenido anterior
    local content = UI.scrollContent
    for _, child in ipairs({ content:GetChildren() }) do
        child:Hide()
        child:SetParent(nil)
    end
    content:SetHeight(1)

    -- Reconstruye cada categoría
    local yOffset = 0
    for _, cat in ipairs(SeasonChecklist_Data.categories) do
        local catFrame = SC.UI.BuildCategoryRow(content, cat, yOffset)
        yOffset = yOffset - catFrame:GetHeight() - 2
    end

    content:SetHeight(math.abs(yOffset) + 4)
    UpdateGlobalProgress()
end

-- Refresca únicamente la fila de un logro concreto (llamado desde ACHIEVEMENT_EARNED)
function UI:RefreshEntry(achievementID)
    -- Busca el checkbox asociado y lo actualiza
    local key = "SC_Check_" .. achievementID
    local check = _G[key]
    if check then
        check:SetChecked(SC.status[achievementID] == true)
    end
    -- Refresca el progreso de la categoría padre y el global
    for _, cat in ipairs(SeasonChecklist_Data.categories) do
        for _, entry in ipairs(cat.entries) do
            if entry.achievementID == achievementID then
                local barKey = "SC_CatBar_" .. cat.id
                local bar    = _G[barKey]
                if bar then
                    local done, total = SC:CategoryProgress(cat)
                    bar:SetValue(done / math.max(total, 1))
                    local lblKey = "SC_CatPct_" .. cat.id
                    local lbl = _G[lblKey]
                    if lbl then
                        lbl:SetText(string.format("%d/%d", done, total))
                    end
                end
                break
            end
        end
    end
    UpdateGlobalProgress()
end

-- ─────────────────────────────────────────────────────────────────────────────
--  API pública de la UI
-- ─────────────────────────────────────────────────────────────────────────────
function UI:Toggle()
    if not UI.mainFrame then
        BuildMainFrame()
        UI:Refresh()
        UI.mainFrame:Show()
    elseif UI.mainFrame:IsShown() then
        UI.mainFrame:Hide()
    else
        UI:Refresh()
        UI.mainFrame:Show()
    end
end

-- Inicialización diferida al primer login
local initFrame = CreateFrame("Frame")
initFrame:RegisterEvent("PLAYER_LOGIN")
initFrame:SetScript("OnEvent", function(self)
    BuildMainFrame()
    self:UnregisterAllEvents()
end)
