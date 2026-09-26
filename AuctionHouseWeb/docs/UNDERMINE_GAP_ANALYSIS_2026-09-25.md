# Auditoría funcional: Undermine Exchange y AuctionHouseWeb

Fecha: 25 de septiembre de 2026. Alcance: WoW Retail; inicialmente US.
Estado: inventario y plan de implementación, no certificación de paridad completa.

## Resultado

La base existente es aprovechable: búsqueda, categorías, filtros básicos, favoritos persistidos, detalle con variantes, niveles de precio, cálculo por cantidad, historial mínimo, comparación de reinos y Ficha de WoW. La mayor distancia está en la consistencia del modelo de mercado, analítica histórica, descubrimiento de oportunidades y navegación/persistencia completas. No conviene empezar otra refactorización global antes de cerrar estos contratos y probarlos.

## Evidencia y límites

- **V**: observado en la web pública durante esta revisión.
- **S**: confirmado en código público de la referencia; no necesariamente probado en el despliegue actual.
- **D**: anunciado/documentado oficialmente, sin prueba autenticada.
- **L**: confirmado en código o endpoint local; no equivale a prueba end-to-end.
- **P**: pendiente de comprobación; no presentar como funcionalidad verificada.

Se abrió la portada, se seleccionó Area 52 US, se cargó la búsqueda general y un detalle sin existencias (`30509`, Armor Fragment), se inspeccionaron secciones históricas, filtros, idiomas y navegación lateral. La lista mostró 32.557 resultados y un límite visible de 500. Se observaron las ramas Decor y Housing Dye de Housing. La portada explica las funciones de Patreon.

Limitación concreta: varias interacciones no correspondieron al control solicitado (por ejemplo, seleccionar Bleach terminó en Armor Fragment; buscar Eternal Crystal no sustituyó la lista). Se intentaron controles semánticos, accesibles y visuales sin resolverlo. Por ello no se certifica un recorrido completo de todas las categorías, favoritos/F5, Deals, mascota, equipo y Token de la referencia. No se inició sesión ni se eludieron restricciones de Patreon. Se complementó el recorrido con fuentes públicas y se deja una tarea explícita de validación pendiente.

La web local abrió correctamente, pero en la sesión nueva quedó sin reino seleccionado. `/healthz` respondió `ready`, modo `blizzard`, objetivo Area 52; `/api/realms` devolvió siete reinos con IDs como cadenas. El orden lateral invertido y el pie no interactivo también se observaron en la UI. No se cambiaron código de aplicación, datos, favoritos del usuario ni contenedores.

La auditoría anterior [UNDERMINE_PRODUCT_AUDIT.md](UNDERMINE_PRODUCT_AUDIT.md), del 17 de septiembre, se conserva como antecedente: se realizó con el sitio en mantenimiento y no prueba el estado actual. La indexación externa del repositorio fue rechazada por seguridad; se utilizaron lecturas locales. Algunas fuentes públicas están cacheadas con antigüedad de semanas/meses.

### Fuentes

- R1: [Web y explicación del producto](https://undermine.exchange/).
- R2: [Búsqueda pública de Area 52](https://undermine.exchange/#us-area-52/search).
- R3: [Detalle observado](https://undermine.exchange/#us-area-52/30509).
- R4: [Search.ts: favoritos, ordenación, búsqueda y Deals](https://github.com/erorus/shatari-front/blob/master/src/ts/Search.ts).
- R5: [Detail.ts: secciones y preferencias](https://github.com/erorus/shatari-front/blob/master/src/ts/Detail.ts).
- R6: [Categorías de referencia](https://github.com/erorus/shatari-front/blob/master/src/ts/Categories.ts).
- R7: [Documentación de API](https://undermine.exchange/api.html).
- R8: [Arquitectura y licencia del proyecto público](https://github.com/erorus/shatari-front).

R4 confirma almacenamiento local de claves de favoritos, ejecución por Enter, borrado del texto, sugerencias, copia del nombre con Ctrl+C, preferencias de ordenación y modos de búsqueda. Deals filtra existencias no-commodity y compara contra un umbral precalculado; su mediana no usa exactamente la misma población que la columna regional ordinaria. No se ha auditado aquí el cálculo del umbral del backend.

R5 define siete secciones: estadísticas base, capturas, calor horario, diario, precio por cantidad, diario regional y otros reinos. El orden se conserva localmente para usuarios habilitados. También implementa estadísticas de razas de mascotas, indicadores de desplazamiento y ordenación persistida de otros reinos. La presencia de código no acredita que cada variante sea accesible sin suscripción.

R7 documenta precios actuales, series horarias de 14 días y series diarias, por región/reino y variantes. La API requiere clave vinculada a Patreon; algunos accesos no requieren suscripción de pago. No provee metadatos completos de objetos. No es una dependencia propuesta para sustituir automáticamente nuestra recolección.

## Matriz de funcionalidades

“Parcial” significa que existe una base pero faltan comportamiento, datos o validación. “Ausente” se refiere al flujo auditado y sus módulos, no a una búsqueda exhaustiva de cada archivo auxiliar.

| Área / función | Referencia y evidencia | Nuestro estado y diferencia | Tareas |
|---|---|---|---|
| Región y reino | US/EU/TW/KR en selector (V, R1) | US, siete reinos ofrecidos por API; ampliación regional opcional | A02, E04 |
| Reino conectado | Precio contextualizado al mercado (D, R7) | Modelo conectado presente; verificar deduplicación y cobertura | A03 |
| Inicio útil | Reino preferido (S, R4); favoritos iniciales aún P | Lógica local existe, sesión nueva quedó sin selección | A02, B01 |
| Categorías | 15 raíces visibles (V, R2) | 15 raíces, orden invertido; nombres/clasificación no totalmente equivalentes | B02 |
| Subcategorías | Ramas especializadas (V Housing; S R6) | Configuración local; necesita pruebas una a una | B02, B03 |
| Búsqueda por nombre | Campo, botón; Enter/sugerencias/reset (V/S, R4) | Campo y envío; falta cerrar equivalencia de sugerencias y limpieza | B04 |
| URL compartible | Rutas de búsqueda y detalle (V/S) | `replaceState` presente; falta contrato completo y pruebas Atrás/Adelante | B05 |
| Orden y límite | Cabeceras, primeros 500, total (V); preferencias (S) | Cinco columnas y paginación base; probar orden global, no solo página | B06 |
| Monedas | Iconos en precios (V) | Oro/plata existentes; conservar cobre internamente | B07 |
| Identidad visual | Icono, rareza, rango de fabricación (V/capturas usuario) | Componentes existentes, inyección Wowhead y tier inferido | A04, B07 |
| Agotados | Cantidad cero y última aparición (V, R2/R3) | Backend incluye datos; tabla no representa `lastSeenAt` | B08 |
| Tooltip y enlace externo | Wowhead (V, R3) | Integración presente; probar carga inicial/favoritos/variantes | B07 |
| Favoritos persistentes | Claves en localStorage (S, R4) | Hook persistente, pero identidad solo itemId | A01, B01 |
| Favoritos como resultados | Modo específico (S, R4; capturas usuario) | Vista y carga al inicio presentes; falta prueba robusta tras F5 | B01 |
| Nivel, rareza, expansión | Controles visibles restringidos (V/D) | Filtros existentes, sin certificación por categoría | B03 |
| Agrupar/ignorar variedades | Opción visible (V/D) | Sin selector equivalente; resumen mezcla variantes | A01, B09 |
| Estadísticas terciarias | Función anunciada (D, R1) | Mapeos de bonus y filtro presentes; revisar cobertura/build | A04, B03 |
| Debajo del precio de vendedor | Control visible restringido (V) | Sin filtro equivalente en panel | D02 |
| Mediana regional en lista | Control visible restringido (V/D) | Comparación en detalle, no columna regional | C05, D01 |
| Deals | Modo real de búsqueda (S, R4) | Botón sin manejador | D02 |
| Arbitraje | Control visible y función anunciada (V/D) | Sin modo equivalente | D03 |
| Detalle actual | Panel central y oferta lateral (V, R3 sin stock) | Disponibilidad, subastas, mínimo y variantes presentes | B09 |
| Estadísticas base | Actual, mediana, media y última aparición (V, R3) | Actual/cantidad; mediana separada en historial, media/semántica incompletas | C01 |
| Compra por cantidad | Sección bulk (S, R5) | Calculadora existente; falta curva y casos sin stock | C04 |
| Capturas históricas | Precio y cantidad (V, R3) | Gráfico solo precio; datos de cantidad sí existen | C02 |
| Mapas de calor | Precio y cantidad por hora/día, zona horaria visible (V, R3) | Sin sección equivalente | C03 |
| Histórico diario | Máxima disponibilidad diaria y precio asociado; fechas/zoom (V, R3) | Rangos 7/30/90/365 sobre capturas, no agregación equivalente | C02 |
| Histórico regional | Sección propia (S, R5) | No equivalente | C05 |
| Otros reinos | Sección y ordenación (S, R5) | Tabla limitada a capturas locales, sin variante en petición | A01, C05 |
| Reordenar secciones | Persistencia, acceso habilitado (S/D) | Ausente | E01 |
| Mascotas | Razas anunciadas y tipos en código (D/S) | Modelo genérico no expresa especie/raza/nivel/calidad de mascota | A05 |
| Viviendas | Decor / Housing Dye (V) | Categoría presente; verificar metadatos y subtipos | B02, B07 |
| Ficha de WoW | Entrada específica (V); detalle pendiente P | Vista y endpoint propios, historial 14 días | B10 |
| Idiomas | Diez opciones visibles (V) | en-US/es-MX, detalle con etiquetas inglesas | E02 |
| Ayuda y pie | Home, Terms, Privacy, API y Patreon visibles (V) | Textos sin enlace; sin ayuda de métricas | E03 |
| API pública | Documentada (D, R7) | API local sin contrato público equivalente | E03 |
| Rendimiento | Datos precalculados según arquitectura (D, R8) | PostgreSQL/API dinámica; no es necesario copiar arquitectura | E05 |
| Móvil y teclado | Paridad completa no probada (P) | Tabla con anchos fijos; requiere evaluación dedicada | E05 |

## Hallazgos locales prioritarios y trazabilidad

| ID | Evidencia local | Impacto |
|---|---|---|
| H01 | `features/auction/types.ts`: Favorite; `hooks/use-stored-favorites.ts`; dashboard `isFavorite` | Dos variantes del mismo itemId no pueden ser favoritos independientes. |
| H02 | `features/auction/catalog.ts`: `Object.keys(categoryPaths)` | Orden de raíces diferente al deseado, confirmado en navegador. |
| H03 | `categoryForItemClass`: `Number(itemClassId)` | `null` se convierte en clase 0; requiere fallback explícito. |
| H04 | `types.ts`: Realm.id numérico; `/api/realms`: cadenas | Inconsistencia real del contrato; puede afectar selección inicial/comparaciones estrictas. No se atribuye todo el fallo de inicio a esto sin diagnóstico adicional. |
| H05 | Collector `index.mjs:202-213` combina subastas y commodities por captura de reino | Riesgo de duplicar oferta regional si se suman reinos; separar ámbito y fecha de origen. |
| H06 | Collector `index.mjs:317-340`, `ORDER BY ... ASC LIMIT 1000` | Rangos extensos pueden perder los puntos más recientes; estadísticas sobre muestra truncada. |
| H07 | Collector `index.mjs:342-361`, cliente `api.ts` | Comparación usa itemId, no variante seleccionada; no es comparación homogénea de equipo. |
| H08 | Collector resumen `GROUP BY v.item_id` con MAX(nivel) y MIN(precio) | Nivel mostrado y precio mínimo pueden proceder de variantes distintas. |
| H09 | Collector favoritos `index.mjs:302-303` | Tier inferido mediante hermanos por nombre/nivel y limitado a 2; no es dato nativo autoritativo. |
| H10 | `components/auction-header.tsx:42` | Deals es decorativo: no tiene onClick. |
| H11 | `components/price-history-chart.tsx` | Eje X por índice, no por timestamp: oculta intervalos irregulares; solo dibuja precio. |
| H12 | Dashboard estadísticas: `history?.stats.lowCopper ?? 0` y similares | Ausencia de historial puede parecer un precio cero real. |
| H13 | Dashboard y `results-table.tsx` | Acoplamiento de estado/datos/UI; fila interactiva contiene enlace y botón, revisar accesibilidad. |

Rutas frontend relativas a `apps/web/`; collector relativas a `apps/collector/src/`. Las líneas corresponden al estado auditado, no son identificadores permanentes.

## Plan de tareas ejecutable

Todas las tareas están pendientes de implementación o cierre; no se marcan completas por existir una pantalla. P0 = fiabilidad; P1 = paridad principal; P2 = expansión. Tamaño relativo: S pequeño, M medio, L grande; no son promesas de duración.

### 1. Contratos y fiabilidad — P0

| Tarea | Entregable | Aceptación / dependencia |
|---|---|---|
| A01 (L) Identidad de mercado | Contrato único item/variante usado en búsqueda, favoritos, detalle, historial y comparación; distinguir identidad técnica de agrupación comercial | Dos niveles del mismo itemId nunca mezclan precio y nivel; clave estable ante reordenar bonuses; migración de favoritos antiguos sin pérdida. |
| A02 (M) Inicialización | Normalización de IDs y estado de carga; prioridad URL → guardado → Area 52 resuelto dinámicamente | Sesión limpia, F5, URL explícita, favorito existente, ID inválido y API lenta; no queda selector vacío sin explicación. |
| A03 (L) Ámbito y frescura | Commodity regional separado de mercado conectado; timestamp de origen y procesamiento; cobertura explícita | Una commodity se cuenta una vez por región; alias de un reino conectado no duplican stock; captura parcial no se publica como completa. |
| A04 (M) Metadatos fiables | Calidad de fabricación, rareza, nivel efectivo y terciarios con fuente/build identificables | No inferir tier por nombre; datos desconocidos se muestran como desconocidos; fixtures de varios rangos. |
| A05 (L) Mascotas | Especie, nivel, calidad y raza en ingesta/contrato/favoritos | Dos mascotas enjauladas distintas no se fusionan por itemId genérico; casos reales comprobados. Depende A01/A03. |
| A06 (M) Caracterización | Pruebas de contrato y regresión antes de cambiar agregaciones | Detectan H01/H03/H04/H06/H08; no modifican BD real. |

### 2. Navegación y mercado básico — P1

| Tarea | Entregable | Aceptación / dependencia |
|---|---|---|
| B01 (M) Favoritos completos | Lista inicial, persistencia versionada, hidratación, errores de almacenamiento y sincronía entre pestañas | F5 conserva variante, icono, rareza y tier sin buscar antes; vaciar favoritos no genera bucle; depende A01/A02/A04. |
| B02 (L) Taxonomía | Orden explícito y revisión de las 15 categorías con sus ramas | Por cada raíz: captura real, endpoint, subfiltro y detalle; corregir null; no declarar categoría terminada solo por menú. |
| B03 (M) Filtros | Límites válidos, combinaciones, reset y persistencia URL | Rango invertido validado; nivel efectivo correcto; expansión y terciarios no contaminan categorías. |
| B04 (M) Búsqueda | Sugerencias, Enter, limpiar, estados vacíos/error | Selección con teclado, acentos es-MX, consulta sin resultados, cancelación de respuesta obsoleta. |
| B05 (M) Navegación | Estado compartible de reino/categoría/filtros/variante; retorno a lista | Atrás/Adelante y F5 restauran selección/orden; no sobrescribir URL explícita con favoritos automáticos. |
| B06 (M) Tabla | Ordenación global estable, total, paginación y preferencia | Más de 500 filas: orden correcto entre páginas; desempate estable; columnas Precio/Objeto/Niv/Disponible/Subastas. |
| B07 (M) Identidad visual | Componente común para icono 22×22, marco, nombre y badge nativo | Sin recortes ni desbordes; imagen fallida con fallback; igualdad entre favorito/búsqueda/detalle; oro/plata sin perder precisión interna. |
| B08 (S) Agotados | Última aparición y diferencia entre cero/sin captura | Sin stock no significa precio cero; última fecha visible y explicada. |
| B09 (M) Variantes y detalle | Agrupar/desagrupar, selección coherente y datos de variante activa | Cantidad, mínimo, niveles, gráfico y comparación cambian juntos; depende A01. |
| B10 (S) Token | Revisar ámbito regional, icono y estado sin historial | Precio oficial separado de subastas de objetos, timestamp visible; no inventar datos anteriores. |

### 3. Analítica — P1

| Tarea | Entregable | Aceptación / dependencia |
|---|---|---|
| C01 (M) Diccionario de métricas | Definir mínimo, media, mediana, última aparición y población/periodo | Tooltip explica cálculo; null no se renderiza como cero; series de prueba con valores conocidos. |
| C02 (L) Histórico correcto | Serie horaria precio/cantidad, diario, fechas y zoom | Preserva puntos recientes; eje temporal real; huecos visibles; agregación diaria documentada. Depende A03/C01. |
| C03 (M) Mapas de calor | Precio y disponibilidad por día/hora | Zona horaria explícita, nulos distintos de cero, tooltip accesible; depende C02. |
| C04 (M) Profundidad de oferta | Curva escalonada y calculadora de cantidad | Suma de tramos exacta en cobre; solicitudes mayores a oferta y cantidad cero resueltas; no simula una compra real. |
| C05 (L) Comparación regional | Tabla/gráfico por mercado conectado y variante, mediana regional y diario regional | Mostrar cobertura/antigüedad; excluir o señalar capturas vencidas; no llamar regional completo a siete reinos; depende A01/A03/C01/C02. |

### 4. Descubrimiento de oportunidades — P1/P2

| Tarea | Entregable | Aceptación / dependencia |
|---|---|---|
| D01 (M) Columna regional | Mediana opcional y diferencia porcentual | Misma población/variante que detalle; sin cobertura no hay señal engañosa; depende C05. |
| D02 (L) Deals y vendedor | Especificación del umbral, lista de oportunidades y filtro bajo precio de vendedor | No inventar fórmula de la referencia; explicar referencia histórica/población; evitar commodities duplicadas, falta de stock y datos obsoletos. Depende C01/C05 y metadatos de vendedor. |
| D03 (L) Arbitraje | Comparación de oportunidades entre mercados | Variante idéntica, disponibilidad, fecha y restricciones visibles; no prometer beneficio ni confundir precio anunciado con venta realizada. Depende D01/A01/A03. |

### 5. Acabado, sostenibilidad y cierre — P2 salvo pruebas

| Tarea | Entregable | Aceptación / dependencia |
|---|---|---|
| E01 (M) Preferencias | Orden de secciones y ordenaciones guardadas | F5 conserva ajustes; restauración de predeterminados y almacenamiento bloqueado funcionan. |
| E02 (M) Idiomas | Completar en-US/es-MX antes de sumar idiomas | Sin etiquetas inglesas accidentales en detalle; fechas/números/nombres consistentes. |
| E03 (M) Ayuda/API/pie | Enlaces reales, explicación de métricas, contrato de API y atribuciones | Sin botones decorativos; documentación corresponde a endpoints reales; revisar licencias de bibliotecas/activos por separado. |
| E04 (L, opcional) Más regiones | Evaluar US completo antes de EU/TW/KR | Presupuesto de captura/retención definido; namespaces Retail aislados; no incluir Classic. |
| E05 (L) Calidad transversal | Accesibilidad, móvil, caché, cancelación, pruebas E2E y observabilidad | Teclado sin acciones dobles, 375/768/1440 px, recursos fallidos, latencia y listas grandes; presupuesto medido, no supuesto. |
| E06 (M) Refactorización dirigida | Extraer controladores de búsqueda/detalle y servicios/repositorios; estilos compartidos | Una responsabilidad por módulo; migrar por flujo con pruebas, no crear abstracciones solo para reducir líneas. |
| E07 (M, iniciar ahora) Cerrar observación de referencia | Recorrido reproducible de cada categoría, commodity/equipo/mascota/vivienda/token, favoritos/F5, Deals, filtros, footer y responsive | Registrar URL, fecha, captura y resultado; funciones Patreon solo con acceso legítimo; actualizar V/S/D/P sin asumir equivalencia por código. |

## Matriz de cierre por categoría

Ejecutar B02/B03 con un caso disponible y uno agotado cuando existan. En todas: nombre, icono, rareza, precio, stock, subastas, filtro, detalle, retorno y favorito tras F5.

| Categoría | Comprobación especializada |
|---|---|
| Armas | Tipo, mano, nivel efectivo, sufijo y terciarios. |
| Armaduras | Material, ranura, nivel efectivo, sufijo y terciarios. |
| Contenedores | Familia y clasificación; capacidad cuando el metadato esté disponible. |
| Gemas | Subtipo, expansión y rango de fabricación cuando corresponda. |
| Mejoras de objetos | Ranura/subtipo, variantes y rango. |
| Consumibles | Poción/frascos/comida, tiers independientes y stock regional. |
| Glifos | Clase y nombre localizado. |
| Componentes/Reagents | Revisar equivalencia semántica del nombre y taxonomía, no renombrar a ciegas. |
| Recetas | Profesión, expansión y clasificación. |
| Equipo de profesión | Profesión/ranura, nivel y variantes. |
| Viviendas | Decoración frente a tintes; calidad/asset correcto. |
| Mascotas | Especie, familia, nivel, calidad y raza; jaula no es identidad suficiente. |
| Objetos de misión | Clasificación y agotados. |
| Miscelánea | Subtipos y casos que no deben caer por defecto aquí. |
| Ficha de WoW | Flujo regional independiente, no listado genérico por itemClassId. |

## Decisiones de alcance

- Mantener las cinco columnas solicitadas aunque la referencia adapte sus columnas por categoría. Copiar capacidades útiles, no cada restricción comercial.
- Mantener oro/plata visualmente y cobre en cálculos/ordenación. Un importe inferior a una plata necesita una representación no engañosa.
- No convertir esta web en un simulacro de compra/venta: el alcance es consulta, análisis y cálculo de oferta. Cualquier transacción real exigiría una capacidad oficial separada, no observada en las fuentes revisadas.
- No deducir ventas, liquidez o tasa de venta a partir de desapariciones de subastas; pueden ser cancelaciones o expiraciones.
- Alertas, cuentas propias, sincronización en nube, exportación y calculadora de profesiones son propuestas futuras, no funciones de la referencia confirmadas en esta auditoría.
- No importar años de historia inventada. Retención y agregación comienzan con capturas reales; importaciones requieren fuente, licencia y autorización.
- No copiar bibliotecas o activos asumiendo que la licencia del repositorio cubre derechos de terceros.

## Siguiente entrega recomendada

Primero A06 + A02 + A01: pruebas de caracterización, arranque fiable y contrato de identidad. Después B01/B07: un favorito debe conservar exactamente su variante, icono, rareza y rango al abrir la web desde cero. En paralelo conceptual, cerrar E07 antes de comprometer equivalencia exacta de funciones todavía no observadas. No iniciar Deals/arbitraje hasta tener A03 y C05.

Definición de terminado por tarea: evidencia real, prueba focalizada, UI/endpoint coherentes, error y vacío cubiertos, documentación actualizada. HTTP 200 por sí solo no demuestra corrección funcional.
