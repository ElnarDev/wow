-- SeasonChecklist – CategoryRow
-- Construye la fila de encabezado de categoría con barra de progreso y toggle.

local SC = SeasonChecklist
SC.UI   = SC.UI or {}

local COLOR_CAT_BG      = { 0.10, 0.07, 0.20, 1.00 }
local COLOR_CAT_HOVER   = { 0.14, 0.10, 0.28, 1.00 }
local COLOR_CAT_TEXT    = { 0.90, 0.82, 1.00, 1.00 }
local COLOR_PROG_FILL   = { 0.55, 0.28, 0.90, 1.00 }
local COLOR_PROG_BG     = { 0.18, 0.12, 0.30, 1.00 }
local COLOR_COUNT       = { 0.70, 0.60, 0.90, 1.00 }
local COLOR_DONE_TEXT   = { 0.40, 0.85, 0.40, 1.00 }
local COLOR_PEND_TEXT   = { 0.80, 0.80, 0.80, 1.00 }
local COLOR_ACHIEV_BG   = { 0.07, 0.05, 0.14, 1.00 }
local COLOR_ACHIEV_HOVER= { 0.13, 0.09, 0.22, 1.00 }
local COLOR_CHECK_DONE  = { 0.40, 0.85, 0.40, 1.00 }

local ROW_H     = 28
local ACHIEV_H  = 24
local BAR_H     = 5
local INDENT    = 12

-- ─────────────────────────────────────────────────────────────────────────────
--  Helper: fondo con color sólido
-- ─────────────────────────────────────────────────────────────────────────────
local function SetBG(frame, r, g, b, a)
    if not frame._bg then
        frame._bg = frame:CreateTexture(nil, "BACKGROUND")
        frame._bg:SetAllPoints()
    end
    frame._bg:SetColorTexture(r, g, b, a)
end

-- ─────────────────────────────────────────────────────────────────────────────
--  Fila de un logro individual
-- ─────────────────────────────────────────────────────────────────────────────
local function BuildAchievementRow(parent, entry, yOffset, catID)
    local id   = entry.achievementID
    local name = SC_L[entry.name] or entry.name
    local hint = SC_L[entry.hint] or ""

    -- Obtener nombre real del cliente si está disponible
    local _, apiName = GetAchievementInfo(id)
    if apiName and apiName ~= "" then name = apiName end

    local row = CreateFrame("Button", nil, parent)
    row:SetHeight(ACHIEV_H)
    row:SetPoint("TOPLEFT",  parent, "TOPLEFT",  INDENT, yOffset)
    row:SetPoint("TOPRIGHT", parent, "TOPRIGHT", -4,     yOffset)

    SetBG(row, COLOR_ACHIEV_BG[1], COLOR_ACHIEV_BG[2], COLOR_ACHIEV_BG[3], COLOR_ACHIEV_BG[4])

    -- Hover visual
    row:SetScript("OnEnter", function(self)
        self._bg:SetColorTexture(COLOR_ACHIEV_HOVER[1], COLOR_ACHIEV_HOVER[2], COLOR_ACHIEV_HOVER[3], COLOR_ACHIEV_HOVER[4])
        if hint ~= "" then
            GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
            GameTooltip:SetText(name, 1, 1, 1, 1, true)
            GameTooltip:AddLine(hint, 0.8, 0.8, 0.8, true)
            GameTooltip:AddLine(SC_L["TOOLTIP_CLICK"] or "Click para ver en Logros", 0.5, 0.8, 1.0)
            GameTooltip:Show()
        end
    end)
    row:SetScript("OnLeave", function(self)
        self._bg:SetColorTexture(COLOR_ACHIEV_BG[1], COLOR_ACHIEV_BG[2], COLOR_ACHIEV_BG[3], COLOR_ACHIEV_BG[4])
        GameTooltip:Hide()
    end)

    -- Click → navega al logro en el panel oficial
    row:SetScript("OnClick", function()
        SC:OpenAchievement(id)
    end)

    -- ── Icono del logro ───────────────────────────────────────────────────────
    local _, _, _, _, _, _, _, _, _, iconTex = GetAchievementInfo(id)
    local icon = row:CreateTexture(nil, "ARTWORK")
    icon:SetSize(16, 16)
    icon:SetPoint("LEFT", row, "LEFT", 4, 0)
    if iconTex then
        icon:SetTexture(iconTex)
        icon:SetTexCoord(0.08, 0.92, 0.08, 0.92)
    end

    -- ── Check de completado ───────────────────────────────────────────────────
    local isDone = SC.status and SC.status[id] == true
    local checkTex = row:CreateTexture(nil, "OVERLAY")
    checkTex:SetSize(14, 14)
    checkTex:SetPoint("RIGHT", row, "RIGHT", -4, 0)
    if isDone then
        checkTex:SetTexture("Interface\\RaidFrame\\ReadyCheck-Ready")
        checkTex:SetVertexColor(COLOR_CHECK_DONE[1], COLOR_CHECK_DONE[2], COLOR_CHECK_DONE[3], 1)
    else
        checkTex:SetTexture("Interface\\RaidFrame\\ReadyCheck-NotReady")
        checkTex:SetVertexColor(0.6, 0.6, 0.6, 0.7)
    end
    -- Registrar en global para RefreshEntry
    _G["SC_Check_" .. id] = checkTex

    -- ── Nombre del logro ─────────────────────────────────────────────────────
    local label = row:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    label:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", 10, "OUTLINE")
    label:SetPoint("LEFT",  icon,     "RIGHT",  5, 0)
    label:SetPoint("RIGHT", checkTex, "LEFT",  -4, 0)
    label:SetJustifyH("LEFT")
    label:SetWordWrap(false)
    if isDone then
        label:SetTextColor(COLOR_DONE_TEXT[1], COLOR_DONE_TEXT[2], COLOR_DONE_TEXT[3], 1)
    else
        label:SetTextColor(COLOR_PEND_TEXT[1], COLOR_PEND_TEXT[2], COLOR_PEND_TEXT[3], 1)
    end
    label:SetText(name)

    return row
end

-- ─────────────────────────────────────────────────────────────────────────────
--  Fila de categoría (cabecera + contenido colapsable)
-- ─────────────────────────────────────────────────────────────────────────────
function SC.UI.BuildCategoryRow(parent, cat, yOffset)
    local done, total = SC:CategoryProgress(cat)
    local pct         = total > 0 and (done / total) or 0
    local collapsed   = SC.db.collapsed[cat.id] == true

    local container = CreateFrame("Frame", nil, parent)
    container:SetPoint("TOPLEFT",  parent, "TOPLEFT",  0, yOffset)
    container:SetPoint("TOPRIGHT", parent, "TOPRIGHT", 0, yOffset)

    -- ── Encabezado de categoría ───────────────────────────────────────────────
    local header = CreateFrame("Button", nil, container)
    header:SetHeight(ROW_H)
    header:SetPoint("TOPLEFT",  container, "TOPLEFT",  0, 0)
    header:SetPoint("TOPRIGHT", container, "TOPRIGHT", 0, 0)

    SetBG(header, COLOR_CAT_BG[1], COLOR_CAT_BG[2], COLOR_CAT_BG[3], COLOR_CAT_BG[4])

    header:SetScript("OnEnter", function(self)
        self._bg:SetColorTexture(COLOR_CAT_HOVER[1], COLOR_CAT_HOVER[2], COLOR_CAT_HOVER[3], COLOR_CAT_HOVER[4])
    end)
    header:SetScript("OnLeave", function(self)
        self._bg:SetColorTexture(COLOR_CAT_BG[1], COLOR_CAT_BG[2], COLOR_CAT_BG[3], COLOR_CAT_BG[4])
    end)

    -- Icono de categoría
    local catIcon = header:CreateTexture(nil, "ARTWORK")
    catIcon:SetSize(18, 18)
    catIcon:SetPoint("LEFT", header, "LEFT", 8, 0)
    catIcon:SetTexture(cat.icon)
    catIcon:SetTexCoord(0.08, 0.92, 0.08, 0.92)

    -- Nombre de categoría
    local catLabel = header:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    catLabel:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", 11, "OUTLINE")
    catLabel:SetPoint("LEFT", catIcon, "RIGHT", 6, 0)
    catLabel:SetText(SC_L[cat.name] or cat.name)
    catLabel:SetTextColor(COLOR_CAT_TEXT[1], COLOR_CAT_TEXT[2], COLOR_CAT_TEXT[3], 1)

    -- Contador numérico (3/6)
    local countLabel = header:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    countLabel:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", 10, "OUTLINE")
    countLabel:SetPoint("RIGHT", header, "RIGHT", -28, 0)
    countLabel:SetText(string.format("%d/%d", done, total))
    countLabel:SetTextColor(COLOR_COUNT[1], COLOR_COUNT[2], COLOR_COUNT[3], 1)
    _G["SC_CatPct_" .. cat.id] = countLabel

    -- Flecha collapse
    local arrow = header:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    arrow:SetFont("Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf", 12, "OUTLINE")
    arrow:SetPoint("RIGHT", header, "RIGHT", -8, 0)
    arrow:SetText(collapsed and "▶" or "▼")
    arrow:SetTextColor(0.7, 0.6, 0.9, 1)

    -- ── Mini barra de progreso bajo el header ─────────────────────────────────
    local barBg = header:CreateTexture(nil, "ARTWORK")
    barBg:SetHeight(BAR_H)
    barBg:SetPoint("BOTTOMLEFT",  header, "BOTTOMLEFT",  0, 0)
    barBg:SetPoint("BOTTOMRIGHT", header, "BOTTOMRIGHT", 0, 0)
    barBg:SetColorTexture(COLOR_PROG_BG[1], COLOR_PROG_BG[2], COLOR_PROG_BG[3], COLOR_PROG_BG[4])

    local barFill = header:CreateTexture(nil, "OVERLAY")
    barFill:SetHeight(BAR_H)
    barFill:SetPoint("BOTTOMLEFT", header, "BOTTOMLEFT", 0, 0)
    barFill:SetColorTexture(COLOR_PROG_FILL[1], COLOR_PROG_FILL[2], COLOR_PROG_FILL[3], COLOR_PROG_FILL[4])
    -- Ancho inicial; se actualiza con closure
    local function UpdateBar()
        local w = header:GetWidth()
        barFill:SetWidth(math.max(1, w * (done / math.max(total, 1))))
    end
    header:SetScript("OnSizeChanged", UpdateBar)
    -- Registrar bar para RefreshEntry
    _G["SC_CatBar_" .. cat.id] = {
        SetValue = function(_, v)
            local w = header:GetWidth()
            barFill:SetWidth(math.max(1, w * v))
        end,
    }

    -- ── Contenido (filas de logros) ───────────────────────────────────────────
    local body = CreateFrame("Frame", nil, container)
    body:SetPoint("TOPLEFT",  container, "TOPLEFT",  0, -ROW_H)
    body:SetPoint("TOPRIGHT", container, "TOPRIGHT", 0, -ROW_H)

    local totalBodyH = 0
    for i, entry in ipairs(cat.entries) do
        local rowY    = -(i - 1) * (ACHIEV_H + 1)
        local achRow  = BuildAchievementRow(body, entry, rowY, cat.id)
        totalBodyH    = totalBodyH + ACHIEV_H + 1
    end
    body:SetHeight(totalBodyH)

    if collapsed then body:Hide() end

    -- Toggle collapse al hacer click en el header
    header:SetScript("OnClick", function()
        local isNowCollapsed = not (SC.db.collapsed[cat.id] == true)
        SC.db.collapsed[cat.id] = isNowCollapsed
        if isNowCollapsed then
            body:Hide()
            arrow:SetText("▶")
        else
            body:Show()
            arrow:SetText("▼")
        end
        -- Notifica al frame padre para reposicionar todo
        SC.UI:Refresh()
    end)

    local totalH = ROW_H + (collapsed and 0 or totalBodyH) + 2
    container:SetHeight(totalH)

    -- Ajustar barra al primer frame
    C_Timer.After(0, UpdateBar)

    return container
end
