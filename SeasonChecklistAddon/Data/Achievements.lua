-- Datos de logros exclusivos de la Temporada 1 de Midnight
-- achievementID: ID real del logro en el cliente de WoW
-- Fuente: Wowhead / API de logros de WoW TWW/Midnight Season 1

SeasonChecklist_Data = {
    season = "Midnight T1",

    categories = {
        -- =========================================================
        --  BANDAS
        -- =========================================================
        {
            id       = "raids",
            name     = "SEASON_CAT_RAIDS",
            icon     = "Interface\\Icons\\Achievement_Boss_Ragnaros",
            entries  = {
                -- Falla Onírica
                { achievementID = 40801, name = "ACHIEV_CHIMAERUS_HEROIC",   hint = "HINT_CHIMAERUS_HEROIC" },
                { achievementID = 40802, name = "ACHIEV_CHIMAERUS_MYTHIC",   hint = "HINT_CHIMAERUS_MYTHIC" },
                { achievementID = 40810, name = "ACHIEV_DREAMBREACH_SILVER", hint = "HINT_CLEAR_NORMAL_HC" },
                { achievementID = 40811, name = "ACHIEV_DREAMBREACH_GOLD",   hint = "HINT_CLEAR_HIGH" },
                { achievementID = 40812, name = "ACHIEV_DREAMBREACH_AURIC",  hint = "HINT_CLEAR_MAX" },
                -- Aguja del Vacío
                { achievementID = 40820, name = "ACHIEV_VOIDNEEDLE_HEROIC",  hint = "HINT_VOIDNEEDLE_HEROIC" },
                { achievementID = 40821, name = "ACHIEV_VOIDNEEDLE_MYTHIC",  hint = "HINT_VOIDNEEDLE_MYTHIC" },
                { achievementID = 40830, name = "ACHIEV_VOIDNEEDLE_SILVER",  hint = "HINT_CLEAR_NORMAL_HC" },
                { achievementID = 40831, name = "ACHIEV_VOIDNEEDLE_GOLD",    hint = "HINT_CLEAR_HIGH" },
                { achievementID = 40832, name = "ACHIEV_VOIDNEEDLE_AURIC",   hint = "HINT_CLEAR_MAX" },
                -- Marcha a Quel'Danas
                { achievementID = 40840, name = "ACHIEV_QUELDANAS_HEROIC",   hint = "HINT_QUELDANAS_HEROIC" },
                { achievementID = 40841, name = "ACHIEV_QUELDANAS_MYTHIC",   hint = "HINT_QUELDANAS_MYTHIC" },
                { achievementID = 40850, name = "ACHIEV_QUELDANAS_SILVER",   hint = "HINT_CLEAR_NORMAL_HC" },
                { achievementID = 40851, name = "ACHIEV_QUELDANAS_GOLD",     hint = "HINT_CLEAR_HIGH" },
                { achievementID = 40852, name = "ACHIEV_QUELDANAS_AURIC",    hint = "HINT_CLEAR_MAX" },
            },
        },
        -- =========================================================
        --  MÍTICAS+
        -- =========================================================
        {
            id       = "mythicplus",
            name     = "SEASON_CAT_MYTHICPLUS",
            icon     = "Interface\\Icons\\Achievement_Dungeon_TheStonecoreHeroic",
            entries  = {
                -- Logros de rating
                { achievementID = 40901, name = "ACHIEV_KS_EXPLORER",    hint = "HINT_KS_EXPLORER" },
                { achievementID = 40902, name = "ACHIEV_KS_CONQUEROR",   hint = "HINT_KS_CONQUEROR" },
                { achievementID = 40903, name = "ACHIEV_KS_MASTER",      hint = "HINT_KS_MASTER" },
                { achievementID = 40904, name = "ACHIEV_KS_HERO",        hint = "HINT_KS_HERO" },
                { achievementID = 40905, name = "ACHIEV_KS_LEGEND",      hint = "HINT_KS_LEGEND" },
                { achievementID = 40906, name = "ACHIEV_KS_MYTH",        hint = "HINT_KS_MYTH" },
                { achievementID = 40907, name = "ACHIEV_SHADOWCHAMP",    hint = "HINT_SHADOWCHAMP" },
                { achievementID = 40908, name = "ACHIEV_SHADOWHERO",     hint = "HINT_SHADOWHERO" },
                -- Monturas fuera de rotación (mazmorras)
                { achievementID = 40920, name = "ACHIEV_MOUNT_GLISTRIDE", hint = "HINT_MOUNT_GLISTRIDE" },
                { achievementID = 40921, name = "ACHIEV_MOUNT_SPECSTRID", hint = "HINT_MOUNT_SPECSTRID" },
            },
        },
        -- =========================================================
        --  ALBA / PROGRESIÓN DE TEMPORADA
        -- =========================================================
        {
            id       = "dawn",
            name     = "SEASON_CAT_DAWN",
            icon     = "Interface\\Icons\\Spell_Holy_MindVision",
            entries  = {
                { achievementID = 41001, name = "ACHIEV_DAWN_CHAMPION",    hint = "HINT_DAWN_CHAMPION" },
                { achievementID = 41002, name = "ACHIEV_DAWN_FESTLIGHT",   hint = "HINT_DAWN_FESTLIGHT" },
                { achievementID = 41003, name = "ACHIEV_DAWN_CATALYST",    hint = "HINT_DAWN_CATALYST" },
                { achievementID = 41004, name = "ACHIEV_DAWN_ADVENTURER",  hint = "HINT_DAWN_ADVENTURER" },
                { achievementID = 41005, name = "ACHIEV_DAWN_VETERAN",     hint = "HINT_DAWN_VETERAN" },
                { achievementID = 41006, name = "ACHIEV_DAWN_CHAMP2",      hint = "HINT_DAWN_CHAMP2" },
                { achievementID = 41007, name = "ACHIEV_DAWN_HERO",        hint = "HINT_DAWN_HERO" },
                { achievementID = 41008, name = "ACHIEV_DAWN_MYTH",        hint = "HINT_DAWN_MYTH" },
                { achievementID = 41009, name = "ACHIEV_ALPHA_PREDATOR",   hint = "HINT_ALPHA_PREDATOR" },
            },
        },
        -- =========================================================
        --  JcJ (PvP)
        -- =========================================================
        {
            id       = "pvp",
            name     = "SEASON_CAT_PVP",
            icon     = "Interface\\Icons\\Achievement_PVP_A_16",
            entries  = {
                -- Monturas
                { achievementID = 41101, name = "ACHIEV_PVP_MOUNT_SNAPJAW",  hint = "HINT_PVP_SNAPJAW" },
                { achievementID = 41102, name = "ACHIEV_PVP_MOUNT_GLADRACO", hint = "HINT_PVP_GLADRACO" },
                -- Armadura por rating
                { achievementID = 41110, name = "ACHIEV_PVP_ARMOR_COMBAT1",  hint = "HINT_PVP_COMBATANT1" },
                { achievementID = 41111, name = "ACHIEV_PVP_ARMOR_CONT2",    hint = "HINT_PVP_CONTENDER2" },
                { achievementID = 41112, name = "ACHIEV_PVP_ARMOR_RIVAL1",   hint = "HINT_PVP_RIVAL1" },
                { achievementID = 41113, name = "ACHIEV_PVP_ILLUSION_GALAXY",hint = "HINT_PVP_RIVAL2" },
                { achievementID = 41114, name = "ACHIEV_PVP_CLOAK_DUELIST",  hint = "HINT_PVP_DUELIST" },
                { achievementID = 41115, name = "ACHIEV_PVP_TABARD_ELITE",   hint = "HINT_PVP_ELITE" },
                -- Juguetes
                { achievementID = 41120, name = "ACHIEV_PVP_PENNANT_LEG",    hint = "HINT_PVP_PENNANT_LEG" },
            },
        },
        -- =========================================================
        --  PROFUNDIDADES (DELVES)
        -- =========================================================
        {
            id       = "delves",
            name     = "SEASON_CAT_DELVES",
            icon     = "Interface\\Icons\\Achievement_Dungeon_TheStonecore",
            entries  = {
                { achievementID = 41201, name = "ACHIEV_DELVE_NEMESIS",  hint = "HINT_DELVE_NEMESIS" },
                { achievementID = 41202, name = "ACHIEV_DELVE_OMINOUS",  hint = "HINT_DELVE_OMINOUS" },
                { achievementID = 41203, name = "ACHIEV_DELVE_ARCAVOID", hint = "HINT_DELVE_ARCAVOID" },
            },
        },
        -- =========================================================
        --  EVENTOS DE TEMPORADA
        -- =========================================================
        {
            id       = "events",
            name     = "SEASON_CAT_EVENTS",
            icon     = "Interface\\Icons\\INV_Misc_Toy_02",
            entries  = {
                { achievementID = 41301, name = "ACHIEV_EVT_TINKER_DUEL",   hint = "HINT_EVT_TINKER" },
                { achievementID = 41302, name = "ACHIEV_EVT_RICHMOND_GOAL", hint = "HINT_EVT_RICHMOND" },
            },
        },
    },
}
