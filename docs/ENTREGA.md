# CoreIT — cómo se entrega a una empresa

CoreIT es la cara visible de las automatizaciones de n8n. Tú (o el IT de la empresa) construyes el flujo en n8n. La empresa lo recibe en CoreIT como un botón: sube el archivo, revisa y descarga el resultado, sin ver n8n.

## Piezas

```
Navegador (CoreIT)  ──►  Supabase (login, empresas, roles, historial)
                              │
                              └─► Edge Function run-automation ──► n8n (webhook + secreto)
```

- **Web (React):** se sirve como archivos estáticos (Vercel, Nginx o Docker).
- **Supabase:**
  - usuarios y roles;
  - automatizaciones e historial;
  - dos funciones de servidor: `run-automation` y `manage-members`.
- **n8n:** los flujos. El navegador nunca ve su URL ni su secreto. Las llamadas pasan por `run-automation`, que comprueba que la persona pertenece a la empresa y que la automatización está activa.

## Roles

| Rol | Qué puede hacer |
|---|---|
| **Superadmin** (tú) | Crear empresas e invitar a su primer admin, y entrar en cualquier empresa. |
| **Admin de empresa** (su IT) | Crear, editar, pausar y borrar automatizaciones y configurar sus URLs de n8n. Invitar usuarios, cambiar roles y editar el nombre y el logo de la empresa. |
| **Usuario** | Ver y ejecutar las automatizaciones de su empresa y ver su propio historial. |

Solo se entra por invitación: el registro libre está desactivado.

---

## Opción A · SaaS (tú lo alojas)

Una sola instalación para todas las empresas. Cada empresa ve solo lo suyo.

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com), en una región de la UE.
2. Aplica la base de datos. Hay dos formas:
   - con la CLI: `npx supabase link --project-ref <ref>` y después `npx supabase db push`;
   - o pega `supabase/migrations/20260925000001_coreit_core.sql` en el **SQL Editor**.
3. Despliega las funciones:
   ```bash
   npx supabase functions deploy run-automation
   npx supabase functions deploy manage-members
   npx supabase secrets set COREIT_APP_URL=https://tu-dominio-coreit COREIT_ALLOWED_ORIGINS=https://tu-dominio-coreit
   ```
4. Ajustes de **Authentication**:
   - **Sign In / Providers:** desactiva *Allow new users to sign up* y deja el proveedor **Email** activo.
   - **URL Configuration:** en *Site URL* pon la URL de CoreIT y añádela también a *Redirect URLs*.
   - **SMTP propio** (Settings → Auth → SMTP): el correo por defecto de Supabase tiene un límite muy bajo y las invitaciones no llegarían bien.
5. Hazte superadmin:
   1. Crea tu usuario en **Authentication → Users → Add user**.
   2. Ejecuta en el SQL Editor:
      ```sql
      insert into platform_admins (user_id)
      select id from auth.users where email = 'tu-correo@dominio.com';
      ```

### 2. Web en Vercel
Importa el repo y añade estas variables:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (*anon* / *publishable*) |

Sin estas dos variables, la web arranca en **modo demo** (sin login). Sirve para enseñarla en reuniones.

### 3. Dar de alta una empresa
1. Entra como superadmin y abre **Empresas → Nueva empresa**. Indica el nombre y el correo de su admin (IT). Esa persona recibirá la invitación.
2. En la empresa, pulsa **Nueva** y configura la automatización: nombre, qué se sube, qué devuelve y las URLs de producción de los webhooks de n8n, con su secreto.
3. En **Usuarios**, invita a las personas que la van a usar, con el rol *Usuario*.

---

## Opción B · Instalación en la empresa (confidencialidad)

Para empresas que no pueden sacar datos de su red. Se usa el mismo código.

1. **Supabase propio:** puede ser un proyecto suyo en Supabase Cloud o Supabase autoalojado con Docker ([guía oficial](https://supabase.com/docs/guides/self-hosting/docker)). Aplica la migración y las funciones igual que en la opción A.
2. **n8n propio** en su red, con los flujos que les entregas en JSON.
3. **CoreIT con Docker:**
   ```bash
   docker build -t coreit .
   docker run -d -p 8080:80 \
     -e SUPABASE_URL=https://supabase.empresa.local \
     -e SUPABASE_ANON_KEY=<clave pública> \
     -e COREIT_COMPANY="Nombre de la empresa" \
     coreit
   ```
   El contenedor genera `config.json` a partir de esas variables. Otra opción es compilar con `npm run build` y copiar la carpeta `dist/` a cualquier servidor web (IIS, Apache, Nginx). En ese caso se edita `dist/config.json` y no hace falta recompilar.
4. **n8n en la red interna:** si n8n está en la red interna con `http` o una IP privada, activa `COREIT_ALLOW_PRIVATE_WEBHOOKS=true` en los secretos de las funciones. En el modo SaaS está bloqueado a propósito, para que nadie apunte a la red interna del servidor.

### `config.json`

```json
{
  "mode": "demo",
  "companyName": "",
  "logoUrl": "",
  "webhooks": { "pdfStep1": "", "pdfStep2": "" },
  "supabase": { "url": "", "anonKey": "" }
}
```

- Con `supabase.url` y `anonKey` rellenos, CoreIT funciona con login, empresas y roles.
- Sin ellos, funciona en local:
  - `mode: "demo"` muestra automatizaciones y métricas de ejemplo;
  - `mode: "client"` muestra solo la automatización real, que usa los `webhooks` configurados en el archivo.

---

## En n8n (para cada flujo)
- Usa las URLs de **producción** de los nodos Webhook y deja el workflow **activo**.
- Protege el Webhook con **Header Auth**: cabecera `x-webhook-secret` y el mismo valor que pones en el campo *Secreto* de la automatización en CoreIT.
- Con la opción A no hace falta CORS en n8n, porque la llamada sale del servidor y no del navegador.
- Formato que espera CoreIT:
  - **2 pasos (PDF → Excel):**
    - el paso 1 recibe `multipart/form-data` con el archivo en `data` y devuelve `{ status: "requires_input", titulo_ficha, secciones_detectadas, todos_los_bloques }`, o `{ status: "error", message }`;
    - el paso 2 recibe `{ seccion_seleccionada, titulo_ficha, todos_los_bloques }` y devuelve el archivo, con `Content-Disposition`.
  - **Descarga de un archivo:** el flujo devuelve el archivo.
  - **Resultado o aviso:** el flujo devuelve JSON, y si incluye `message`, CoreIT lo muestra.

## Checklist antes de dar acceso a una empresa
- [ ] Registro libre desactivado en Supabase.
- [ ] SMTP propio configurado; prueba una invitación.
- [ ] `COREIT_ALLOWED_ORIGINS` con el dominio real.
- [ ] Webhooks de n8n con Header Auth y secreto.
- [ ] Contrato de encargado del tratamiento con la empresa (opción A), porque sus documentos pasan por tu infraestructura.
