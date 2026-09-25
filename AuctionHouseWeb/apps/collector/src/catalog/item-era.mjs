const itemVersionUrl = 'https://raw.githubusercontent.com/t-mart/ItemVersion/refs/heads/master/src/ItemVersion/ItemData.lua';

let itemEraRanges = [];

function parseLuaNumberArray(source, name) {
  const match = source.match(new RegExp(`Private\\.${name}\\s*=\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`ItemVersion data is missing ${name}`);
  return match[1].split(',').map(Number);
}

export function hasItemEraData() {
  return itemEraRanges.length > 0;
}

export function expansionForItemId(itemId) {
  let low = 0;
  let high = itemEraRanges.length - 1;
  let candidate = null;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = itemEraRanges[middle];
    if (range.start <= itemId) {
      candidate = range;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return candidate && itemId <= candidate.end ? candidate.expansionId : null;
}

export async function syncItemEraData(pool) {
  if (hasItemEraData()) return;

  const response = await fetch(itemVersionUrl, { headers: { 'user-agent': 'AuctionHouseWeb/0.1' } });
  if (!response.ok) throw new Error(`ItemVersion download failed: ${response.status}`);

  const source = await response.text();
  const deltas = parseLuaNumberArray(source, 'runStartDeltas');
  const lengths = parseLuaNumberArray(source, 'runLengths');
  const versionIds = parseLuaNumberArray(source, 'runVersions');
  const versionLine = source.match(/Private\.versionIdToVersion\s*=\s*\{(.+)\}/)?.[1];

  if (!versionLine || deltas.length !== lengths.length || deltas.length !== versionIds.length) {
    throw new Error('ItemVersion data has an unexpected format');
  }

  const versions = [...versionLine.matchAll(/\{([^{}]+)\}/g)]
    .map((match) => match[1].split(',').map(Number));
  let cursor = 0;
  itemEraRanges = deltas.map((delta, index) => {
    const start = cursor + delta;
    cursor = start + lengths[index];
    return {
      start,
      end: cursor - 1,
      expansionId: (versions[versionIds[index]]?.[0] ?? 1) - 1,
    };
  });

  const items = await pool.query('SELECT id FROM items');
  const updates = items.rows
    .map(({ id }) => ({ id, expansion_id: expansionForItemId(Number(id)) }))
    .filter((item) => item.expansion_id !== null);

  for (let offset = 0; offset < updates.length; offset += 5000) {
    await pool.query(
      `UPDATE items SET expansion_id=data.expansion_id
       FROM jsonb_to_recordset($1::JSONB) AS data(id BIGINT,expansion_id INTEGER)
       WHERE items.id=data.id`,
      [JSON.stringify(updates.slice(offset, offset + 5000))],
    );
  }
}
