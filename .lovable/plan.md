# Plan — Flujo completo de inscripción, aprobación y onboarding

## 1. Login limpio (quitar auto-registro público)
- `/auth`: eliminar modo "signup". Solo iniciar sesión.
- Mantener el enlace **"Inscripción de cliente nuevo →"** apuntando a `/inscripcion`.
- Las cuentas del **sistema** (admin / recepción / entrenador) se crean **solo desde el dashboard** en `/settings → Usuarios`, donde un admin define email, contraseña inicial y rol. Si el usuario no existe ahí, no puede entrar.
- Nota: la primera cuenta sigue siendo admin automática (para el bootstrap inicial).

## 2. Inscripción pública con aprobación
- `/inscripcion` se vuelve un wizard multi‑paso **configurable** (ver §3).
- Al enviar, se crea un registro en `inscription_requests` con estado `pending` (NO se crea usuario auth todavía).
- Nuevo panel en dashboard: **"Solicitudes pendientes"** con botones por fila:
  - **Ver detalles** (datos completos + objetivos)
  - **Registrar pago** (transferencia / efectivo / tarjeta — reutiliza el módulo de pagos existente)
  - **Aprobar y dar acceso** → crea miembro, crea usuario auth con contraseña temporal, asigna plan, genera factura
  - **Rechazar** (con motivo)
- El dashboard principal mostrará un contador/tarjeta de "Solicitudes pendientes" arriba.

## 3. Formularios e inscripción configurables desde el dashboard
- Nueva sección **Settings → Inscripción**.
- Admin puede:
  - Agregar/quitar/reordenar **pasos** del wizard (mínimo 1).
  - Por paso: título, descripción, y lista de **campos** (label, tipo: texto / número / email / teléfono / fecha / select / textarea / checkbox, requerido sí/no, opciones para select).
- Se guarda como JSON en tabla `inscription_form_config` (una sola fila activa, versionada).
- `/inscripcion` lee la config activa y renderiza dinámicamente.
- Las respuestas se guardan como JSON dentro de `inscription_requests.form_data` además de los campos fijos (nombre, email, teléfono, plan deseado).

## 4. Asistente de objetivos del miembro
- Tras la aprobación, el miembro recibe credenciales y entra a un **portal de miembro** (`/_member/...`) — separado del dashboard staff.
- Primera pantalla: **Asistente IA** (Lovable AI Gateway, modelo `google/gemini-2.5-flash`) que conversa para entender:
  - Objetivo principal (bajar peso, ganar músculo, resistencia, rehabilitación, otro)
  - Nivel de experiencia, lesiones, disponibilidad, preferencias
- Al cerrar la conversación, guarda un **resumen estructurado** en `member_goals` (objetivo, notas, prioridad, fecha).
- Visible en el perfil del miembro para admin y **entrenadores asignables**. Notifica a admin (badge "Nuevos objetivos sin asignar entrenador").

## 5. Facturación al aprobar
- Al aprobar una solicitud y registrar el pago, se genera automáticamente una **factura** (`invoices`):
  - Número correlativo, miembro, plan, monto, método, fecha, estado pagado.
  - Vista de factura imprimible/PDF-friendly en `/payments/invoices/:id`.
- Listado **Facturas** dentro de Pagos.

## 6. Cambios de datos (resumen)

```text
tablas nuevas:
  inscription_form_config(id, version, config jsonb, active, created_at)
  inscription_requests(id, status[pending|approved|rejected], full_name, email,
                        phone, desired_plan_id, form_data jsonb, payment_id?,
                        notes, created_at, decided_at, decided_by)
  member_goals(id, member_id, summary, raw_conversation jsonb, priority,
               assigned_trainer_id?, created_at)
  invoices(id, number, member_id, plan_id, payment_id, amount, method,
           status, issued_at)

cambios:
  - quitar signup público de /auth
  - settings: nuevas pestañas "Usuarios del sistema" e "Inscripción"
  - dashboard: tarjeta + tabla de solicitudes pendientes
  - nuevo portal miembro (/_member) con chat IA
  - RLS: solicitudes y configs solo staff; member_goals visibles a admin/entrenadores asignados; invoices a admin y dueño
```

## 7. Orden de implementación sugerido
1. Migración DB (tablas + RLS + grants).
2. Quitar signup de `/auth` + gestión de usuarios del sistema en Settings.
3. Config de formulario + `/inscripcion` dinámico + tabla de solicitudes en dashboard.
4. Flujo aprobar → crear miembro + auth user + factura + pago.
5. Portal miembro + asistente IA + member_goals + asignación a entrenador.

---

## Preguntas antes de empezar (rápidas)
1. **Credenciales del miembro aprobado**: ¿genero contraseña temporal y la muestro al admin para que se la entregue, o prefieres que se envíe por email automático?
2. **Portal del miembro**: ¿lo construyo ahora completo (con asistente IA) o lo dejamos para una segunda iteración y en esta entrega solo dejo el flujo hasta "aprobado + factura"?
3. **Factura**: ¿basta con una vista web imprimible, o quieres descarga PDF real?
4. **Asignar entrenador**: ¿el admin lo asigna manualmente desde el perfil del miembro, o quieres que cada entrenador "tome" solicitudes desde su propia bandeja?

Con tus respuestas arranco con la migración y el resto en orden.
