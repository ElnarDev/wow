# Plan de implementación — MVP Armor

Fecha de investigación: 2026-09-16. Este documento define el primer corte entregable; evita construir un clon de Undermine Exchange antes de disponer de una cadena de datos fiable.

## 1. Decisiones de alcance

| Decisión | MVP | Motivo |
| --- | --- | --- |
| Juego | WoW Retail | La API oficial de Game Data entrega subastas de Retail; Classic se evalúa como proyecto separado. |
| Región y selector | Sólo WoW Retail US; todos los reinos US, agrupados por *connected realm* | Cumple la necesidad de navegación sin exponer mercados EU/KR/TW ni duplicar mercados conectados. |
| Mercado principal | Area 52, resuelto dinámicamente al iniciar; configurable después | Garantiza resultados inmediatos desde la primera visita sin codificar un ID que pueda cambiar. |
| Categoría | Armor, `item_class.id = 4` | Es el objetivo inicial y permite validar clasificación, variantes y precio. |
| Precio visible | Mínimo `buyout` por unidad y cantidad total al precio mínimo | Es una métrica comprensible y no confunde pujas con compras inmediatas. |
| Actualización | Job horario, idempotente | Blizzard publica estas instantáneas a una cadencia aproximada de una hora, que puede cambiar. |
| Histórico | Ventana móvil de hasta 30 días, pendiente de revisión legal antes de ampliar | Los términos de la API exigen TTL máximo de 30 días para los datos obtenidos. |
| Comparativa de item | MVP acotado a mercados US recolectados; mercado principal + conjunto piloto | Da una comparativa real sin prometer cobertura nacional antes de medir descargas y almacenamiento. |
| Fuente | API oficial de Blizzard | No se hará scraping de FlippingPal, Undermine Exchange, Wowhead ni la interfaz del juego. |

La región queda fija en `us`; el servidor sólo acepta `US`. Area 52 es el mercado principal. La API devuelve IDs de realm y de *connected realm* distintos: las subastas se consultan con este último, que se resolverá desde el catálogo oficial en lugar de codificarse.

## 2. Experiencia que se entregará

Ruta inicial: `/armor`; `realm=<connectedRealmId>` se agrega cuando el usuario selecciona explícitamente otro mercado o comparte un enlace.

1. Cabecera con selector buscable de **reinos US** agrupados por mercado conectado, búsqueda por nombre y sello «actualizado hace N min». En la primera visita se muestra Area 52 como seleccionado; la región no se muestra como opción porque está fijada en US.
2. Barra lateral de Armor: Cloth, Leather, Mail, Plate, Shields y otros subtipos que devuelva la API.
3. Tabla paginada: icono, nombre, subtipo, nivel de objeto si está disponible, mínimo por unidad, cantidad al mínimo y hora de captura. Orden por precio, cantidad o nombre.
4. Ficha `/items/[itemId]` con metadatos, enlace de Wowhead generado desde el ID, gráfico de mínimo/mediana por captura y tabla «Comparar mercados US» ordenada por mínimo por unidad. Cada fila declara si corresponde al último snapshot de ese mercado y su hora.
5. Estados explícitos de vacío, carga, datos caducados y error de colector. No se presentará nunca «precio actual» si la última captura falló.

La resolución de mercado para cada carga es: (1) `realm` válido de la URL, (2) última selección guardada localmente, (3) Area 52. La primera respuesta HTML consulta directamente el último snapshot de Area 52: no espera una descarga nueva. En paralelo, el navegador puede precargar el catálogo del selector y el servidor puede comprobar la antigüedad de la captura; ninguna interacción del usuario dispara una descarga de subastas.

No entran en el MVP: cobertura garantizada de **todos** los mercados US, commodities regionales, alertas, predicción de beneficio, crafting, favoritos sincronizados, login, Discord, addon ni analítica de ventas (la API sólo expone listados activos). La expansión de la comparativa a todos los mercados US pasa al siguiente hito después de un benchmark local.

## 3. Arquitectura recomendada

```text
Battle.net OAuth client-credentials (US)
             |
             v
  collector (Node/TypeScript, cron horario) ---> registro de ejecuciones
             |  descarga una instantánea completa
             v
 parser + caché de metadatos de item ----> PostgreSQL
             |                                  |
             |                          agregados Armor por captura
             v                                  v
        almacenamiento temporal raw       Next.js API / servidor web
                                                |
                                                v
                                           navegador de la hermandad
```

### Componentes iniciales

| Componente | Elección | Responsabilidad |
| --- | --- | --- |
| Web | Next.js + TypeScript + App Router | SSR de lista/ficha, API de lectura y UI accesible. |
| UI | Tailwind CSS, shadcn/ui, TanStack Table, Recharts | Diseño rápido, tabla virtual/paginada y gráfico simple. |
| Colector | Servicio Node/TypeScript separado | OAuth, descarga, reintentos, parsing por stream, agregación e idempotencia. Nunca se ejecuta desde una petición web. |
| Persistencia | PostgreSQL + Prisma | Catálogo, snapshots agregados, índices y migraciones tipadas. |
| Tareas | scheduler dentro del contenedor collector + advisory lock PostgreSQL | Predecible localmente. No usar GitHub Actions para datos operativos: sus tareas programadas pueden retrasarse o perderse bajo carga. |
| Proxy | No necesario en desarrollo local; Caddy o Nginx sólo al publicar | Docker expondrá `localhost`; TLS, rate limit y proxy inverso son requisitos de despliegue público. |
| Observabilidad | logs JSON, healthchecks, Sentry opcional | Detectar captura fallida, edad de datos y errores de UI. |

La primera instalación será íntegramente local con Docker Compose: `web`, `collector` y `postgres`, persistiendo la base en un volumen Docker. Se accederá por `http://localhost`; no habrá dominio, TLS ni servicios de nube. Una publicación posterior puede añadir proxy y separar PostgreSQL, pero no se justifica antes de conocer tamaño real de las capturas. Next.js admite despliegue Node o Docker y recomienda un proxy inverso al autoalojarse públicamente.

## 4. Datos y flujo de ingestión

1. El cron adquiere un token OAuth de servidor mediante `client_credentials`; guarda token y expiración únicamente en memoria.
2. Sincroniza diariamente el índice US de realms y connected realms. Resuelve el slug/nombre de Area 52 a su `connectedRealmId` y lo marca como principal. Construye el selector a partir de esos datos y agrupa sus nombres bajo un único `connectedRealmId`; no hay lista manual ni opciones fuera de US.
3. Llama a `GET /data/wow/connected-realm/{id}/auctions?namespace=dynamic-us&locale=en_US`. Es un listado completo, no un endpoint de búsqueda por ítem, y puede superar 10 MB.
4. Registra `lastModified`/hash de contenido. Si es igual a la última captura exitosa, finaliza sin duplicar filas.
5. Para cada `item.id` desconocido consulta y cachea `GET /data/wow/item/{itemId}?namespace=static-{region}` y, opcionalmente, el media endpoint. Sólo conserva/expone los ítems cuyo `item_class.id` sea 4.
6. Agrupa las subastas Armor por la identidad del item que se decida: inicialmente `item_id`; almacena por separado `bonus_lists`, modificadores, pet level y `item_context` para no perder variantes. La lista MVP rotula el resultado como «precio base del item» hasta implementar separación de variantes.
7. Para cada item guarda agregados: mínimo de buyout por unidad, mediana de buyout por unidad, cantidad total, cantidad al mínimo y número de listados. Excluye listados sin compra inmediata de esas métricas y cuenta los excluidos.
8. Inserta la captura y sus agregados dentro de una transacción. Marca la ejecución `succeeded` sólo al final; métricas y healthcheck se actualizan incluso en error. El colector siempre prioriza Area 52 y después rota por el conjunto piloto de comparación.
9. Elimina JSON bruto tan pronto como se procese (o máximo 7 días para depuración) y un job diario borra datos de API/derivados que rebasen 30 días salvo revisión jurídica documentada.

### Modelo relacional inicial

| Tabla | Campos esenciales | Índices / reglas |
| --- | --- | --- |
| `connected_realms` | `id`, `region='us'`, `display_name`, `updated_at`, `comparison_enabled`, `is_default` | único `(region,id)`; Area 52 tiene `is_default`; todos los US aparecen en selector, sólo los habilitados se recolectan |
| `items` | `id`, `region`, `name`, `item_class_id`, `subclass_id`, `inventory_type`, `quality`, `icon_url`, `metadata_fetched_at` | PK `(region,id)`; `item_class_id, subclass_id` |
| `ingestion_runs` | `id`, `realm_id`, `started_at`, `source_last_modified`, `source_hash`, `status`, `error_summary` | único `(realm_id, source_last_modified)`; conservar logs sin secretos |
| `price_snapshots` | `run_id`, `item_id`, `variant_key`, `min_buyout_copper`, `median_buyout_copper`, `quantity`, `quantity_at_min`, `listing_count` | PK `(run_id,item_id,variant_key)`; índice para `(item_id, run_id)` |

Todo valor monetario se guarda como entero en cobre. La conversión oro/plata/cobre ocurre sólo al renderizar. `variant_key` será una serialización canónica y hasheada de los campos que cambian el valor; no usar JSON sin normalizar como clave.

## 5. API interna y contratos

Las rutas públicas no reenviarán consultas a Blizzard. Leerán la base de datos para proteger la credencial, desacoplar la UX de una API externa y servir resultados rápidos.

| Ruta | Parámetros | Respuesta mínima |
| --- | --- | --- |
| `GET /api/v1/armor` | `realm`, `q`, `subclass`, `sort`, `cursor` | items del último snapshot exitoso US, `capturedAt`, `stale` |
| `GET /api/v1/items/:itemId` | `realm`, `variant?` | metadatos, serie permitida y comparación de mercados US recolectados |
| `GET /api/v1/realms` | sin región | todos los realms US agrupados por connected realm, y estado de captura |
| `GET /healthz` | — | estado de web, BD y antigüedad del último run; no secretos |

Se validan entrada y salida con Zod; se aplica rate limit en proxy y API; cursores firmados o basados en claves estables, nunca offset sobre una tabla histórica grande.

## 6. Paquetes candidatos

Instalar sólo cuando una historia los use, revisando compatibilidad y licencias en ese momento.

| Área | Paquetes | Uso |
| --- | --- | --- |
| Base | `next`, `react`, `typescript`, `eslint` | Aplicación web y comprobaciones. |
| Datos | `prisma`, `@prisma/client`, `pg` | Esquema, migraciones y acceso PostgreSQL. |
| Validación y HTTP | `zod`, `p-retry`, `p-limit` | Contratos, backoff y límite de concurrencia al hidratar ítems. |
| UI | `tailwindcss`, `lucide-react`, `@tanstack/react-table`, `recharts` | Estilo, iconos, tabla y gráfica. |
| Calidad | `vitest`, `playwright`, `testcontainers` | Unitarias, E2E y pruebas reales de PostgreSQL. |
| Operación | `pino`, `@sentry/nextjs` opcional | Logs estructurados y errores. |

No se necesita un SDK no oficial de Blizzard: `fetch` nativo, OAuth y un cliente pequeño y testeado reducen dependencia y exponen claramente namespaces, región y reintentos.

## 7. Fases y criterios de salida

1. **Fundación local (1–2 sesiones):** registrar cliente Battle.net; monorepo con `apps/web`, `apps/collector`, `packages/contracts`, Docker Compose, `.env.example`, CI de lint/typecheck/test. Sale cuando `docker compose up` levanta servicios locales y el secreto no aparece en logs, UI ni Git.
2. **Datos verticales (2–4 sesiones):** sincronizar catálogo US, resolver Area 52, cliente OAuth, descarga del mercado principal, parser, caché de metadatos Armor, migraciones y job manual. Sale cuando una captura se repite sin filas duplicadas y una muestra se contrasta contra el juego.
3. **Web y comparativa MVP (2–4 sesiones):** carga inicial de Area 52, selector US, tabla Armor, búsqueda/filtros, ficha, sello de frescura y comparación del mercado principal con el conjunto piloto. Sale cuando un miembro puede encontrar un objeto y comparar mercados recolectados entendiendo moneda, reino, cobertura y antigüedad.
4. **Operación local (1–2 sesiones):** scheduler, reintentos, healthcheck, backups del volumen y retención. Sale cuando hay 7 días de ejecuciones observables y una restauración local probada.
5. **Piloto de hermandad (1 sesión):** feedback, corrección de variantes/precios y README de contribución. Sale con criterios de aceptación firmados por usuarios, no por número de funcionalidades.

## 8. Pruebas y aceptación

- Unitarias: conversión de cobre, cálculo por unidad, mediana, normalización de variante, deduplicación e interpretación de payload incompleto.
- Integración: OAuth simulado, respuesta de subasta fixture, transacción atómica, datos repetidos y fallo a mitad de run.
- Contrato: fixtures versionadas de Blizzard y alerta al detectar campos no reconocidos.
- E2E: primera visita muestra Area 52; URL y elección guardada la reemplazan; selector sin opciones fuera de US; filtrar Armor, buscar, ordenar, abrir ficha, comparar mercados recolectados y mostrar «desactualizado» tras superar el umbral acordado.
- Manual: comparar 10 ítems del reino dentro de la misma ventana de actualización, incluidos un item sin buyout y uno con variantes.
- Seguridad: secret scanning, Dependabot, cabeceras HTTP, rate limiting, backups cifrados donde aplique y prueba de recuperación.

## 9. Riesgos que deben seguir visibles

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Cambia el payload/cadencia de Blizzard | Precios erróneos o job roto | Fixtures, validación Zod, alarma de schema y mostrar frescura. |
| Comparar cada mercado US | muchas descargas completas, ancho de banda y tiempos locales altos | selector completo pero recolector piloto; benchmark antes de ampliar cobertura nacional. |
| Captura grande o muchos ítems nuevos | timeout o cuota | streaming, concurrencia limitada, caché de metadatos y prioridad al mercado principal. |
| Variantes de bonus alteran precio | Un «mínimo» engañoso | conservar campos de variante y etiquetar/segmentar antes de recomendar compras. |
| Términos/retención | Riesgo de cumplimiento | fuente oficial, TTL conservador, no perfil de jugadores, revisión de ToU antes de publicar. |
| Scraping de terceros | Fragilidad, bloqueo o licencia incierta | explícitamente fuera de alcance; integrar sólo APIs con permiso documentado. |
| Cron no fiable | Huecos de historial | job propio con lock, reintentos, healthcheck y panel de edad de datos. |

## 10. Entregable siguiente

La siguiente tarea de código no es una interfaz completa: crear el esqueleto de la fase 1, Docker Compose y un comando `collect-once` que funcione contra una respuesta fixture. Después se sincronizará el catálogo US. Sólo cuando las credenciales estén disponibles como secreto local se probará contra Blizzard.
