# Guía de Despliegue en Digital Ocean

## Paso 1: Preparar el proyecto

1. **Asegúrate de tener todos los cambios guardados:**
   ```bash
   git add -A
   git commit -m "feat: Preparación para despliegue en producción"
   git push origin main
   ```

## Paso 2: Configurar Digital Ocean App Platform

1. **Accede a Digital Ocean Dashboard:**
   - Ve a https://cloud.digitalocean.com
   - Inicia sesión en tu cuenta

2. **Crear nueva App:**
   - Click en "Create" → "Apps"
   - Selecciona "GitHub" como fuente
   - Conecta tu cuenta de GitHub si no está conectada
   - Selecciona el repositorio: `terrazeabcn-del/terrazea-clientzone`
   - Selecciona la rama: `main`

3. **Configurar la App:**
   - Digital Ocean detectará automáticamente el archivo `.do/app.yaml`
   - O puedes configurar manualmente:
     - **Source Directory:** `/`
     - **Build Command:** `npm ci && npm run build`
     - **Run Command:** `npm run start`
     - **HTTP Port:** `4000`
     - **Environment:** Node.js

4. **Configurar Variables de Entorno:**
   En la sección "Environment Variables", añade:
   
   ```
   NODE_ENV=production
   PORT=4000
   CLIENT_APP_URL=https://terrazea.gnerai.com
   SESSION_COOKIE_SECURE=true
   SESSION_COOKIE_SAME_SITE=none
   ```
   
   Y como **SECRETS** (no visibles):
   ```
   SUPABASE_URL=(tu URL de Supabase)
   SUPABASE_SERVICE_ROLE_KEY=(tu service role key)
   SESSION_SECRET=(genera una clave segura de 32+ caracteres)
   STRIPE_SECRET_KEY=(tu clave secreta de Stripe)
   STRIPE_WEBHOOK_SECRET=(tu webhook secret de Stripe)
   ```

5. **Configurar Dominio:**
   - En la sección "Settings" → "Domains"
   - Añade: `terrazea.gnerai.com`
   - Digital Ocean te dará instrucciones para configurar el DNS

## Paso 3: Configurar DNS en tu proveedor

1. **Añade un registro CNAME:**
   - Tipo: `CNAME`
   - Nombre: `terrazea` (o `@` si es el dominio principal)
   - Valor: `[tu-app].ondigitalocean.app` (Digital Ocean te lo dará)
   - TTL: 3600 (o el que prefieras)

## Paso 4: Configurar Webhook de Stripe

1. **En Stripe Dashboard:**
   - Ve a Developers → Webhooks
   - Añade endpoint: `https://terrazea.gnerai.com/api/webhooks/stripe`
   - Selecciona eventos:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `checkout.session.async_payment_succeeded`
   - Copia el "Signing secret" y actualízalo en Digital Ocean como `STRIPE_WEBHOOK_SECRET`

## Paso 5: Desplegar

1. **Digital Ocean hará el deploy automáticamente** cuando hagas push a `main`
2. O puedes hacerlo manualmente desde el dashboard: "Actions" → "Force Rebuild"

## Verificación Post-Despliegue

1. **Verifica que la app está corriendo:**
   - Visita: https://terrazea.gnerai.com
   - Deberías ver la landing page

2. **Verifica el login:**
   - Intenta hacer login como admin
   - Verifica que las rutas protegidas funcionan

3. **Verifica los webhooks:**
   - Crea un pago de prueba en Stripe
   - Verifica que el webhook se recibe correctamente

## Troubleshooting

- **Error 502:** Verifica que el puerto es 4000 y que el comando `start` está correcto
- **Error de CORS:** Verifica que `CLIENT_APP_URL` está configurado correctamente
- **Error de base de datos:** Verifica que las credenciales de Supabase son correctas
- **Error de Stripe:** Verifica que las claves de Stripe son de producción (no test)

## Comandos Útiles

```bash
# Ver logs en Digital Ocean
# Ve a tu app → Runtime Logs

# Rebuild manual
# Ve a tu app → Actions → Force Rebuild

# Verificar variables de entorno
# Ve a tu app → Settings → App-Level Environment Variables
```

