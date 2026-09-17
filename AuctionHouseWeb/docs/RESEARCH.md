# Investigación técnica y de producto

## Conclusión

Es viable construir un MVP de precios de Armor sin web scraping. La API oficial de Blizzard proporciona los listados activos por *connected realm*, y el endpoint de Item aporta la clase/subclase para filtrar Armor. El selector puede listar todos los reinos US desde el índice oficial. La dificultad real es que comparar un item en todos los mercados exige descargar una instantánea completa de cada *connected realm*: no existe una consulta oficial de precio por item y realm.

## Fuente de datos: Blizzard Game Data API

| Necesidad | Endpoint / mecanismo | Uso en MVP |
| --- | --- | --- |
| Autorización de servidor | OAuth 2.0 `client_credentials` | Obtener token de corta duración con `client_id`/`client_secret` sólo en el colector. |
| Descubrir mercado | Connected Realm / Realm APIs | Convertir la selección de hermandad a `connectedRealmId`; un reino conectado comparte subastas no commodity. |
| Subastas de equipo | `GET /data/wow/connected-realm/{connectedRealmId}/auctions` con `namespace=dynamic-{region}` | Fuente de listados activos de Armor. |
| Commodities regionales | `GET /data/wow/auctions/commodities` | No se usa aún. Está separado regionalmente de las subastas de equipo. |
| Datos de item | `GET /data/wow/item/{itemId}` con `namespace=static-{region}` | Nombre, `item_class`, subclase, calidad, inventario y enlace de media. |
| Icono | `GET /data/wow/media/item/{itemId}` | URL de icono; cachear y servir con allowlist. |
| Selector US | `GET /data/wow/realm/index` y `GET /data/wow/connected-realm/index` con namespace `dynamic-us` | Generar y refrescar la lista local de reinos US; resolverlos a su mercado conectado. |

La documentación/foros oficiales advierten que las respuestas de subastas pueden superar 10 MB y que la frecuencia de actualización puede cambiar. El colector debe tratar la respuesta como una instantánea, no como un stream de eventos ni una consulta por nombre. Desde el cambio comunicado por Blizzard, los no-commodities siguen por connected realm y commodities se publican regionalmente; por eso Armor debe empezar por el primer endpoint.

### Qué significa «Armor» para el filtro

La clasificación de objetos usa ID numérico: Armor es clase `4`. Las subclases y `inventory_type` distinguen Cloth, Leather, Mail, Plate, Shields y ranuras. La UI debe basarse en IDs/enum devueltos por API, no en cadenas en inglés, para poder cambiar locale sin romper filtros. Algunos objetos no equipables pueden caer en la clase; el MVP los muestra bajo «otros» o los excluye mediante una regla explícita y testeada, nunca con una lista manual de nombres.

### Limitaciones funcionales importantes

- La API es una fotografía de listados activos. No prueba que se haya vendido algo ni permite calcular volumen de ventas exacto.
- No es una API de precio por ítem: hay que descargar el conjunto de subastas y agregar localmente.
- Un ID base puede tener bonus, contexto, nivel de mascota, modificaciones u otros datos que cambian su valor. No se deben mezclar silenciosamente en recomendaciones.
- La frescura efectiva es `ahora - source_last_modified`, no el reloj de la petición web.
- Los datos de commodity no son equivalentes al mercado por realm; no mezclar ambos en una misma métrica.
- «Todos los reinos» no significa una subasta independiente por cada nombre: varios comparten un *connected realm*. La comparativa y el colector operan por ese ID de mercado.

## Evaluación de alternativas

| Alternativa | Resultado | Decisión |
| --- | --- | --- |
| Scraping FlippingPal/Undermine Exchange | Puede romperse, sus condiciones/licencias no quedan cubiertas, y duplica una fuente ya disponible. | Rechazado para MVP. |
| Scraping de la UI de juego o addon escáner | Requiere jugadores conectados, introduce automatización y mantenimiento de cliente. | Fuera de MVP; evaluar sólo si se necesita información que la API oficial no da. |
| APIs de terceros de economía | Pueden aportar históricos o señales, pero añaden cuotas, licencias y dependencia. | No bloquear el MVP; analizar contrato antes de integrar. |
| API oficial Blizzard | Autorizada, mantenida por el editor y suficiente para precios de listados actuales. | Fuente única inicial. |

Esto no afirma que las alternativas sean ilegales; significa que no son necesarias ni se han validado sus permisos para este proyecto. Nunca extraeremos HTML, imágenes, endpoints internos ni bases de datos de los sitios de referencia.

## Infraestructura y operación

### Opción seleccionada para empezar

El entorno inicial será la máquina local del propietario con Docker Desktop: PostgreSQL persistente, servidor Next.js y proceso colector. Mantiene costos cero, facilita desarrollo y evita límites serverless al procesar snapshots grandes. `docker compose up` debe levantar todo y exponer únicamente puertos localhost. Proxy TLS, dominio y acceso externo no son parte de esta etapa.

El scheduler es parte del colector, protegido por un advisory lock de PostgreSQL para impedir dos runs concurrentes. Ejecutar unos minutos después de la hora y con backoff por `429`/`5xx`; no suponer que una llamada cada hora exacta mejora frescura. GitHub Actions no es un plan de producción adecuado porque GitHub documenta que los workflows programados pueden retrasarse, e incluso descartarse, cuando hay carga.

### Comparativa por reino: decisión y coste

El MVP incluirá la pantalla de comparativa, pero sus resultados se limitan de forma transparente a los mercados US recolectados: el mercado principal de la hermandad y un conjunto piloto configurable. El selector sí muestra todos los mercados US desde el primer día; al seleccionar uno no recolectado, la web debe informar «aún no indexado», no inventar un precio ni iniciar una descarga durante la petición.

### Carga inicial y Area 52

Para una herramienta de precios es preferible una carga útil inmediata a una portada vacía que exige una acción antes de enseñar la primera tabla. Por eso Area 52 será el mercado predeterminado para la primera visita, pero no una restricción: el usuario puede cambiarlo desde el selector y su elección se guarda localmente. Una URL con mercado explícito tiene máxima prioridad y permite compartir una vista concreta.

El colector actualiza Area 52 antes que los mercados piloto, y la web lee su último snapshot existente; no lanza una petición a Blizzard al abrir la página. Así el predeterminado mejora la percepción de velocidad sin crear carga ni presentar información engañosamente fresca. Area 52 se identifica mediante el índice oficial US al arrancar/sincronizar, no mediante un ID numérico escrito en código.

Hacer una comparativa completa US significa ejecutar el endpoint de subastas para cada *connected realm* US por ciclo. Dado que una respuesta puede superar 10 MB, es una ampliación de infraestructura y no una opción de UI. Tras el MVP haremos un benchmark local con 5, 20 y 50 mercados, registrando duración, RAM, transferencia, filas Armor y tamaño de base. Sólo con esos datos se definirá la cobertura nacional, frecuencia y recursos necesarios.

### Escalado posterior, sólo si hay evidencia

| Señal | Cambio |
| --- | --- |
| Un realm tarda demasiado o consume la memoria del host | worker de ingestión separado, streaming JSON y cola. |
| Se amplía la comparativa a muchos mercados US | benchmark, tabla/partición por tiempo, pool de workers con límite global y PostgreSQL gestionado. |
| Muchos lectores | caché de lectura/Redis, CDN de assets y réplicas sólo tras medir. |
| Jobs necesitan ejecución administrada | Cron Trigger/Workers o servicio de jobs, verificando límites de CPU, tamaño de respuesta y conectividad con la base. |

Cloudflare Workers ofrece cron con handler `scheduled`, pero sus triggers se propagan con demora y sus límites deben revisarse contra el tamaño real del payload. Es una opción posterior, no una suposición de capacidad.

## Seguridad, privacidad y cumplimiento

- Crear una aplicación de servidor en Battle.net Developer Portal, describir su finalidad y aceptar sus términos antes de usar credenciales.
- `BLIZZARD_CLIENT_SECRET` se inyecta como secreto de entorno/gestor de secretos en servidor; `.env` local se ignora; `.env.example` sólo contiene nombres vacíos.
- Rotación: revocar y regenerar si una clave llega a un commit, log o ticket. Habilitar secret scanning y protección de ramas.
- No se solicitan credenciales de miembros ni se leen perfiles de personajes para este MVP; los datos de subasta se tratan como datos de API sujetos a términos.
- Los términos de Blizzard encontrados establecen retención máxima de 30 días para datos obtenidos por API. Por prudencia, snapshots y agregados derivados expiran también a los 30 días. Antes de habilitar histórico largo, publicidad, donaciones o cualquier monetización, revisar los términos vigentes y pedir asesoría apropiada.
- Mostrar atribución/marca de Blizzard sólo conforme a sus reglas vigentes; incluir página de privacidad y aviso de no afiliación antes de publicar.

## Diseño de precio y analítica

Para cada snapshot de un item/variante:

```text
precio_por_unidad_cobre = buyout_copper / quantity
minimo                 = min(precio_por_unidad_cobre)
mediana                = median(precio_por_unidad_cobre ponderada por quantity, si se implementa)
cantidad_total         = sum(quantity)
cantidad_al_minimo     = sum(quantity donde precio = minimo)
```

Al inicio se deben preferir dos métricas transparentes: mínimo por unidad y cantidad al mínimo. La mediana ponderada, tendencias, volatilidad, «deal score» y recomendaciones se agregan sólo después de validar datos y variantes. Todas las cifras deben declarar moneda, mercado y timestamp.

## Open source y colaboración

Propuesta de estructura al iniciar código:

```text
AuctionHouseWeb/
  apps/web/                 # Next.js
  apps/collector/           # descarga y agregación
  packages/contracts/       # tipos, Zod y reglas de precio
  prisma/                   # schema y migraciones
  docs/                     # arquitectura, ADR, operación
  deploy/                   # compose, proxy y runbook
  .github/workflows/        # CI, no cron de producción
```

Añadir desde el primer PR: `LICENSE` compatible con el repositorio padre tras confirmar la licencia deseada, `CONTRIBUTING.md`, `SECURITY.md`, Code of Conduct, issue templates, `ARCHITECTURE.md` y runbook de recuperación. No publicar fixtures que incluyan secretos; anonimizar logs de error.

## Preguntas que deben responderse antes de conectar producción

1. Area 52 queda como mercado principal. ¿Cuáles serán 3–5 mercados piloto para la comparación?
2. ¿El alcance es exclusivamente Retail y en qué idioma se presentará la web? `es_MX` puede servir para US.
3. ¿Quién administra la cuenta/cliente de Battle.net? Debe ser una cuenta de proyecto, no una clave copiada en el chat.
4. ¿Se acepta la ventana móvil de 30 días mientras se valida la interpretación de términos? Sin ello no prometemos gráficos históricos largos.
5. ¿La siguiente etapa seguirá sólo en `localhost`? Publicar en Internet cambia proxy, controles de abuso y aviso de privacidad.

## Fuentes consultadas

- Blizzard: [Game Data APIs de WoW](https://community.developer.battle.net/documentation/world-of-warcraft/game-data-apis) y [guía de namespaces](https://community.developer.battle.net/documentation/world-of-warcraft/guides/namespaces).
- Blizzard: [cambio de endpoints para commodities](https://us.forums.blizzard.com/en/blizzard/t/immediate-change-to-auction-apis-for-commodities-with-927/31522) y [actualización de Auction House API](https://us.forums.blizzard.com/en/blizzard/t/world-of-warcraft-api-update-visions-of-nzoth/3461).
- Blizzard: [Developer API Terms of Use](https://www.blizzard.com/pt-br/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use).
- Next.js: [self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [deployment](https://nextjs.org/docs/app/getting-started/deploying) y [requirements](https://nextjs.org/docs/app/getting-started/installation).
- GitHub: [retrasos en workflows programados](https://docs.github.com/en/actions/how-tos/troubleshoot-workflows).
- Cloudflare: [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
- Warcraft Wiki: [IDs de clase de item](https://warcraft.wiki.gg/wiki/ItemType) (referencia comunitaria complementaria; la fuente operativa sigue siendo Blizzard).
