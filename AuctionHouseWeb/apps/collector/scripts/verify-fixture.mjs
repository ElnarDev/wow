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

console.log('Fixture integration check passed.');
