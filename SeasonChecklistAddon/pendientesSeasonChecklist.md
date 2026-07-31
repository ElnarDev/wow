# Pendientes – SeasonChecklist Addon

## 1. IDs de logros reales (BLOQUEANTE)

Los `achievementID` en [Data/Achievements.lua](Data/Achievements.lua) son **placeholders** (40801, 40802, etc.).
Deben reemplazarse con los IDs reales una vez que Blizzard publique el cliente de Midnight.

**Cómo obtenerlos:**
- Buscar el logro en [Wowhead](https://www.wowhead.com) y extraer el ID de la URL: `/achievement=XXXXX`
- O usar el comando en el chat de WoW: `/run print(GetAchievementInfo(XXXXX))`
- Reemplazar cada entrada en `Data/Achievements.lua` → campo `achievementID`

---

## 2. Número de interfaz en el TOC

El archivo [SeasonChecklist.toc](SeasonChecklist.toc) tiene:
```
## Interface: 110200
```
Verificar y actualizar este número con la versión exacta del cliente de WoW Midnight en el momento del lanzamiento.  
Formato: `XXYYZZ` (ej. `110205` para 11.2.5).

---

## 3. Fuente personalizada (Media/fonts)

Los archivos Lua referencian:
```
Interface\\AddOns\\SeasonChecklist\\Media\\fonts\\expressway.ttf
```
La carpeta `Media/fonts/` **no existe aún** en el repositorio.

**Opciones:**
- A) Añadir una fuente `.ttf` libre de derechos (ej. `expressway.ttf`, `PT Sans`, etc.) en `Media/fonts/`.
- B) Reemplazar todas las referencias de fuente en `UI/MainFrame.lua` y `UI/CategoryRow.lua` por la fuente nativa de WoW:
  ```lua
  "Fonts\\FRIZQT__.TTF"
  ```
  para eliminar la dependencia externa completamente.

---

## 4. Pruebas en cliente

Una vez disponible el cliente de Midnight:

- [ ] Verificar que `GetAchievementInfo(id)` devuelve datos correctos para cada ID
- [ ] Confirmar que `AchievementFrame_SelectAchievement(id)` navega correctamente al logro
- [ ] Probar el evento `ACHIEVEMENT_EARNED` en tiempo real
- [ ] Validar que `LoadAddOn("Blizzard_AchievementUI")` sigue siendo la llamada correcta (puede cambiar entre expansiones)
- [ ] Comprobar el scroll con todas las categorías expandidas
- [ ] Verificar persistencia de categorías colapsadas entre sesiones (`SavedVariables`)

---

## 5. Iconos de categoría

Los iconos de categoría en `Data/Achievements.lua` usan texturas genéricas:
```lua
icon = "Interface\\Icons\\Achievement_Boss_Ragnaros"
```
Reemplazarlos con iconos más representativos de Midnight cuando estén disponibles en el cliente.

---

## 6. Añadir logros tipo "piedra angular resiliente" (+12 a +30)

En la propuesta original ([propuestaSeasonChecklist.md](../propuestaSeasonChecklist.md)) se mencionan logros de resiliencia:
> Todos los logros "Temporada 1 de Midnight: piedra angular resiliente +12 a +30"

Estos son múltiples logros escalonados. Pendiente agregarlos en la categoría `mythicplus` de `Data/Achievements.lua` una vez confirmados los IDs.

---

## 7. Títulos JcJ faltantes

Los siguientes títulos JcJ de la propuesta no tienen entrada en `Data/Achievements.lua` porque no se ha confirmado si tienen un `achievementID` propio o son parte del logro de rating:

- «Ensalmador de batalla»
- «Leyenda» / «Leyenda Galáctica»
- «Estratega»
- «Mariscal Galáctico»
- «Señor de la Guerra Galáctico»
- «Héroe de la Alianza: Galáctico»
- «Héroe de la Horda: Galáctico»

Verificar en el cliente si son logros independientes y añadirlos.

---

## 8. Juguetes JcJ pendientes

- **Grímpola de leyenda del Ocaso** – ligada a *Médico de Batiburrillo de solitarios: Midnight*
- **Grímpola de estratega del Ocaso** – ligada a *Médico de Campo de batalla relámpago: Midnight*

No incluidos aún porque se indica que se mantienen toda la expansión (no solo T1). Confirmar si aplican como recompensa de temporada.

---

## 9. Internacionalización adicional (opcional)

Actualmente solo existe `Locales/esES.lua`. Si se quiere soporte para otros idiomas:
- Crear `Locales/enUS.lua` con las cadenas en inglés
- Añadir detección de locale en `Core/Core.lua` con `GetLocale()`

---

## 10. Compatibilidad con addons de logros populares (opcional)

Evaluar integración opcional con:
- **Overachiever** – tooltip extendido de logros
- **Rarity** – si alguna montura también cae por drops trackeados

No es bloqueante, pero mejoraría la experiencia si el usuario tiene esos addons instalados.
