# WoW Latency Monitor

Herramienta de escritorio ligera para Windows que estima la latencia TCP hacia gateways de conexión de World of Warcraft.

## Ejecutar

```powershell
dotnet run --project .\Latency\Latency.csproj
```

Desde la carpeta raíz del proyecto:

```powershell
dotnet run --project .\Latency
```

## Uso

1. Deja seleccionado **Americas (US)**.
2. Instala el addon [LatencyBridge](./LatencyBridge) en `_retail_/Interface/AddOns/LatencyBridge`.
3. Abre WoW y entra con tu personaje.
4. Pulsa **Iniciar**.

La app lee los valores reales de `GetNetStats()` escritos por el addon. No usa valores guardados manualmente ni credenciales.

## Alcance

Hogar y Mundo solo se obtienen del addon LatencyBridge mediante `GetNetStats()`. La prueba TCP HTTPS es independiente y no sustituye esos valores internos de WoW. La herramienta no inicia sesión, no usa credenciales ni claves API.
