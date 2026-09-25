export function Money({ copper }: { copper: number }) {
  const value = Math.max(0, Number(copper) || 0);
  const gold = Math.floor(value / 10_000);
  const silver = Math.floor((value % 10_000) / 100);

  return <span className="wow-money whitespace-nowrap"><b>{gold.toLocaleString()}</b><i aria-label="oro" className="wow-coin wow-coin-gold"/> <b>{silver}</b><i aria-label="plata" className="wow-coin wow-coin-silver"/></span>;
}

