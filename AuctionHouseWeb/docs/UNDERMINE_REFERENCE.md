# Referencia funcional: Undermine Exchange

## Decisión

Undermine Exchange es una referencia de producto y de interacción, no nuestra fuente de datos. Nuestro proyecto seguirá obteniendo subastas y metadatos desde Blizzard. No se hará scraping ni se dependerá de endpoints privados de Undermine.

## Qué ofrece su API pública

- Precios actuales e históricos por región, connected realm e item.
- Datos regionales para commodities y datos por connected realm para equipo.
- Variantes por nivel de objeto y sufijo en endpoints restringidos.
- Índices especiales de estadísticas terciarias (Speed, Leech, Avoidance e Indestructible) en acceso restringido.
- No entrega metadatos de catálogo como nombres, iconos, calidad o taxonomía; su documentación indica que esos datos deben provenir de Blizzard.
- Tiene un límite publicado de 3000 puntos por hora y requiere una clave vinculada al esquema de acceso del sitio.

Por ser un proyecto abierto y gratuito, el MVP no dependerá de una API de pago. Los históricos propios se construirán guardando snapshots de Blizzard.

## Taxonomía exacta de Armor

La fuente abierta del frontend define Armor como clase `4` y este árbol:

- Plate (`subclass 4`)
- Mail (`subclass 3`)
- Leather (`subclass 2`)
- Cloth (`subclass 1`)
- Miscellaneous (`subclass 0`)
- Cosmetic (`subclass 5`)

Plate, Mail, Leather y Cloth contienen: Runecarving, Head, Shoulder, Chest, Waist, Legs, Feet, Wrist, Hands, Speed, Leech, Avoidance e Indestructible.

Miscellaneous contiene: Runecarving, Neck, Back, Finger, Trinket, Held In Off-hand, Shields, Shirt, Head, Speed, Leech, Avoidance e Indestructible. Hay dos excepciones importantes:

- Back usa `subclass 1` e `inventory type CLOAK`, aunque visualmente esté dentro de Miscellaneous.
- Shields usa `subclass 6`, no `subclass 0`.

## Comportamiento que replicamos

1. Solo una categoría principal puede estar abierta; pulsarla otra vez la cierra.
2. Solo una subcategoría puede estar abierta; pulsarla otra vez vuelve al filtro de la categoría padre.
3. Solo una hoja puede estar seleccionada; pulsarla otra vez vuelve al filtro de la subcategoría.
4. La categoría y subcategoría abiertas usan brillo amarillo; la hoja seleccionada usa una banda violeta.
5. Cambiar el árbol o el texto prepara criterios. Los resultados cambian al pulsar Search o Enter.
6. El desplazamiento permanece dentro del panel lateral y del panel de resultados, no en la ventana.

## Brecha de datos conocida

El colector conserva ahora `context`, `bonus_lists` y `modifiers` en una variante canónica y calcula precios por variante. Las estadísticas terciarias se reconocen mediante los bonus IDs publicados en el dataset generado de Project Shatari. Runecarving (`extraFilters: [11]`) sigue pendiente: no equivale a Socketed y no se activará hasta disponer de una regla verificable para ese filtro especial. Nunca se simularán resultados.

### Modelo local de variantes

- `auction_variants` guarda la clave SHA-256 canónica, contexto, bonus IDs, modificadores y terciarias detectadas.
- `variant_price_snapshots` guarda precio mínimo, cantidad y anuncios para cada variante en cada captura.
- La API de Armor devuelve una fila por variante, de modo que dos versiones del mismo `itemId` ya no mezclan silenciosamente sus precios.

## Fuentes primarias

- [Documentación pública de Undermine Exchange](https://undermine.exchange/api.html)
- [Frontend abierto Project Shatari](https://github.com/erorus/shatari-front)
- [Backend abierto Project Shatari](https://github.com/erorus/shatari)

Los repositorios de Project Shatari se publican bajo Apache-2.0. Esta implementación reescribe el comportamiento dentro de nuestra arquitectura y conserva esta referencia de procedencia.
