import { blizzardApi } from '../blizzard/client.mjs';
import { region } from '../config.mjs';
import { pool } from '../database.mjs';

export async function collectWowToken(accessToken) {
  const data = await blizzardApi(`/data/wow/token/index?namespace=dynamic-${region}&locale=en_US`, accessToken);
  const priceCopper = Number(data.price);
  if (!Number.isSafeInteger(priceCopper) || priceCopper <= 0) {
    throw new Error('Blizzard returned an invalid WoW Token price');
  }

  const timestamp = Number(data.last_updated_timestamp);
  const providerUpdatedAt = Number.isFinite(timestamp) ? new Date(timestamp) : null;
  await pool.query(
    'INSERT INTO wow_token_snapshots (price_copper,provider_updated_at) VALUES ($1,$2)',
    [priceCopper, providerUpdatedAt],
  );
}
