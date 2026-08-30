---
version: alpha
name: "Descubriendo CR"
description: "Sistema visual móvil para descubrir Costa Rica con la calma material de un lodge contemporáneo del bosque nuboso."
colors:
  primary: "#0B6B4F"
  primary-soft: "#E8F5EF"
  secondary: "#0077A8"
  sand: "#F5EFE2"
  background: "#F7F8F8"
  surface: "#FFFFFF"
  text: "#151B1F"
  text-muted: "#68737A"
  border: "#DCE0E2"
  focus: "#0B8DB8"
  success: "#137A52"
  warning: "#B96708"
  danger: "#C33B3B"
  dark-background: "#0B0F12"
  dark-surface: "#151B1F"
  dark-text: "#F7F8F8"
  dark-primary: "#47C08A"
typography:
  display:
    fontFamily: "PlusJakartaSans_700Bold"
    fontSize: "36px"
    lineHeight: "44px"
  body:
    fontFamily: "PlusJakartaSans_400Regular"
    fontSize: "16px"
    lineHeight: "24px"
  label:
    fontFamily: "PlusJakartaSans_600SemiBold"
    fontSize: "14px"
    lineHeight: "20px"
  data:
    fontFamily: "PlusJakartaSans_500Medium"
    fontSize: "12px"
    lineHeight: "16px"
rounded:
  sm: "8px"
  control: "12px"
  lg: "16px"
  card: "20px"
  modal: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button:
    height: "48px"
    rounded: "{rounded.control}"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
  icon-button:
    width: "44px"
    height: "44px"
    rounded: "{rounded.pill}"
    backgroundColor: "{colors.surface}"
  card:
    rounded: "{rounded.card}"
    padding: "20px"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  empty-state:
    height: "192px"
    textColor: "{colors.text-muted}"
  skeleton:
    rounded: "{rounded.lg}"
    backgroundColor: "{colors.border}"
  bottom-sheet:
    rounded: "{rounded.modal}"
    backgroundColor: "{colors.surface}"
  global-header:
    height: "64px"
    backgroundColor: "{colors.background}"
---

# Descubriendo CR Design System

## Overview

### Creative North Star

La interfaz debe sentirse como entrar a un lodge contemporáneo en un bosque nuboso: piedra volcánica oscura, neblina clara, madera cálida sólo como matiz y vegetación intensa en puntos precisos. No imita una postal tropical; organiza información real de viaje con la serenidad y el rigor de una buena guía de campo.

### Product context and register

- **Audience and primary job:** residentes y visitantes que exploran destinos, fauna, comercios y movilidad en Costa Rica desde el teléfono.
- **Target market and evidence:** Costa Rica y turismo internacional; `README.md`, las rutas de `src/app` y el proveedor bilingüe `src/providers/app-provider.tsx` establecen el alcance.
- **Locales:** español de Costa Rica e inglés internacional. El selector `CR / Global` cambia idioma y moneda como una sola preferencia de visitante.
- **Usage scene:** uso móvil, con luz exterior, conectividad variable y decisiones breves durante recorridos. Los objetivos táctiles críticos miden al menos 44 px.
- **Register:** híbrido. La exploración puede expresar marca; logística, formularios, perfil y administración priorizan claridad de producto.
- **Memorable signature:** superficies de navegación translúcidas como neblina sobre el dosel, acompañadas por la rana de marca. El blur se reserva para header y overlays.
- **Restraint:** datos, formularios, listados y tarjetas permanecen silenciosos; una sola acción primaria por bloque.
- **Anti-references:** neón tropical, gradientes saturados, sombras pesadas, glassmorphism en cada tarjeta, iconos de múltiples familias y decoración de selva que compita con el contenido.
- **Token ownership/runtime mapping:** modelo B. `src/theme/tokens.json` es la fuente canónica; `src/theme/theme.ts` la expone a React Native y `tailwind.config.js` adapta roles semánticos a NativeWind. Este archivo refleja valores aceptados y explica su intención.

## Colors

`primary` es verde dosel y representa navegación/acción segura; `secondary` es azul Caribe para información y orientación. `sand` aporta calidez sólo en acentos editoriales. Los estados usan roles propios (`success`, `warning`, `danger`) y nunca dependen sólo del color.

La luz usa fondo neblina y superficies blancas; el modo oscuro usa carbón volcánico con bordes visibles. `focus` conserva contraste independiente de la marca. Los componentes consumen `ui-*` y `ui-dark-*`; no deben introducir hexadecimales locales.

## Typography

Plus Jakarta Sans es la voz única y geométrica. Display usa Bold con moderación; cuerpo Regular, etiquetas SemiBold y datos Medium. La jerarquía surge de tamaño, espacio y peso, no de mayúsculas permanentes. Etiquetas de datos pueden usar mayúsculas con tracking sólo cuando son breves. El ancho de lectura de texto continuo se limita aproximadamente a 60–70 caracteres.

## Layout

La base es una cuadrícula de 4 px con ritmos principales de 8, 16, 24 y 32 px. Pantallas usan 16 px laterales en móvil y 24 px en tablet/web; el contenido general no supera 1120 px y feeds no superan 720 px. La composición favorece una relación aproximada 62/38 entre contenido principal y contexto secundario cuando hay espacio, sin forzarla en teléfonos.

Safe areas, teclado y barras persistentes forman parte del layout. Skeletons, imágenes y errores reservan la geometría final. Cada pantalla tiene un solo dueño de scroll vertical.

## Elevation & Depth

La profundidad se expresa primero con cambio tonal y borde de 1 px. `shadow-card` es opcional para contenido flotante; `shadow-floating` se reserva para sheets y capas temporales. El blur aparece únicamente en navegación y overlays, con una capa opaca suficiente para preservar contraste. En modo oscuro las sombras ceden ante bordes y separación tonal.

## Shapes

Controles usan 12 px, tarjetas 20 px y sheets/modales 28 px en su borde superior. Los pills se limitan a filtros, estados o segmentos cortos. Los iconos Lucide mantienen trazos de 1.8–2 px y alineación óptica dentro de cajas de 40–44 px.

## Components

### Foundational visual states

Todo control interactivo cubre reposo, foco visible, presionado, deshabilitado y ocupado sin cambiar dimensiones. El foco usa `focus`; el estado deshabilitado reduce énfasis y bloquea eventos. El error siempre incluye texto. Skeleton es opcional y replica la geometría final; con movimiento reducido usa una opacidad casi estática.

### Buttons and actions

`Button` combina énfasis (`solid`, `outline`, `ghost`) con intención (`primary`, `neutral`, `success`, `danger`). Sólo una acción segura debe ser solid-primary por área. Danger solid se reserva para la confirmación irreversible. `IconButton` exige nombre accesible y caja táctil mínima de 40 px, preferiblemente 44 px.

### Navigation and data display

El header usa la firma translúcida, conserva el logotipo y agrupa cambio de visitante, tipo de cambio, tema y perfil. Tarjetas de datos son outlined por defecto; raised sólo cuando el contenido flota sobre otro nivel. Un empty state explica qué falta y ofrece una acción real cuando existe.

### Forms and overlays

Los campos mantienen 48 px de alto, etiqueta persistente y error textual. Las opciones breves pueden usar segmentos/chips; listas extensas requieren un control compartido. Bottom sheets se reservan para decisiones cortas y contextuales; formularios largos usan pantalla completa o modal con teclado seguro.

### Iconography

Lucide React Native es la familia canónica. El logotipo de rana es la única excepción ilustrada. Los iconos complementan etiquetas; sólo acciones universalmente reconocibles pueden ser icon-only y aun así requieren nombre accesible.

### Motion

El movimiento comunica jerarquía o cambio de estado: feedback 180 ms, contenido 260 ms y sheets alrededor de 320 ms con resorte contenido. No se reanima una lista completa después de cada render. Reduced Motion elimina desplazamientos y deja transiciones de opacidad breves.

### Content and data visualization

La voz usa verbos concretos, español costarricense natural e inglés directo. Acción y confirmación mantienen el mismo verbo. Fechas, moneda y cifras siguen el modo de visitante; gráficos deben acompañar color con etiquetas o patrones.

## Do's and Don'ts

- **Do:** permitir que fotografías, mapas y rutas sean el contenido expresivo principal.
- **Do:** reutilizar tokens y primitives de `src/components/ui` antes de crear estilos locales.
- **Do:** verificar luz, oscuro, exterior y movimiento reducido.
- **Don't:** usar blur o sombras como decoración en todas las superficies.
- **Don't:** introducir hexadecimales, radios o tiempos locales sin un rol semántico nuevo.
- **Don't:** sacrificar contraste, alcance táctil o estabilidad de layout por una animación.
