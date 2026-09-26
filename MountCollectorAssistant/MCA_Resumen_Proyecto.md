# Proyecto: Mount Collector Assistant (MCA)

## Objetivo principal

Estamos desarrollando un addon para **World of Warcraft Retail**
enfocado exclusivamente en **coleccionistas de monturas**.

La filosofía del proyecto es:

> Hacer el mejor addon para seguir el progreso de monturas que requieren
> tareas diarias, semanales, reputaciones o cadenas de progreso.

Pero **por ahora NO queremos hacer todo**.

## Objetivo actual

Solo queremos desarrollar el módulo de **Briggul (Dragonflight)** al
**100%**.

No queremos agregar todavía:

-   Shadowlands
-   Maelie
-   Draenor
-   Patient Bufonid
-   Blanchy
-   Base de datos compleja
-   Reputaciones
-   Logros

Todo eso será después.

## Funcionalidad de la primera versión

Al escribir:

``` text
/mca
```

Debe abrirse una ventana que muestre:

``` text
Mount Collector Assistant

BRIGGUL

✔ Scooter el caracolillo
✔ Caracol oxidado
🟡 Caracol espirazón (Nivel 18)
❌ Don Urgencio
❌ Microlícido

-----------------------

Listos para mostrar:
8

Obtenidos:
11 / 15
```

Debe existir un botón **Actualizar** que vuelva a escanear la colección
de mascotas.

## Qué debe detectar automáticamente

El addon recorrerá toda la colección de mascotas usando la API del Pet
Journal.

Para cada mascota válida deberá detectar:

-   Si existe
-   Si está aprendida
-   Nivel actual
-   Si está al nivel 25

Estados:

-   ✔ Lista
-   🟡 Falta subir
-   ❌ No obtenida

## Mascotas válidas para Briggul

-   Scooter el caracolillo
-   Caracol oxidado
-   Caracol rastroseda
-   Caracol espirazón
-   Caracol valvabrillo
-   Caparazón blando de amatista
-   Caparazón blando prismático
-   Caracola caparazón de barro
-   Buccino rapana
-   Reptador negroabismo
-   Don Urgencio
-   Microlícido
-   Helícido depredador
-   Arquetipo de vigilancia
-   Zoom

**Astuto NO sirve.**

**Brulee NO sirve.**

## Arquitectura actual

``` text
MountCollectorAssistant
│
├── MountCollectorAssistant.toc
├── Core.lua
├── Data.lua
├── Utils.lua
├── Pets.lua
├── UI.lua
│
└── Modules
      └── Briggul.lua
```

## Estado actual

El addon aparece en WoW pero figura como:

-   Incompatible
-   Con un signo rojo

## Información importante

Cliente:

-   WoW Retail
-   Versión 12.0.7
-   Build 68453

El archivo `.toc` debe comenzar con:

``` toc
## Interface: 120007
```

## Próximo paso

Antes de escribir más código hay que hacer que el addon cargue
correctamente revisando `MountCollectorAssistant.toc`.

## Forma de trabajo

Cada respuesta contendrá un archivo completo.

Ejemplo:

1.  Core.lua
2.  UI.lua
3.  Briggul.lua

Siempre se prueba antes de continuar.

## Objetivo inmediato

Conseguir que:

``` text
/reload
```

cargue correctamente el addon y aparezca:

``` text
[MCA] Mount Collector Assistant cargado.
```

Después implementaremos:

1.  `/mca`
2.  Ventana movible
3.  Botón "Actualizar"
4.  Escaneo automático de las 15 mascotas válidas para Briggul
5.  Indicador de:
    -   obtenida
    -   nivel
    -   lista para entregar
    -   no obtenida

No avanzar a nuevas funcionalidades hasta que Briggul esté completamente
terminado.
