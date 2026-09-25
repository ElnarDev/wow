'use client';

import type { Locale, WowTokenData } from '../types';
import { Money } from './money';
import { PriceHistoryChart } from './price-history-chart';

type WowTokenViewProps = {
  data: WowTokenData | null;
  loading: boolean;
  locale: Locale;
  onBack: () => void;
};

export function WowTokenView({ data, loading, locale, onBack }: WowTokenViewProps) {
  const spanish = locale === 'es-MX';
  return <div className="absolute inset-0 z-20 overflow-y-auto bg-[#151211] p-4">
    <div className="mx-auto max-w-3xl">
      <button onClick={onBack} className="mb-3 rounded border border-[#d07140] bg-gradient-to-b from-[#b10d0d] to-[#680000] px-10 py-1 text-[13px] text-[#ffe759]">{spanish ? 'Volver' : 'Back'}</button>
      <div className="rounded border border-[#4d453f] bg-[#211d1b] p-4">
        <div className="flex items-center gap-4 border-b border-[#413b36] pb-4"><span className="grid size-14 place-items-center rounded-full border-2 border-[#a99f91] bg-[#171413] text-2xl text-[#f0d64c]">W</span><h1 className="text-2xl text-[#18c9ff]">{spanish ? 'Ficha de WoW' : 'WoW Token'}</h1></div>
        {loading ? <p className="py-10 text-center text-[#b5aea4]">{spanish ? 'Cargando…' : 'Loading…'}</p> : data?.latest ? <>
          <section className="py-5">
            <h2 className="mb-3 border-b border-[#413b36] pb-2 text-[#e6ca68]">{spanish ? 'Estadísticas base' : 'Base stats'}</h2>
            <dl className="mx-auto grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-[13px]">
              <dt className="text-right text-[#e6ca68]">{spanish ? 'Actual' : 'Current'}</dt><dd><Money copper={data.latest.currentCopper}/></dd>
              <dt className="text-right text-[#e6ca68]">{spanish ? 'Actualizado' : 'Updated'}</dt><dd>{new Date(data.latest.updatedAt).toLocaleString(locale)}</dd>
              <dt className="text-right text-[#e6ca68]">{spanish ? 'Mediana (14 días)' : 'Median (14 days)'}</dt><dd>{data.stats.medianCopper == null ? '—' : <Money copper={data.stats.medianCopper}/>}</dd>
              <dt className="text-right text-[#e6ca68]">{spanish ? 'Media (14 días)' : 'Mean (14 days)'}</dt><dd>{data.stats.meanCopper == null ? '—' : <Money copper={data.stats.meanCopper}/>}</dd>
            </dl>
          </section>
          <section><h2 className="mb-3 border-b border-[#413b36] pb-2 text-[#e6ca68]">{spanish ? 'Historial de 14 días' : '14-day history'}</h2><PriceHistoryChart points={data.points} locale={locale}/></section>
        </> : <p className="py-10 text-center text-[#b5aea4]">{spanish ? 'El precio oficial de la Ficha de WoW aún no está disponible.' : 'Official WoW Token pricing is not available yet.'}</p>}
      </div>
    </div>
  </div>;
}
