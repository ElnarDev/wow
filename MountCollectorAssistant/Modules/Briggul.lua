local _, MCA = ...

MCA.Briggul = {}

local Briggul = MCA.Briggul

local STATUS_SHOWN = "shown"
local STATUS_PENDING_SHOW = "pending_show"
local STATUS_LEVELING = "leveling"
local STATUS_MISSING = "missing"
local ICON_SHOWN = "|TInterface\\RaidFrame\\ReadyCheck-Ready:14:14:0:0|t"
local ICON_PENDING_SHOW = "|TInterface\\RaidFrame\\ReadyCheck-Waiting:14:14:0:0|t"
local ICON_LEVELING = "|TInterface\\COMMON\\Indicator-Yellow:14:14:0:0|t"
local ICON_MISSING = "|TInterface\\RaidFrame\\ReadyCheck-NotReady:14:14:0:0|t"

local function EnsureShownDB()
	MCA_DB = MCA_DB or {}
	MCA_DB.briggul = MCA_DB.briggul or {}
	MCA_DB.briggul.manualShownByPet = MCA_DB.briggul.manualShownByPet or {}

	return MCA_DB.briggul.manualShownByPet
end

local function IsQuestCompleted(questID)
	if not questID or not C_QuestLog or not C_QuestLog.IsQuestFlaggedCompleted then
		return false
	end

	return C_QuestLog.IsQuestFlaggedCompleted(questID) == true
end

local function BuildPetLine(pet)
	if pet.status == STATUS_SHOWN then
		return string.format("%s %s", ICON_SHOWN, pet.name)
	end

	if pet.status == STATUS_PENDING_SHOW then
		return string.format("%s %s", ICON_PENDING_SHOW, pet.name)
	end

	if pet.status == STATUS_LEVELING then
		return string.format("%s %s (Nivel %d)", ICON_LEVELING, pet.name, pet.level or 0)
	end

	return string.format("%s %s", ICON_MISSING, pet.name)
end

function Briggul:ScanPets()
	local trackedPets = MCA.Data and MCA.Data.BriggulPets or {}
	local speciesIndex = MCA.Pets:BuildOwnedSpeciesIndex()
	local shownDB = EnsureShownDB()
	local results = {
		pets = {},
		shownCount = 0,
		pendingShowCount = 0,
		levelingCount = 0,
		missingCount = 0,
		ownedCount = 0,
		totalCount = #trackedPets,
	}

	for _, petData in ipairs(trackedPets) do
		local ownedPet = MCA.Pets:GetOwnedPetByName(speciesIndex, petData.name)
		local petKey = MCA.Pets:NormalizeName(petData.name)
		local manualShown = petKey and shownDB[petKey] == true
		local questShown = IsQuestCompleted(petData.questID)
		local wasShown = questShown
		local entry = {
			name = petData.name,
			key = petKey,
			questID = petData.questID,
			isQuestCompleted = questShown,
			isManualShown = manualShown,
			status = STATUS_MISSING,
			level = 0,
			canToggleShown = false,
		}

		if wasShown then
			entry.status = STATUS_SHOWN
			results.shownCount = results.shownCount + 1
			results.ownedCount = results.ownedCount + 1
		elseif ownedPet then
			entry.level = ownedPet.level or 0
			results.ownedCount = results.ownedCount + 1

			if ownedPet.isMaxLevel then
				entry.status = STATUS_PENDING_SHOW
				results.pendingShowCount = results.pendingShowCount + 1
			else
				entry.status = STATUS_LEVELING
				results.levelingCount = results.levelingCount + 1
			end
		else
			results.missingCount = results.missingCount + 1
		end

		entry.line = BuildPetLine(entry)
		table.insert(results.pets, entry)
	end

	return results
end

function Briggul:GetViewModel()
	if not C_PetJournal then
		return {
			isAvailable = false,
			errorMessage = "La API de mascotas no esta disponible en este cliente.",
			pets = {},
			shownCount = 0,
			pendingShowCount = 0,
			levelingCount = 0,
			missingCount = 0,
			ownedCount = 0,
			totalCount = 0,
		}
	end

	local result = self:ScanPets()
	result.isAvailable = true
	return result
end

function Briggul:ToggleShown(petName)
	return false
end

function Briggul:GetLegend()
	return {
		shown = string.format("%s Mostrada", ICON_SHOWN),
		pending = string.format("%s Pendiente", ICON_PENDING_SHOW),
		leveling = string.format("%s Falta subir", ICON_LEVELING),
		missing = string.format("%s No obtenida", ICON_MISSING),
	}
end