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

## Actualizar el collector

Tras cambiar o actualizar el código del collector, ejecuta `docker compose up -d --build --no-deps collector` desde `AuctionHouseWeb`. Reiniciar el contenedor sin reconstruirlo sigue ejecutando la imagen anterior.

Al arrancar, el collector prepara los índices de búsqueda de la última captura exitosa de cada mercado sin borrar los datos existentes. Las búsquedas consideran tanto el nombre en inglés como el nombre en español ya indexado. La disponibilidad corresponde a la fecha de la captura, no necesariamente al estado actual del juego.

El pie del dashboard muestra centrada la fecha y hora de actualización de los datos visibles, con la zona horaria del navegador. Si los resultados o favoritos mezclan capturas, muestra el intervalo entre la más antigua y la más reciente. La ficha de objeto y WoW Token muestran su propia fecha; sin datos visibles se indica que no hay fecha disponible. La fecha no cambia por una recolección en segundo plano hasta que se cargan los nuevos datos en la vista.
