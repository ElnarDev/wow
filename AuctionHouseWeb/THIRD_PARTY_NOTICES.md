# Third-party data

## ItemVersion

The item-to-expansion classification used by the Era filter is loaded from
[ItemVersion](https://github.com/t-mart/ItemVersion), copyright Tim Martin and
licensed under the GNU General Public License v3.0.

The application reads ItemVersion's generated `ItemData.lua` dataset and stores
only the resulting expansion identifier for auction items already present in
the local database. ItemVersion remains the authoritative source for this
classification and its community corrections.

## Wowhead tooltips

Item links use Wowhead's documented, remotely hosted tooltip integration to
display localized World of Warcraft item details. The application sends the
public item ID and auction bonus IDs to `wow.zamimg.com` when tooltips load.
The Wowhead script is not copied into or redistributed with this repository.

## TradeSkillMaster BonusIdTool

Effective item levels are calculated with the JavaScript algorithm and generated
game-data format from [TradeSkillMaster BonusIdTool](https://github.com/TradeSkillMaster/BonusIdTool),
copyright TradeSkillMaster LLC and licensed under the MIT License. A copy of the
license is included beside the vendored calculator and generated data. The
checked-in dataset records its source World of Warcraft build number.
