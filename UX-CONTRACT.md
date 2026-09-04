# UX Contract

## Product context

- **Audience:** residentes de Costa Rica y visitantes internacionales.
- **Primary jobs:** descubrir destinos/fauna, planificar desplazamientos, localizar comercios y administrar aportes personales.
- **Target markets:** Costa Rica e internacional, según `README.md` y `src/providers/app-provider.tsx`.
- **Active locales:** `es-CR` y `en-US`; el modo de visitante también define CRC/USD.
- **Language register:** español costarricense directo e inglés internacional simple; toda nueva copia visible y accesible debe existir en ambos modos.
- **Timezone/calendar:** calendario gregoriano; conservar la zona de origen cuando el dato lo requiera y usar Costa Rica para contenido local sin zona explícita.
- **Accessibility target:** WCAG 2.2 AA y objetivos táctiles de 44 px para acciones principales.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Permission model | `README.md`, `supabase/migrations/` | Contrato de repositorio / SQL RLS | 2026-08-30 |
| Data lifecycle | `supabase/migrations/`, `src/lib/` | Esquema y servicios de dominio | 2026-08-30 |
| Deletion / retention | No existe política mantenida | Bloqueo: no introducir borrado irreversible nuevo | 2026-08-30 |
| Billing / payment | `README.md`, `src/lib/billing.ts` | Contrato de producto / cliente | 2026-08-30 |
| Legal / regulatory copy | No existe fuente mantenida | Bloqueo: escalar antes de redactar afirmaciones legales | 2026-08-30 |
| Market / content conventions | `README.md`, `src/lib/i18n.ts`, `src/providers/app-provider.tsx` | Contexto de producto / localización | 2026-08-30 |

## Visual contract

- **Project design context:** `DESIGN.md`.
- **Token ownership:** sistema runtime existente canónico (modelo B).
- **Runtime source:** `src/theme/tokens.json`.
- **Adapters:** `src/theme/theme.ts` y `tailwind.config.js`; consumers compartidos en `src/components/ui/`.
- **Drift gate:** lint de `DESIGN.md`, typecheck/lint del proyecto y búsqueda de colores/radios duplicados al migrar pantallas.
- **Themes:** claro y oscuro, sin cambiar jerarquía semántica.
- **Review policy:** cualquier token durable cambia owner, adapter, primitives y `DESIGN.md` en el mismo changeset.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | No aplica hoy; la app móvil no ofrece tabla seleccionable | Este contrato | page / all-results sólo tras contrato de API | component + E2E |
| Select/Listbox | Segmentos para conjuntos breves; picker nativo cuando se acepta UI del SO | Este contrato + `DESIGN.md` | bounded segment / native | teclado, touch y popup |
| Date | Selector nativo cuando se acepta UI del SO | Este contrato | typed / native | locale + keyboard + device |
| Form | Controles React Native y validación de pantalla; migración futura a fields compartidos | Este contrato | create / edit | validación E2E |
| Scrollbar | `ScrollView` / `FlatList` nativos | Plataforma + este contrato | geometría por superficie | device/web |
| Toast | Estado inline persistente; no crear toasts locales hasta existir provider compartido | Este contrato | success / warning / info / error | live-region test al introducir provider |
| CRUD | Pantalla dueña + servicio en `src/lib` + RLS Supabase | API/RLS + este contrato | return / stay según ledger | full-flow E2E |

## Component behavior

| Component | Default | Hover | Focus | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | énfasis × intención | realce sólo web | ring visible | cambio tonal | opacidad + bloqueo | spinner estable + `busy` | mensaje en contexto |
| Icon button | nombre accesible | realce sólo web | ring visible | cambio tonal | opacidad + bloqueo | no duplica evento | mensaje en contexto |
| Input | etiqueta + valor | borde | borde/ring | n/a | legible | conserva ancho | texto asociado |
| Secret input | masked | borde | borde/ring | reveal por botón | legible | bloqueo de submit | nunca expone valor |
| Search | clear + debounce | borde | borde/ring | clear inmediato | explica razón | región estable | retry persistente |
| Textarea | alto suficiente | borde | borde/ring | n/a | legible | conserva contenido | texto asociado |
| Table/list | contenido estable | fila sólo web | foco en acción real | feedback local | acción bloqueada | stale content visible | retry sin borrar contexto |

## Dataset navigation

- **Admin data:** paginación de servidor cuando se introduzcan tablas extensas.
- **Catálogos de destinos:** provincias y categorías ordenan primero por cercanía y presentan lotes automáticos de 5 destinos; al acercarse al final se incorporan los siguientes 5, sin botón y conservando el mismo criterio de cercanía.
- **Feed social:** infinite scroll con alternativa accesible.
- **URL/route state:** conservar filtros, sort y contexto al volver cuando Expo Router lo permita; no persistir búsqueda sensible.
- **Empty/no-results/error/loading:** `EmptyState`, retry explícito, indicador estable; `Skeleton` sólo cuando coincide con geometría final.
- **Back/scroll restoration:** volver conserva el contexto de origen; un refresh explícito no debe saltar la posición sin necesidad.
- **Selection:** no existe selección masiva canónica; requiere contrato de alcance antes de implementarse.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Create | verbo de entidad | botón ocupado estable | lista/contexto dueño | confirmación inline compartida | valores preservados + retry | registro o título de lista | `src/app`, `src/lib` |
| Edit | Guardar cambios | botón ocupado estable | seguir flujo hermano | Cambios guardados | error inline, formulario abierto | dato actualizado | `src/app`, `src/lib` |
| Delete | verbo exacto | confirmación permanece abierta | contexto válido | resultado persistente | retry/cancel en overlay | siguiente elemento lógico | política de lifecycle requerida |
| Search | campo de búsqueda | contenido previo visible | misma ruta | conteo de resultados | clear/retry | input o heading de resultados | este contrato |
| Upload/background job | verbo del archivo | progreso real | contexto de origen | estado confirmado por servidor | retry/cancel y datos preservados | elemento subido | `src/lib` + Storage RLS |
| Registrar negocio | Publicar | botón ocupado; ubicación explícita requerida | panel del propietario | registro creado; fotos sincronizadas | formulario y selección preservados + retry | comercio recién creado | `register_commercial_service_v2` + RLS |
| Editar negocio propio | Guardar | botón ocupado estable | panel del propietario | perfil y métricas actualizados | formulario abierto + retry | resumen del comercio | `commercial_services` owner RLS |
| Cancel/back | Cancelar / Volver | ninguno | origen | ninguno | guard de cambios si aplica | trigger/contexto original | Expo Router |
| Soft-delete | Archivar / Desactivar | dialog busy | lista válida | Undo sólo si es real | dialog conserva contexto | siguiente elemento | pendiente de política mantenida |
| Hard-delete | Eliminar permanentemente | dialog danger busy | lista válida | confirmación persistente | verificar resultado antes de retry | siguiente elemento | bloqueado sin política mantenida |

- **Búsqueda de transporte:** la portada de Buses y ferris busca por nombre simultáneamente en rutas provinciales y cantonales; los ferris quedan explícitamente fuera de este buscador.
- **Búsqueda de destinos en Explorar:** las sugerencias forman una sola superficie; seleccionar un sitio abre su ficha en superposición, y cerrarla vuelve a Explorar con la consulta limpia, sin pasar por el catálogo.
- **Ubicación comercial:** al registrar o editar, el propietario puede autorizar la ubicación actual o marcar un punto directamente en el mapa; la app no infiere silenciosamente una coordenada regional.
- **Panel del propietario:** reúne edición completa, galería de hasta 12 imágenes, estado de suscripción y analítica basada únicamente en eventos realmente registrados; no inventa métricas ni proyecciones.

## Navigation and responsive behavior

- **Document title:** `{Pantalla} — Descubriendo CR` en web; loading/error deben reemplazar títulos obsoletos.
- **Route errors:** 404, 403 y error general se distinguen y mantienen navegación accesible.
- **Tabs/routes:** rutas independientes usan navegación; tabs sólo para vistas pares del mismo contexto.
- **Repetir pestaña activa:** al volver a presionar un botón de la barra inferior, la vista de esa pestaña sube de forma animada a su contenido principal; no cambia filtros ni datos seleccionados.
- **Bottom sheets:** elecciones cortas/contextuales; contenido largo o formularios con teclado usan pantalla/modal completa.
- **Responsive data:** tarjetas para registros independientes; scroll horizontal sólo cuando comparar columnas sea esencial.
- **Truncation:** valores importantes envuelven o ofrecen acceso explícito al valor completo, nunca sólo hover.
- **Focus/sticky:** safe areas, header, tab bar y teclado no pueden cubrir el foco.

## Overlays and feedback

- **Sheet surface:** `PremiumSheetBackground`, `SheetHandle` y `SheetSurface` en `src/components/ui/sheet-surface.tsx`, montados por Gorhom Bottom Sheet.
- **Confirmations:** overlay propio; consecuencias serias enfocan inicialmente Cancelar. No usar APIs nativas de alerta como sustituto de UI.
- **Toast:** pendiente un provider canónico; mientras tanto el feedback accionable permanece inline y no desaparece solo.
- **Alerts/banners:** inline para corrección local, banner de página para condición persistente y global sólo para interrupción general.
- **Unsaved changes:** conservar datos y confirmar salida mediante overlay propio cuando el formulario esté dirty.
- **Layer order:** dialog > bottom sheet/drawer > popover > futura cola de toast.

## Async and resilience

- Mutaciones financieras, permisos, borrado y acciones externas son pesimistas.
- Toda mutación bloquea duplicados y no anuncia éxito antes de confirmación del servidor.
- Refresh conserva contenido utilizable; respuestas viejas no pueden reemplazar estado nuevo.
- Offline conserva lectura cacheada cuando es seguro; escrituras sólo se encolan con contrato explícito de conflicto.
- Retry automático se limita a operaciones idempotentes y fallos transitorios; resultados inciertos se verifican antes de repetir.
- Sesión expirada preserva borradores no sensibles y retorna al flujo después de autenticación.
- Formularios y sheets permanecen abiertos al fallar una mutación, con valores y camino de recuperación.

## Validation

- Validar al enviar y luego al cambiar campos ya erróneos.
- Errores de campo aparecen junto al control; errores globales permanecen dentro del formulario.
- Preservar valores no sensibles después de error de red/servidor.
- Contraseñas/tokens se enmascaran, nunca aparecen en logs/toasts y no se almacenan fuera del mecanismo seguro aprobado.
- Primer campo inválido recibe foco/scroll; submit ocupado conserva dimensiones y bloquea duplicados.

## Permission and clipboard

- La UI refleja capacidades, pero Supabase RLS conserva autoridad. Falta de permiso autenticado usa 403/explicación, no login repetido.
- Ocultar acciones sólo cuando su descubrimiento no sea útil; deshabilitar con razón cuando ayude a entender requisitos.
- No copiar ni anunciar secretos. Valores truncados requieren acción explícita para ver/copiar el completo cuando la política lo permita.

## Migration status

- **Canonical primitives:** `src/components/ui/` para Button/IconButton, Card/GlassSurface, EmptyState, Skeleton y superficies de sheet.
- **Current slice:** header global y fundaciones visuales.
- **Legacy:** `src/components/ui.tsx` y estilos locales continúan durante migración por flujo; no ampliar sus variantes.
- **Rollout:** migrar verticalmente pantallas de mayor tráfico y comprobar luz/oscuro/errores antes de retirar cada primitive legacy.

## Verification

- **Static:** `npm run typecheck`, `npm run lint`, `designmd lint`, premium strict audit y `git diff --check`.
- **Device matrix:** Android/iOS/web; teléfono angosto y tablet; ES/EN; claro/oscuro; Reduced Motion.
- **Accessibility:** roles/nombres, 44 px en acciones principales, foco web visible, contraste y lector de pantalla en flujos críticos.
- **Canonical sibling:** header y tarjetas del flujo Explorar como primera referencia de migración.
- **Runtime gaps:** no hay suite de componentes/visual regression mantenida; debe agregarse al migrar pantallas completas.
