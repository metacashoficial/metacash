# MetaCash

Aplicación web de finanzas personales: metas de ahorro, ingresos y gastos, horarios de trabajo, recordatorios, planificador e historial con exportación a CSV. React + Vite en el frontend y Supabase (Auth + Postgres + Realtime) como backend.

---

## Puesta en marcha (15 minutos)

### 1. Crea el proyecto en Supabase
1. Entra a <https://supabase.com/dashboard> y crea un proyecto nuevo (elige una región cercana, p. ej. *East US*).
2. Guarda la contraseña de la base de datos en un lugar seguro.

### 2. Crea las tablas y la seguridad
1. En tu proyecto ve a **SQL Editor › New query**.
2. Pega todo el contenido de `supabase/schema.sql` y pulsa **Run**.

Esto crea:

| Tabla | Para qué sirve |
|---|---|
| `preferences` | Nombre, moneda, tema, objetivo diario (una fila por usuario) |
| `goals` | Metas de ahorro |
| `transactions` | Ingresos y gastos |
| `work_schedules` | Horario semanal (7 filas por usuario) |
| `work_sessions` | Jornadas trabajadas (entrada / salida) |
| `reminders` | Recordatorios |

Además:
- **RLS activado en todas las tablas**: cada política exige `auth.uid() = user_id`, así que un usuario solo puede leer, crear, editar o borrar sus propias filas. Los visitantes sin sesión no tienen acceso a nada.
- Un trigger que, al registrarse alguien, le crea sus preferencias y un horario base (lunes a viernes, 9:00 a 17:00).
- La función `adjust_goal` para aportar o retirar de una meta sin errores si usas dos dispositivos a la vez.
- Las tablas se agregan a **Realtime**, para que los cambios aparezcan al instante en tus otros dispositivos.

El archivo se puede ejecutar varias veces sin romper nada.

### 3. Conecta la app con tus variables de entorno
1. En Supabase ve a **Project Settings › API** (o el botón **Connect**).
2. Copia el archivo `.env.example` como `.env` y llena:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-o-publishable
VITE_ALLOWED_EMAIL_DOMAINS=gmail.com
VITE_SITE_URL=
```

- Usa la clave **anon** (o la nueva **publishable**, `sb_publishable_…`). Es pública por diseño: la seguridad la dan las políticas RLS.
- **Nunca** pongas la `service_role` / `secret` key en el frontend.
- `VITE_ALLOWED_EMAIL_DOMAINS=gmail.com` hace que el registro solo acepte correos `@gmail.com`. Déjalo vacío para aceptar cualquier correo.
- `VITE_SITE_URL` es opcional: la URL pública de tu app. Si está vacía se usa la dirección actual del navegador.

### 4. Ejecuta la app
Requiere Node.js 18 o superior.

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>.

---

## Configurar el correo: registro, inicio de sesión y recuperación de contraseña

La app usa **correo + contraseña** de Supabase Auth. No usa Google OAuth: un correo de Gmail funciona como cualquier otro correo.

### A. Activa el proveedor Email
**Authentication › Sign In / Providers › Email**
- **Enable Email provider**: activado.
- **Confirm email**: activado (recomendado). El usuario recibe un correo y debe abrir el enlace antes de poder entrar.
- **Minimum password length**: 8 (la app ya exige 8 caracteres con letras y números).
- Deja **Google** y demás proveedores desactivados.

### B. URLs de redirección (imprescindible)
**Authentication › URL Configuration**
- **Site URL**: la dirección donde vive tu app.
  - En desarrollo: `http://localhost:5173`
  - En producción: p. ej. `https://metacash.vercel.app`
- **Redirect URLs**: agrega todas las direcciones desde las que usarás la app:
  - `http://localhost:5173/**`
  - `https://metacash.vercel.app/**` (tu dominio real)

Si falta una URL, los enlaces de confirmación o de recuperación te mandarán a otra dirección o fallarán.

### C. Servidor de correo (SMTP) — necesario para usuarios reales
El correo incluido de Supabase es solo para pruebas: envía muy pocos correos por hora y, en proyectos nuevos, solo a las direcciones de los miembros de tu equipo en Supabase. Para que cualquier persona reciba sus correos, configura un SMTP propio en **Authentication › Emails › SMTP Settings** (activa *Enable Custom SMTP*).

**Opción con tu propia cuenta de Gmail** (sencilla para uso personal o pocos usuarios):
1. En tu cuenta de Google activa la **verificación en dos pasos**.
2. Crea una **contraseña de aplicación** en <https://myaccount.google.com/apppasswords> (16 caracteres).
3. En Supabase llena:

| Campo | Valor |
|---|---|
| Sender email | tucorreo@gmail.com |
| Sender name | MetaCash |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | tucorreo@gmail.com |
| Password | la contraseña de aplicación (sin espacios) |

Gmail limita los envíos diarios, así que para muchos usuarios conviene un servicio como Resend, Brevo, SendGrid o Amazon SES (todos dan host, puerto, usuario y contraseña para pegar en el mismo formulario).

Después, en **Authentication › Rate Limits** puedes subir el límite de correos por hora.

### D. (Opcional) Plantillas en español
En **Authentication › Emails › Templates** puedes traducir los mensajes. Mantén siempre la variable `{{ .ConfirmationURL }}` en el enlace. Ejemplo para **Reset Password**:

```html
<h2>Restablece tu contraseña</h2>
<p>Recibimos una solicitud para cambiar la contraseña de tu cuenta de MetaCash.</p>
<p><a href="{{ .ConfirmationURL }}">Crear nueva contraseña</a></p>
<p>Si no fuiste tú, ignora este correo.</p>
```

Y para **Confirm signup**:

```html
<h2>Confirma tu cuenta</h2>
<p>Gracias por registrarte en MetaCash. Confirma tu correo para empezar:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi correo</a></p>
```

### Cómo funciona cada flujo en la app
- **Registro**: nombre (opcional), correo y contraseña. Si *Confirm email* está activo, aparece la pantalla «Revisa tu correo» con un botón para reenviar el enlace. Al abrirlo, el usuario entra directamente.
- **Inicio de sesión**: correo y contraseña. Los errores aparecen en español (contraseña incorrecta, correo sin confirmar con opción de reenviar, demasiados intentos…).
- **Recuperar contraseña**: «¿Olvidaste tu contraseña?» › se envía el correo › el enlace abre MetaCash en la pantalla «Crea una nueva contraseña». Si el enlace expiró, la app lo indica y ofrece pedir otro.
- **Cerrar sesión**: en Ajustes (o en la barra lateral). También hay «Cerrar sesión en todos los dispositivos».
- **Sesión persistente**: la sesión se guarda en el dispositivo y el token se renueva solo, así que no tienes que entrar cada vez.

### (Opcional) Exigir Gmail también en el servidor
La variable `VITE_ALLOWED_EMAIL_DOMAINS` valida en la app. Si quieres que Supabase rechace cualquier registro que no sea `@gmail.com` (aunque alguien use la API directamente), quita los comentarios del bloque final de `supabase/schema.sql` y vuelve a ejecutarlo.

---

## Publicar en internet
Funciona en cualquier hosting estático (Vercel, Netlify, Cloudflare Pages…). La app usa rutas con `#`, así que no necesitas configurar redirecciones.

**Vercel**
1. Sube el proyecto a GitHub e impórtalo en Vercel (detecta Vite solo).
2. En **Settings › Environment Variables** agrega `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALLOWED_EMAIL_DOMAINS` y `VITE_SITE_URL`.
3. Despliega y agrega tu dominio en Supabase (**Site URL** y **Redirect URLs**, paso B).

Las variables `VITE_*` se insertan al compilar: si las cambias, vuelve a desplegar.

---

## Cómo calcula MetaCash

- **Dinero disponible** = ingresos − gastos − lo que apartaste en metas con «Aportar». Si corriges a mano el «ahorro actual» de una meta, no afecta tu disponible (se toma como dinero que ya tenías ahorrado).
- **Ahorro acumulado** = suma de lo que llevas en todas tus metas.
- **Planificador**: lo que falta ÷ días hasta la fecha límite. Por jornada y por hora usa tu horario real (los días activos y sus horas). Si activas «Incluir mis gastos», suma tu gasto promedio diario de los últimos 30 días. También proyecta en qué fecha llegarías a tu ritmo actual.
- **Objetivo diario**: el de cada día en tu horario; si un día no tiene, se usa el objetivo general de Ajustes.

## Recordatorios
Se guardan en Supabase y se sincronizan entre dispositivos. Suenan como notificación del sistema (si das permiso) y como aviso dentro de la app **mientras MetaCash esté abierta** en una pestaña o instalada en el teléfono (Agregar a pantalla de inicio). Las notificaciones con la app totalmente cerrada requerirían un servidor de notificaciones push, que no forma parte de este proyecto.

## Estructura

```
supabase/schema.sql      Tablas, RLS, triggers, función y realtime
src/lib/supabase.js      Cliente de Supabase y mensajes de error en español
src/context/             Sesión (AuthContext), datos + sincronización (DataContext), avisos
src/pages/               Inicio, Ganancias y gastos, Metas, Planificador, Horario,
                         Recordatorios, Historial, Ajustes, Acceso
src/components/          Gráficos SVG interactivos, iconos, formularios y UI
src/lib/                 Cálculos financieros, formato, CSV, recordatorios
```

## Problemas comunes

| Síntoma | Solución |
|---|---|
| Pantalla «Falta conectar Supabase» | Falta el `.env` o reiniciar `npm run dev` después de crearlo. |
| «No pudimos cargar tus datos… faltan las tablas» | Ejecuta `supabase/schema.sql` en el SQL Editor. |
| No llega el correo | Configura SMTP propio (sección C) y revisa spam. |
| El enlace del correo abre `localhost` en producción | Cambia **Site URL** y agrega tu dominio en **Redirect URLs**. |
| «Correo sin confirmar» | Abre el enlace del correo o pulsa «Reenviar correo». |
| Los cambios no aparecen al instante en otro dispositivo | Verifica en **Database › Publications › supabase_realtime** que estén las 6 tablas. De todos modos se actualiza al volver a la pestaña. |
