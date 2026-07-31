local _, MCA = ...

MCA.Pets = {}

local Pets = MCA.Pets

local MAX_PET_LEVEL = 25
local CHARACTER_FOLDS = {
	["á"] = "a",
	["à"] = "a",
	["ä"] = "a",
	["â"] = "a",
	["é"] = "e",
	["è"] = "e",
	["ë"] = "e",
	["ê"] = "e",
	["í"] = "i",
	["ì"] = "i",
	["ï"] = "i",
	["î"] = "i",
	["ó"] = "o",
	["ò"] = "o",
	["ö"] = "o",
	["ô"] = "o",
	["ú"] = "u",
	["ù"] = "u",
	["ü"] = "u",
	["û"] = "u",
	["ñ"] = "n",
}

local function NormalizeName(name)
	if not name then
		return nil
	end

	local normalized = string.lower(name)

	for sourceCharacter, targetCharacter in pairs(CHARACTER_FOLDS) do
		normalized = normalized:gsub(sourceCharacter, targetCharacter)
	end

	normalized = normalized:gsub("%s+", " ")

	return normalized
end

function Pets:NormalizeName(name)
	return NormalizeName(name)
end

function Pets:BuildOwnedSpeciesIndex()
	local ownedSpecies = {}

	if not C_PetJournal or not C_PetJournal.GetNumPets or not C_PetJournal.GetPetInfoByIndex then
		return ownedSpecies
	end

	local totalPets = C_PetJournal.GetNumPets()

	for index = 1, totalPets do
		local petID, speciesID, isOwned, customName, level, favorite, isRevoked, speciesName = C_PetJournal.GetPetInfoByIndex(index)

		if petID and speciesName and isOwned then
			local key = NormalizeName(speciesName)
			local currentLevel = level or 0
			local currentEntry = ownedSpecies[key]

			if not currentEntry or currentLevel > currentEntry.level then
				ownedSpecies[key] = {
					petID = petID,
					speciesID = speciesID,
					level = currentLevel,
					speciesName = speciesName,
					customName = customName,
					favorite = favorite,
					isMaxLevel = currentLevel >= MAX_PET_LEVEL,
				}
			end
		end
	end

	return ownedSpecies
end

function Pets:GetOwnedPetByName(speciesIndex, petName)
	if not speciesIndex or not petName then
		return nil
	end

	return speciesIndex[NormalizeName(petName)]
end