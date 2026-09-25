import { blizzardApi } from '../blizzard/client.mjs';
import { region } from '../config.mjs';
import { pool } from '../database.mjs';
import { expansionForItemId } from './item-era.mjs';

const qualityRanks = {
  POOR: 0,
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
  ARTIFACT: 6,
  HEIRLOOM: 7,
  WOW_TOKEN: 8,
};

export async function getItemMetadata(itemId, accessToken) {
  const cached = await pool.query(
    'SELECT id,name,item_class_id AS "itemClassId",item_subclass_id AS "itemSubclassId",inventory_type AS "inventoryType",item_level AS "itemLevel",quality_type AS "qualityType",expansion_id AS "expansionId" FROM items WHERE id=$1',
    [itemId],
  );
  if (cached.rowCount && cached.rows[0].itemLevel !== null && cached.rows[0].qualityType) {
    return cached.rows[0];
  }

  let item;
  try {
    item = await blizzardApi(`/data/wow/item/${itemId}?namespace=static-${region}&locale=en_US`, accessToken);
  } catch (error) {
    if (error.message.includes('Blizzard API failed: 404')) return null;
    throw error;
  }

  const row = {
    id: item.id,
    name: item.name,
    itemClassId: item.item_class?.id ?? -1,
    itemSubclassId: item.item_subclass?.id ?? null,
    inventoryType: item.inventory_type?.type ?? null,
    itemLevel: item.level ?? null,
    requiredLevel: item.required_level ?? null,
    qualityType: item.quality?.type ?? null,
    qualityRank: qualityRanks[item.quality?.type] ?? null,
    expansionId: expansionForItemId(item.id),
  };

  await pool.query(
    `INSERT INTO items (id,name,item_class_id,item_subclass_id,inventory_type,item_level,required_level,quality_type,quality_rank,expansion_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,item_class_id=EXCLUDED.item_class_id,item_subclass_id=EXCLUDED.item_subclass_id,inventory_type=EXCLUDED.inventory_type,item_level=EXCLUDED.item_level,required_level=EXCLUDED.required_level,quality_type=EXCLUDED.quality_type,quality_rank=EXCLUDED.quality_rank,expansion_id=EXCLUDED.expansion_id,metadata_fetched_at=NOW()`,
    [row.id, row.name, row.itemClassId, row.itemSubclassId, row.inventoryType, row.itemLevel, row.requiredLevel, row.qualityType, row.qualityRank, row.expansionId],
  );
  return row;
}
