# Auditoría funcional de Undermine Exchange

Fecha de revisión: 2026-09-17.

## Alcance y limitación de la revisión

Se revisaron la web pública, su documentación de API y los repositorios abiertos `shatari-front` y `shatari`. La portada pública se encontraba en mantenimiento durante la revisión, por lo que la interacción visual completa no estuvo disponible. El inventario funcional se contrastó con la implementación TypeScript/SCSS que alimenta el sitio. No se inició sesión ni se intentó eludir funciones de Patreon.

## Flujo principal observado

1. Seleccionar región/reino.
2. Elegir categoría, subcategoría y filtro de tercer nivel.
3. Introducir texto opcional y filtros avanzados.
4. Ejecutar Search; la URL conserva el estado para compartir o restaurar la vista.
5. Ordenar resultados y abrir un objeto.
6. Examinar subastas actuales, métricas, históricos, mapas de calor y comparación regional.

El sitio limita la lista visible a 500 resultados, mantiene preferencias en `localStorage` y carga los datos de detalle solamente cuando se abre un objeto.

## Inventario de búsqueda

| Función | Comportamiento observado | Decisión para nuestro producto |
| --- | --- | --- |
| Selector de reino | Agrupa y localiza reinos; recuerda la preferencia. | Ya iniciado. Mostrar estado `indexado`, `desactualizado` o `sin datos`. |
| Árbol de categorías | Tres niveles, selección exclusiva y URL serializada. | Replicar exactamente desde una taxonomía versionada. |
| Búsqueda por nombre | Sugerencias, Enter y botón Search. | Ejecutar en servidor con búsqueda normalizada e índice trigram. |
| Favoritos | Lista local y búsqueda exclusiva de favoritos. | Añadir después del detalle; `localStorage`, sin cuenta. |
| Deals | Vista especial de oportunidades. | Posponer hasta definir una métrica explicable y comprobable. |
| Nivel, rareza y expansión | Filtros avanzados. | Requieren ampliar metadatos estáticos del item. |
| Ignorar variedades | Agrupa variantes bajo el item base. | Ofrecer `Agrupado` y `Por variante`; agrupado por defecto. |
| Solo bajo precio de vendedor | Detecta compras revendibles a NPC. | Útil y barato cuando guardemos `vendor_sell_price`. |
| Incluir agotados | Conserva último precio y fecha vista. | Implementar cuando tengamos suficiente historial. |
| Mediana regional | Columna opcional para comparar el reino. | Prioridad alta después de indexar mercados piloto. |
| Arbitrage Mode | Busca mínimo regional y porcentaje de mercados con stock. | Fase posterior; requiere cobertura regional suficiente. |
| Ordenamiento | Encabezados ordenables; precio como orden normal. | Hacerlo en servidor para listas grandes. |
| Copiar nombre | Ctrl+C sobre una fila. | Mejora pequeña y barata. |

## Vista de detalle observada

El detalle se divide en dos áreas: centro analítico con desplazamiento propio y lista de subastas actuales a la derecha. Sus secciones, en orden predeterminado, son:

1. `base-stats`: disponible, último visto, precio actual, mediana, media y precios de vendedor.
2. `snapshots`: gráfico combinado de precio y cantidad; aproximadamente 14 días con resolución horaria.
3. `heat`: mapas por día/hora para precio y cantidad de la última semana.
4. `daily`: histórico diario de largo plazo.
5. `bulk`: calculadora de costo para comprar una cantidad, consumiendo los escalones de precio más baratos.
6. `regional-daily`: cantidad total y precio promedio diario regional.
7. `other-realms`: barras y tabla de precios/cantidades actuales por connected realm.

También incluye:

- Nombre, calidad, icono, modelo y enlace a Wowhead.
- Favorito por item/variante.
- Navegación Back que conserva la búsqueda anterior.
- Estadísticas terciarias con iconos.
- Variantes por nivel de objeto y sufijo.
- Lista regional con enlace directo a la misma variante en otro reino.
- Reordenamiento de secciones guardado localmente.
- Indicador inicial que enseña que el panel central se puede desplazar.
- URLs profundas para búsqueda, categoría, reino y detalle.

## Métricas y reglas que debemos conservar

- Diferenciar `snapshot` de Blizzard, hora de procesamiento y `last seen`.
- Precio actual significa el menor precio disponible, no precio de venta realizada.
- Mediana histórica y media histórica no son intercambiables.
- El gráfico diario usa la captura de mayor cantidad del día y el precio de esa captura.
- La comparación regional opera por connected realm, no por cada nombre de reino visible.
- Los commodities son regionales; Armor es no-commodity y pertenece a connected realms.
- Variantes deben permanecer separadas por una clave estable; agruparlas debe ser una elección visible.
- Los gráficos recortan visualmente outliers, pero los datos originales no deben descartarse.

## Mejoras propuestas sobre Undermine

### Rendimiento

- API paginada y filtrada en servidor; nunca crear miles de filas DOM.
- Virtualización de filas para desplazamiento continuo.
- Respuesta de lista ligera y endpoint de detalle separado.
- Agregados precomputados para `item`, `variante`, `reino` y `día`.
- Inserción masiva en PostgreSQL, ya aplicada al colector de variantes.
- Índices por `(connected_realm_id, snapshot)`, `item_id`, `variant_id`, precio y estadísticas terciarias.
- Compresión HTTP, ETag y `If-None-Match` para resultados que no cambiaron.
- Cache LRU en el proceso local para detalles consultados recientemente.
- Carga diferida de gráficos: renderizar cada sección al aproximarse al viewport.
- Importación dinámica de la biblioteca de gráficos solo al abrir un detalle.
- Reducir puntos para gráficas largas con downsampling, sin alterar estadísticas.
- No sincronizar el catálogo completo de reinos en cada captura; refrescarlo diariamente.

### Experiencia

- Mostrar explícitamente frescura y estado de cobertura de cada reino.
- Conservar resultados mientras carga un detalle, usando panel lateral en escritorio y vista completa en móvil.
- Comparar variantes con etiquetas legibles, no bonus IDs crudos.
- Explicar por qué una oportunidad parece barata y mostrar tamaño de muestra.
- Permitir compartir una URL completa sin depender de estado oculto del navegador.
- Accesibilidad de teclado, foco visible, encabezados de tabla correctos y gráficos con resumen textual.
- Diseño responsive que mantenga tabla o tarjetas útiles, sin reducir texto esencial por debajo de 12 px.

## Arquitectura recomendada para el detalle

### Endpoint de resumen

`GET /api/armor?realmId=&q=&subclass=&inventoryType=&bonusStat=&sort=&cursor=&limit=`

Devuelve filas ligeras, estado de paginación y timestamp de la captura. No incluye bonus lists completos ni históricos.

### Endpoint de detalle

`GET /api/armor/:itemId?realmId=&variantKey=`

Devuelve:

- metadatos del item;
- resumen del connected realm;
- variantes y sus indicadores legibles;
- escalones actuales de precio/cantidad;
- captura y última vez visto;
- resumen regional disponible en mercados indexados.

### Endpoints históricos

- `GET /api/armor/:itemId/history?realmId=&variantKey=&resolution=hour|day`
- `GET /api/armor/:itemId/realms?variantKey=`

Separarlos evita cargar años de datos al abrir el panel y permite cachearlos de manera independiente.

## Roadmap priorizado

### Fase 1: detalle utilizable

- Clic en fila, Back y URL profunda.
- Metadatos, métricas actuales, frescura y variantes.
- Escalones de precio y calculadora de cantidad.
- Paginación/ordenamiento en servidor.

### Fase 2: histórico local

- Capturas horarias retenidas.
- Gráfico de precio/cantidad de 14 días.
- Agregados diarios y último visto.
- Política de retención y limpieza.

### Fase 3: comparación por reino

- Area 52 más 3–5 connected realms piloto.
- Precio, cantidad, mediana y frescura comparables.
- Tabla y barras regionales.
- Ampliación gradual solo cuando el colector cumpla su ventana.

### Fase 4: inteligencia explicable

- Mediana regional, favoritos y alertas locales.
- Señales de oportunidad con fórmula visible.
- Arbitrage Mode únicamente con cobertura regional suficiente.
- Mapas de calor y reordenamiento de secciones.

## Próximo incremento recomendado

Implementar Fase 1 como una división de tres paneles semejante a la casa de subastas: categorías a la izquierda, información analítica en el centro y escalones actuales de precio a la derecha. El primer corte debe incluir paginación y un endpoint de detalle; añadir gráficos antes de eso trasladaría demasiados datos y ralentizaría la interfaz.

## Fuentes

- [Undermine Exchange](https://undermine.exchange/)
- [Documentación de su API](https://undermine.exchange/api.html)
- [Frontend abierto Project Shatari](https://github.com/erorus/shatari-front)
- [Backend abierto Project Shatari](https://github.com/erorus/shatari)
