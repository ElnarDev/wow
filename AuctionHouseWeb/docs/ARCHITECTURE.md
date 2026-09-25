# Arquitectura

Auction House Web se divide en tres procesos: una interfaz web, un collector HTTP y PostgreSQL. Solo el collector conoce las credenciales de Battle.net y escribe capturas; la web consume su API local.

## Interfaz web

- `apps/web/app`: composición de páginas, layout y estilos globales mínimos.
- `apps/web/features/auction`: dominio funcional de la Casa de Subastas.
- `features/auction/api.ts`: única frontera HTTP con el collector.
- `features/auction/types.ts`: contratos compartidos por la vista y sus componentes.
- `features/auction/components`: piezas visuales reutilizables sin conocimiento de rutas HTTP.
- `features/auction/auction.css`: estilos específicos de la funcionalidad.
- `apps/web/components/ui`: primitivas de interfaz generadas; no deben contener reglas del negocio.

El componente de página coordina estado y casos de uso. Los componentes de presentación reciben datos y callbacks tipados; no construyen endpoints ni leen almacenamiento local directamente.

## Collector

- `apps/collector/src/config.mjs`: configuración validada del entorno.
- `apps/collector/src/database.mjs`: conexión a PostgreSQL.
- `apps/collector/src/blizzard`: autenticación y cliente resiliente de la API oficial.
- `apps/collector/src/domain`: transformaciones puras de objetos y variantes.
- `apps/collector/src/http`: utilidades y, progresivamente, rutas HTTP.
- `apps/collector/src/utils`: utilidades genéricas sin dependencias del dominio.
- `apps/collector/src/index.mjs`: arranque y orquestación; no debe acumular nuevas reglas de dominio.

## Reglas de dependencia

1. La interfaz depende de contratos y componentes, nunca de PostgreSQL ni de credenciales.
2. El dominio no depende del servidor HTTP.
3. Las rutas validan entradas y delegan; las consultas y transformaciones viven fuera de la ruta.
4. Todo contenido de subastas es WoW Retail US (`dynamic-us` y `static-us`).
5. Cada extracción debe conservar comportamiento y pasar lint, build y verificación HTTP antes de continuar.

## Desarrollo local

`docker-compose.yml` define los servicios estables. `docker-compose.dev.yml` agrega el volumen y el comando de desarrollo de la web para habilitar HMR. Los cambios del frontend aparecen al guardar; los cambios del collector requieren reconstruir y recrear ese servicio.
