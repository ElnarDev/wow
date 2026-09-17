# Auction House Web

Proyecto abierto y gratuito para que la hermandad consulte la Casa de Subastas de World of Warcraft sin depender de servicios de terceros. El primer producto será una página web de precios de **Armor** con datos obtenidos de la API oficial de Blizzard.

## Estado

Estamos en fase de descubrimiento y diseño. No hay aplicación ni credenciales creadas todavía. El plan ejecutable está en [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) y la investigación, decisiones y fuentes están en [docs/RESEARCH.md](docs/RESEARCH.md).

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

## Próximo hito

Completar la fase 0 del plan: crear una aplicación de servidor en el portal de Battle.net. Area 52 será el mercado principal inicial, resuelto por nombre contra el catálogo oficial. Entonces se podrá implementar localmente el vertical slice: descargar una captura, identificar Armor, persistir agregados y mostrarlos en una tabla local con Docker Compose.
