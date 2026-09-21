# Auction House Web

Proyecto abierto y gratuito para que la hermandad consulte la Casa de Subastas de World of Warcraft sin depender de servicios de terceros. El primer producto será una página web de precios de **Armor** con datos obtenidos de la API oficial de Blizzard.

## Estado

El vertical slice local ya está implementado: Docker Compose levanta PostgreSQL, el colector y el dashboard. Sin credenciales, el colector usa una fixture versionada de Area 52; con credenciales locales de Battle.net, sincroniza el catálogo US y descarga capturas oficiales.

El siguiente hito es validar una ejecución local completa, añadir pruebas automatizadas del colector y, cuando existan credenciales, validar la primera captura oficial. El plan ejecutable está en [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) y la investigación, decisiones y fuentes están en [docs/RESEARCH.md](docs/RESEARCH.md).

## Alcance del MVP

- WoW Retail US; el selector muestra todos los reinos US agrupados por *connected realm*.
- Area 52 es el mercado predeterminado en la primera visita; una elección previa del usuario siempre tiene prioridad.
- Catálogo y resultados de la categoría Armor (`item_class.id = 4`).
- Precio mínimo de compra inmediata por unidad, cantidad disponible, enlace al objeto y hora exacta de la captura.
- Búsqueda, filtros por subcategoría y ordenación; una ficha con últimas capturas y comparación entre los mercados US ya recolectados.
- Sin cuentas de usuario, pagos, alertas, automatización dentro del juego ni scraping de otros sitios.

## Principios

- La clave secreta de Battle.net sólo existe en el colector del servidor, nunca en el navegador ni en Git.
- Cada precio muestra su frescura y su reino conectado: los datos no son en tiempo real garantizado.
- Se conserva únicamente el mínimo de datos y durante el plazo compatible con los términos de Blizzard.
- El código, configuración de ejemplo y documentación serán públicos; las credenciales y datos operativos no.

## Ejecución local

Consulta [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md). La primera ejecución sólo necesita copiar `.env.example` a `.env` y elegir una contraseña local de PostgreSQL; no requiere credenciales de Blizzard.
