const collectorUrl = process.env.COLLECTOR_URL ?? 'http://127.0.0.1:3501';

async function getJson(path) {
  const response = await fetch(`${collectorUrl}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

const health = await getJson('/healthz');
if (health.status !== 'ready' || health.mode !== 'fixture') {
  throw new Error(`Expected a ready fixture collector, received ${JSON.stringify(health)}`);
}

const realms = await getJson('/api/realms');
if (realms.realms?.length !== 1 || Number(realms.realms[0].id) !== 0 || !realms.realms[0].isDefault) {
  throw new Error(`Fixture realm is invalid: ${JSON.stringify(realms)}`);
}

const armor = await getJson('/api/armor?realmId=0');
if (armor.count !== 7 || armor.total !== 7 || armor.items?.some((item) => Number(item.id) === 100003)) {
  throw new Error(`Fixture Armor aggregation is invalid: ${JSON.stringify(armor)}`);
}

const plateHeads = await getJson('/api/armor?realmId=0&subclasses=4&inventoryTypes=HEAD');
if (plateHeads.count !== 1 || Number(plateHeads.items[0]?.id) !== 100001) {
  throw new Error(`Fixture Plate/Head filter is invalid: ${JSON.stringify(plateHeads)}`);
}

for (const [path, itemId] of Object.entries({
  gems: 100020, enhancements: 100021, consumables: 100022, glyphs: 100023,
  'trade-goods': 100024, recipes: 100025, 'profession-equipment': 100026,
  housing: 100027, 'battle-pets': 100028, 'quest-items': 100029,
  miscellaneous: 100030, 'wow-token': 100031,
})) {
  const category = await getJson(`/api/${path}?realmId=0`);
  if (category.count !== 1 || Number(category.items?.[0]?.id) !== itemId) {
    throw new Error(`Fixture ${path} category is invalid: ${JSON.stringify(category)}`);
  }
}

console.log('Fixture integration check passed.');
