# Planes de esta sesión

Copia de los planes aprobados, para poder consultarlos desde el propio repo (el original vive en `C:\Users\socwu\.claude\plans\fuzzy-juggling-lovelace.md`, fuera del proyecto).

---

## Plan 1 (ya implementado y desplegado): Separar "corazón" (interés) de "asistencia" (RSVP) en events

### Contexto

Hoy un único registro `Favorite` (`{userId, eventId, createdAt}`) representa dos cosas a la vez: "me interesa este evento" (el corazón que se ve en `event-card`/Explorer/Events/Favoritos) y "voy a asistir" (lo que alimenta la lista de asistentes de `event-detail`, el contador, el permiso para subir fotos a la galería del evento, y las notificaciones al organizador). El usuario pide separarlas: el corazón pasa a ser un simple "me gusta" sin más efecto que aparecer marcado y listado en Favoritos; "asistir" pasa a ser una acción explícita y distinta, con las implicaciones reales (lista de asistentes, contador, permiso de galería, notificación al organizador). El organizador y los co-organizadores aceptados siguen obteniendo ambas cosas automáticamente, como hoy - eso no cambia.

Contexto adicional que el usuario ha dado para más adelante (no se implementa ahora, solo para que el diseño de hoy no lo bloquee): un evento podrá tener una galería "privada" y un chat, visibles solo para sus asistentes reales, mientras el evento en sí sigue siendo público/descubrible por cualquiera (para servir como "gestor" de un curso/taller de una academia). Por eso es importante que la lista de "asistentes reales" quede como una fuente de autorización limpia y separada, no mezclada con quién ha dado al corazón - este plan deja exactamente esa base lista.

### Resumen de la propuesta

Nuevo dominio `attendance` (backend) y su reflejo en frontend, con la misma forma que el ya existente `favorite` - no una refactorización del propio `Favorite` en dos flags, sino un segundo dominio pequeño y con una sola responsabilidad, igual que `EventManager` ya convive como dominio separado de `Favorite` hoy.

- **`Favorite`** (existente, casi sin cambios): pasa a significar únicamente "me gusta". `addToFavorites`/`removeFromFavorites` dejan de notificar al organizador (eso se va a Attendance) y de ser la fuente de la lista de asistentes/contador/permiso de galería.
- **`Attendance`** (nuevo): `{userId, eventId, createdAt}`, índice único compuesto igual que Favorite. Es la fuente real de: lista de asistentes (`event-detail`), contador, permiso de `assertCanPostPhoto`, notificación `event_attendee` al organizador, y el recordatorio diario (`EventReminderService`).

### Decisiones de diseño

1. Marcar "Asistiré" también marca el corazón automáticamente (no al revés). Quitar el corazón después NO quita la asistencia, y dejar de asistir NO quita el corazón - a partir de ahí son independientes.
2. Un organizador que expulsa a un asistente (`removeParticipant`) le quita la asistencia y el rol de gestor, pero no le toca el corazón.
3. El modal "¿solo este día o toda la serie?" se mueve a la acción de Asistir. El corazón se vuelve un toggle simple e inmediato por instancia.
4. Notificaciones de actualización de evento y recordatorio diario pasan a avisar solo a asistentes reales (+ organizador/gestores).
5. La pestaña Favoritos sigue mostrando eventos con corazón (organizador + liked) - la pastilla de filtro "Asistente" pasa a filtrar por asistencia real.

### Backend

Nuevo módulo `src/modules/attendance/` calcado en forma a `src/modules/favorite/` (schema/dto/repository/service/controller/module, mismo patrón `useFactory`/`inject`, mismos getters lazy vía `ModuleRef`). `EventAttendeeDto` se movió desde `favorite.dto.ts`. Cambios en ficheros existentes: `favorite.service.ts` (pierde notificación y `getEventAttendeesDetailed`), `event.service.ts` (`createEvent*` también crea Attendance para el creador; `assertCanPostPhoto` usa `attendanceService.isAttending`; `notifyAttendeesOf*` usa `attendanceService.findByEvent`), `event-manager.service.ts` (`respondToInvite` llama a ambos servicios; `removeParticipant` solo a Attendance), `gallery.service.ts` (fan-out usa `attendanceService.getEventAttendeesDetailed`), `event-reminder.service.ts` (usa `AttendanceRepository`).

### Frontend

`src/app/models/attendance/attendance.model.ts` y `src/app/services/attendance/attendance.service.ts` (nuevos, calcados de los de favorite). `event-card`: `isAttending` → `isLiked`, `attendToggle` → `likeToggle`. `event-detail.page`: corazón (like, toggle simple) y botón "Asistir" (nuevo, reutiliza el modal de serie) separados, con contadores tipo insignia (badge) para ambos, iconos persona+/persona− para asistir y personas/corazón con contador. `events.page`/`favorites.page`/`user-events.page`: heart simplificado a toggle inmediato sin modal de serie; pastilla "Asistente" filtra por asistencia real.

### Migración de datos (ejecutada)

Script de backfill (`src/scripts/backfill-attendance.ts`, ya borrado tras usarse) que copió cada `Favorite` existente a un `Attendance` equivalente, dejando los `Favorite` intactos. Resultado real: 928 Favorite escaneados → 928 Attendance creados, 0 ya existentes, 0 inválidos.

### Estado: **desplegado** en GitHub, Render, Vercel y Firebase App Distribution (commit "Refactor separación Asistir y Corazón").

---

## Plan 2 (en curso): Fase 1 - Galería privada por evento (solo asistentes/organizadores)

### Contexto

Dentro de un evento, además de la "Galería" pública actual (visible para cualquiera), se añade una **galería privada** visible solo para asistentes reales y organizadores/coorganizadores - primer paso hacia usar el evento como "gestor" de un curso/taller de una academia (compartir fotos/vídeos de clases internamente). El xat en tiempo real (WebSocket) planteado en la misma conversación queda como **Fase 2, aparte**, ya diseñado pero no se implementa en esta tanda - ver nota al final.

Requisito añadido por el usuario sobre la marcha: una foto no es simplemente "privada O pública" de forma fija - debe poder **reclasificarse después de publicada**:
- **Compartir una privada también en pública**: la foto pasa a verse en AMBAS galerías del evento (privada y pública) a la vez, y por tanto también en la galería personal de quien la subió.
- **Mover una pública (compartida por error) a privada**: la foto deja de verse en la pública y pasa a verse únicamente en la privada.

Esto significa que **no basta un único booleano `isPrivate`** - hacen falta dos flags independientes por foto, porque el estado "visible en ambas" es real y distinto de "solo privada"/"solo pública".

**Duda planteada por el usuario, resuelta**: si una foto queda "solo privada", ¿debería seguir viéndose en la galería personal del usuario que la subió (pública, visible para cualquiera)? **Recomendación aplicada: no** - la galería personal del usuario se filtra por el mismo flag "visible en pública" que gobierna la galería pública del evento.

### Backend - dominio `gallery` existente, sin módulo nuevo

- `gallery.schema.ts`: dos flags independientes `showInPublicGallery: boolean` y `showInPrivateGallery: boolean` (en vez de un único `isPrivate`). Solo aplican cuando `eventId` está presente.
- **Migración de datos existentes (backfill obligatorio, pendiente de ejecutar)**: la galería pública ya tiene fotos reales en producción sin estos campos - sin backfill, una query `{ showInPublicGallery: true }` no encuentra esos documentos. Script puntual (mismo patrón que `backfill-attendance.ts`) que pone `{ showInPublicGallery: true, showInPrivateGallery: false }` en toda foto con `eventId` que no tenga aún estos campos.
- `gallery.service.ts`: `getEventGalleryDetailed` filtra `showInPublicGallery: true`; `getUserGalleryDetailed` incluye la foto si `!eventId` o `showInPublicGallery: true`; nuevo `getPrivateEventGalleryDetailed` (gateado por `assertCanAccessPrivateArea`, filtra `showInPrivateGallery: true`); `postPhoto` sin cambios de firma; nuevo `postPrivatePhoto` (gateado por `assertCanAccessPrivateArea`, no por `assertCanPostPhoto`); nuevo `shareToPublicGallery` (poster/gestor, pone `showInPublicGallery: true`); nuevo `moveToPrivateGallery` (poster/gestor + `assertCanAccessPrivateArea`, pone `showInPrivateGallery: true, showInPublicGallery: false`); `deletePhoto` sin cambios.
- `EventService.assertCanAccessPrivateArea` (nuevo): creador, gestor aceptado, o asistente real pasan - a diferencia de `assertCanPostPhoto`, no depende de `allowAttendeePhotos`. Lo reutilizará también el xat de la Fase 2.
- Controladores: `gallery.controller.ts` añade `PATCH /:photoId/share-public` y `PATCH /:photoId/move-private`; nuevo `private-gallery.controller.ts` (`api/events/:eventId/private-gallery`, GET+POST), registrado en `gallery.module.ts`.

### Frontend

- `gallery.service.ts`: nuevos `getPrivateEventGallery`, `postPrivateEventPhoto`, `sharePhotoToPublicGallery`, `movePhotoToPrivateGallery`.
- `event-detail.page`: `detailViewMode` gana `'privateGallery'`; nuevo icono en el toggle, visible solo si `canManage() || isAttending()`; sección nueva calcada de la galería pública; el botón "Añadir foto" se extiende a esta pestaña.
- `PhotoLightboxComponent` (hoy puramente presentacional): nuevo input `actions?: LightboxAction[]` (mismo espíritu que `UserCardAction`) con botones "Compartir en galería pública"/"Mover a galería privada" según contexto y permisos.
- i18n: etiquetas/estados vacíos de la pestaña nueva y de las dos acciones del lightbox.

### Verificación

1. Backend: `tsc --noEmit` + `nest build`.
2. Backend: script de verificación desechable (no-asistente → 403; privada no aparece en pública ni en galería del user; `shareToPublicGallery`/`moveToPrivateGallery` mueven correctamente entre estados; solo poster/gestor puede reclasificar).
3. Backend: ejecutar el backfill contra la base real y enseñar el resumen.
4. Frontend: `tsc --noEmit` + `ng build --configuration production`.
5. Prueba manual end-to-end en la app.

### Fase 2 (más adelante, no se implementa ahora): xat en tiempo real

WebSocket real (Socket.IO + `@nestjs/websockets`, con `socket.io-client` en el frontend), nuevo dominio `event-chat` (schema/dto/repository/service/controller + gateway con autenticación propia en el handshake vía Firebase, réplica manual de `FirebaseAuthGuard`+`CurrentUserInterceptor`), reutilizando `EventService.assertCanAccessPrivateArea`. Diseño ya acordado con el usuario, se retoma cuando se aborde esta fase.
