# Ejecución local

1. Sin archivo `.env`, desde `AuctionHouseWeb` ejecuta `docker compose up --build`. El stack usa la fixture local de forma automática.
2. Para datos reales, copia `.env.example` a `.env`, cambia `POSTGRES_PASSWORD` por una contraseña local y añade las dos credenciales de Battle.net.

- Web: http://localhost:3500
- Colector fixture: http://localhost:3501/healthz

Para verificar el flujo fixture sin abrir el navegador, ejecuta:

```text
docker compose --env-file .env.example up --build -d --wait
node apps/collector/scripts/verify-fixture.mjs
```

Sin `.env`, o si falta una de las dos credenciales de Blizzard, el colector lee `apps/collector/fixtures/area-52-auctions.json` y el selector muestra sólo el realm fixture. Si las credenciales son rechazadas por OAuth, vuelve a la fixture e informa el motivo en `/healthz`. Las credenciales viven sólo en `.env`, que Git ignora.

## Activar Blizzard

1. Crea una aplicación de servidor en el [portal de desarrolladores de Battle.net](https://develop.battle.net/).
2. Copia el Client ID y Client Secret en las variables equivalentes de `.env`.
3. Reinicia `docker compose up --build`.

Con las dos variables válidas el colector sincroniza el catálogo US, resuelve `area-52` por su slug y descarga su snapshot de subastas. En modo Blizzard el selector oculta la fixture y muestra exclusivamente reinos con al menos una captura exitosa, para que cada opción disponible tenga datos reales consultables.

`docker compose down` detiene los servicios y conserva la base local. `docker compose down -v` elimina intencionalmente esos datos.

Las dependencias del frontend se instalan desde Docker. No se requiere Node.js en Windows. La web arranca en modo de producción local para ejecutar el runtime compatible de Cloudflare de forma estable.
