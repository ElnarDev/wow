local _, MCA = ...

MCA.UI = {}

local UI = MCA.UI
local FRAME_WIDTH = 420

local STATUS_COLORS = {
	shown = "ff3ddc84",
	pending_show = "ffffd54f",
	leveling = "ff8ab4f8",
	missing = "ffff6b6b",
}

local function Colorize(text, color)
	return string.format("|c%s%s|r", color, text)
end

local function BuildFallbackViewModel()
	return {
		isAvailable = false,
		errorMessage = "El modulo de Briggul no esta disponible.",
		pets = {},
		shownCount = 0,
		pendingShowCount = 0,
		levelingCount = 0,
		missingCount = 0,
		ownedCount = 0,
		totalCount = 0,
	}
end

local function BuildViewModel()
	if MCA.Briggul and MCA.Briggul.GetViewModel then
		return MCA.Briggul:GetViewModel()
	end

	return BuildFallbackViewModel()
end

local function BuildLegendText()
	if MCA.Briggul and MCA.Briggul.GetLegend then
		local legend = MCA.Briggul:GetLegend()
		if legend then
			return string.format("Leyenda: %s  |  %s  |  %s  |  %s", legend.shown, legend.pending, legend.leveling, legend.missing)
		end
	end

	return "Leyenda: Mostrada | Pendiente | Falta subir | No obtenida"
end

local function BuildRowLabel(pet)
	local color = STATUS_COLORS[pet.status] or "ffffffff"
	return Colorize(pet.line, color)
end

function UI:Initialize()
	if self.frame then
		return
	end

	local frame = CreateFrame("Frame", "MCA_MainFrame", UIParent, "BackdropTemplate")
	frame:SetSize(FRAME_WIDTH, 460)
	frame:SetPoint("CENTER")
	frame:SetFrameStrata("DIALOG")
	frame:SetMovable(true)
	frame:SetResizable(true)
	frame:EnableKeyboard(false)
	if frame.SetResizeBounds then
		frame:SetResizeBounds(FRAME_WIDTH, 380, FRAME_WIDTH, 720)
	elseif frame.SetMinResize and frame.SetMaxResize then
		frame:SetMinResize(FRAME_WIDTH, 380)
		frame:SetMaxResize(FRAME_WIDTH, 720)
	end
	frame:EnableMouse(true)
	frame:RegisterForDrag("LeftButton")
	frame:SetScript("OnDragStart", frame.StartMoving)
	frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
	frame:SetScript("OnSizeChanged", function(self, width)
		if math.abs(width - FRAME_WIDTH) > 0.5 then
			self:SetWidth(FRAME_WIDTH)
		end
	end)
	frame:Hide()

	frame:SetBackdrop({
		bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background",
		edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
		tile = true,
		tileSize = 32,
		edgeSize = 32,
		insets = { left = 8, right = 8, top = 8, bottom = 8 },
	})

	local title = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlightLarge")
	title:SetPoint("TOP", 0, -18)
	title:SetText("Mount Collector Assistant")

	local subtitle = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
	subtitle:SetPoint("TOP", title, "BOTTOM", 0, -4)
	subtitle:SetText("BRIGGUL")

	local closeButton = CreateFrame("Button", nil, frame, "UIPanelCloseButton")
	closeButton:SetPoint("TOPRIGHT", -6, -6)

	local resizeHandle = CreateFrame("Button", nil, frame)
	resizeHandle:SetSize(140, 14)
	resizeHandle:SetPoint("BOTTOM", 0, 0)
	resizeHandle:RegisterForDrag("LeftButton")
	resizeHandle:SetScript("OnMouseDown", function()
		frame:StartSizing("BOTTOM")
	end)
	resizeHandle:SetScript("OnMouseUp", function()
		frame:StopMovingOrSizing()
	end)

	local resizeText = resizeHandle:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	resizeText:SetPoint("CENTER")
	resizeText:SetText("Arrastra aqui para alto")

	local scrollFrame = CreateFrame("ScrollFrame", nil, frame, "UIPanelScrollFrameTemplate")
	scrollFrame:SetPoint("TOPLEFT", 18, -62)
	scrollFrame:SetPoint("BOTTOMRIGHT", -34, 94)

	local content = CreateFrame("Frame", nil, scrollFrame)
	content:SetSize(360, 1)
	scrollFrame:SetScrollChild(content)

	local statusLegend = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
	statusLegend:SetPoint("BOTTOMLEFT", 18, 86)
	statusLegend:SetPoint("RIGHT", -18, 86)
	statusLegend:SetJustifyH("LEFT")
	statusLegend:SetText(BuildLegendText())

	local counters = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
	counters:SetPoint("BOTTOMLEFT", 18, 52)
	counters:SetPoint("RIGHT", -18, 52)
	counters:SetJustifyH("LEFT")
	counters:SetJustifyV("TOP")
	counters:SetText("")

	local helpText = frame:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	helpText:SetPoint("BOTTOMLEFT", 18, 22)
	helpText:SetPoint("RIGHT", -18, 22)
	helpText:SetJustifyH("LEFT")
	helpText:SetText("Deteccion automatica por quest completada.")

	local refreshButton = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
	refreshButton:SetSize(120, 24)
	refreshButton:SetPoint("BOTTOM", 0, 6)
	refreshButton:SetText("Actualizar")
	refreshButton:SetScript("OnClick", function()
		UI:Refresh()
	end)

	self.frame = frame
	self.content = content
	self.counters = counters
	self.rows = {}
	self.emptyState = nil
	self.statusLegend = statusLegend
	self:Refresh()
end

function UI:CreateOrGetRow(index)
	if self.rows[index] then
		return self.rows[index]
	end

	local row = CreateFrame("Frame", nil, self.content)
	row:SetSize(332, 20)
	row:SetPoint("TOPLEFT", 0, -((index - 1) * 22))

	local text = row:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
	text:SetPoint("LEFT", 0, 0)
	text:SetPoint("RIGHT", 0, 0)
	text:SetJustifyH("LEFT")
	row.text = text

	self.rows[index] = row
	return row
end

function UI:HideUnusedRows(fromIndex)
	for index = fromIndex, #self.rows do
		self.rows[index]:Hide()
		self.rows[index].petName = nil
	end
end

function UI:Refresh()
	if not self.content then
		return
	end

	local model = BuildViewModel()

	if self.statusLegend then
		self.statusLegend:SetText(BuildLegendText())
	end

	if not model.isAvailable then
		if not self.emptyState then
			local emptyState = self.content:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
			emptyState:SetPoint("TOPLEFT", 0, 0)
			emptyState:SetPoint("RIGHT", 0, 0)
			emptyState:SetJustifyH("LEFT")
			emptyState:SetText(model.errorMessage or "Sin informacion disponible.")
			self.emptyState = emptyState
		else
			self.emptyState:SetText(model.errorMessage or "Sin informacion disponible.")
			self.emptyState:Show()
		end

		self:HideUnusedRows(1)
		self.content:SetHeight(40)

		if self.counters then
			self.counters:SetText("")
		end

		return
	end

	if self.emptyState then
		self.emptyState:Hide()
	end

	for index, pet in ipairs(model.pets) do
		local row = self:CreateOrGetRow(index)
		row.petName = pet.name
		row.text:SetText(BuildRowLabel(pet))
		row:Show()
	end

	self:HideUnusedRows(#model.pets + 1)

	local contentHeight = (#model.pets * 22) + 4
	self.content:SetHeight(contentHeight)

	if self.counters then
		self.counters:SetText(string.format(
			"Pendientes por mostrar: %d\nMostradas: %d / %d\nObtenidas: %d / %d",
			model.pendingShowCount,
			model.shownCount,
			model.totalCount,
			model.ownedCount,
			model.totalCount
		))
	end
end

function UI:ToggleMainFrame()
	if not self.frame then
		self:Initialize()
	end

	if self.frame:IsShown() then
		self.frame:Hide()
	else
		self:Refresh()
		self.frame:Show()
	end
end