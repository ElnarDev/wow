# Ejecución local

1. Copia `.env.example` a `.env` y cambia `POSTGRES_PASSWORD` por una contraseña local.
2. Desde `AuctionHouseWeb`, ejecuta `docker compose up --build`.

- Web: http://localhost:3500
- Colector fixture: http://localhost:3501/healthz

Esta versión no contacta Blizzard. El colector lee `apps/collector/fixtures/area-52-auctions.json`. Las credenciales futuras vivirán sólo en `.env`, que Git ignora.

## Activar Blizzard

1. Crea una aplicación de servidor en el [portal de desarrolladores de Battle.net](https://develop.battle.net/).
2. Copia el Client ID y Client Secret en las variables equivalentes de `.env`.
3. Reinicia `docker compose up --build`.

Con las dos variables presentes el colector sincroniza el catálogo US, resuelve `area-52` por su slug y descarga su snapshot de subastas. Sin ellas continúa en modo fixture y expone el motivo en `/healthz`.

`docker compose down` detiene los servicios y conserva la base local. `docker compose down -v` elimina intencionalmente esos datos.

Las dependencias del frontend se instalan desde Docker. No se requiere Node.js en Windows. La web arranca en modo de producción local para ejecutar el runtime compatible de Cloudflare de forma estable.
