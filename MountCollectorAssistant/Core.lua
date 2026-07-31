local ADDON_NAME, MCA = ...

_G.MCA = MCA

MCA.name = ADDON_NAME
MCA.version = "0.1.0"
MCA.slashToken = "MOUNTCOLLECTORASSISTANT"
MCA.slashRegistered = false

local function HandleSlashCommand()
    if MCA.UI and MCA.UI.ToggleMainFrame then
        MCA.UI:ToggleMainFrame()
    else
        print("|cffff4444[MCA]|r La interfaz no esta disponible.")
    end
end

local function RegisterSlashCommands()
    if MCA.slashRegistered then
        return
    end

    local slashToken = MCA.slashToken

    _G["SLASH_" .. slashToken .. "1"] = "/mca"
    _G["SLASH_" .. slashToken .. "2"] = "/mountcollectorassistant"
    _G["SLASH_" .. slashToken .. "3"] = "/mcollector"

    SlashCmdList[slashToken] = HandleSlashCommand
    MCA.slashRegistered = true
end

RegisterSlashCommands()

local frame = CreateFrame("Frame")

frame:RegisterEvent("ADDON_LOADED")
frame:RegisterEvent("PLAYER_LOGIN")

frame:SetScript("OnEvent", function(self, event, addonName)
    if event == "PLAYER_LOGIN" then
        RegisterSlashCommands()
        return
    end

    if addonName ~= ADDON_NAME then
        return
    end

    MCA_DB = MCA_DB or {}

    RegisterSlashCommands()

    if MCA.UI and MCA.UI.Initialize then
        MCA.UI:Initialize()
    end

    print("|cff00ff00[MCA]|r Mount Collector Assistant cargado.")
    print("|cff00ff00[MCA]|r Comandos: /mca, /mountcollectorassistant")

end)