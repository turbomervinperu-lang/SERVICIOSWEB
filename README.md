# 🚀 SERVICIOSWEB - Agencia Digital & Captación de Clientes

Plataforma comercial y web de captación de clientes de alta conversión para servicios digitales:
1. **🌐 Diseño y Desarrollo de Páginas Web** (Landing pages, webs corporativas, e-commerce, alta velocidad y SEO).
2. **🛒 Creaciones de Catálogos Digitales Interactivos** (Catálogo tipo app con carrito, pagos peruanos Yape, Plin y BCP, y checkout directo a WhatsApp).
3. **📱 Manejo Estratégico de Redes Sociales** (Creación de contenido, edición de Reels/TikTok virales, diseño gráfico publicitario y campañas Meta Ads).

---

## 📲 Canal Oficial de Cierre de Clientes (WhatsApp)
- **Número Oficial:** `+51 929 198 813` (`51929198813`)
- **Cotizador Express en Vivo:** Los clientes seleccionan sus servicios y requerimientos, y con un solo toque se genera su mensaje personalizado directo al WhatsApp oficial, registrando en simultáneo el prospecto en la base de datos Neon PostgreSQL.
- **Widget Flotante:** Chat interactivo en tiempo real con chips de consulta rápida por tipo de servicio.

---

## 🗄️ Base de Datos: Neon PostgreSQL (`SERVICIOSWEB`)
- **Base de datos creada:** `SERVICIOSWEB`
- **Host:** `ep-dark-water-b8kmycoy-pooler.c-14.us-east-1.aws.neon.tech`
- **Tablas integradas:**
  - `leads`: Registro de todos los prospectos, negocios, teléfonos y presupuestos recibidos.
  - `site_config`: Configuración general de la agencia (WhatsApp, textos, PIN).
  - `services`: Catálogo de servicios digitales.
- **Cadena de Conexión (`POSTGRES_URL`):**
  ```env
  POSTGRES_URL="postgresql://neondb_owner:npg_r5eHh7JLFzsg@ep-dark-water-b8kmycoy-pooler.c-14.us-east-1.aws.neon.tech/SERVICIOSWEB?sslmode=require&channel_binding=require"
  ```

---

## 📦 Almacenamiento de Imágenes: Cloudflare R2
- **Bucket sugerido:** `serviciosweb`
- **Account ID:** `f60c528df815c081601e0a4a2ce32edf`
- **Access Key ID:** `4ef13203ae7183c2f1755576bf2fa9d2`
- **Endpoint S3:** `https://f60c528df815c081601e0a4a2ce32edf.r2.cloudflarestorage.com`
- **Paso en Cloudflare R2:**
  1. En tu panel de Cloudflare (sección **R2**), haz clic en **Create bucket**.
  2. Nómbralo **`serviciosweb`**.
  3. En la pestaña **Settings** del bucket, activa **R2.dev subdomain** para obtener la URL pública (ejemplo: `https://pub-03357662772540c68740c6e96697d46b.r2.dev`).

---

## ☁️ Despliegue en Vercel (`SERVICIOSWEB`)

### Enlace Directo para Crear el Proyecto en Vercel:
👉 **[Desplegar SERVICIOSWEB en Vercel](https://vercel.com/new/import?s=https://github.com/turbomervinperu-lang/SERVICIOSWEB)**

### Variables de Entorno a configurar en Vercel (Settings -> Environment Variables):
| Variable | Valor |
|---|---|
| `POSTGRES_URL` | `postgresql://neondb_owner:npg_r5eHh7JLFzsg@ep-dark-water-b8kmycoy-pooler.c-14.us-east-1.aws.neon.tech/SERVICIOSWEB?sslmode=require&channel_binding=require` |
| `DATABASE_URL` | `postgresql://neondb_owner:npg_r5eHh7JLFzsg@ep-dark-water-b8kmycoy-pooler.c-14.us-east-1.aws.neon.tech/SERVICIOSWEB?sslmode=require&channel_binding=require` |
| `WHATSAPP_NUMBER` | `51929198813` |
| `R2_ACCOUNT_ID` | `f60c528df815c081601e0a4a2ce32edf` |
| `R2_ACCESS_KEY_ID` | `4ef13203ae7183c2f1755576bf2fa9d2` |
| `R2_SECRET_ACCESS_KEY` | *(Tu secreto de Cloudflare R2)* |
| `R2_BUCKET_NAME` | `serviciosweb` |
| `R2_PUBLIC_URL` | `https://pub-03357662772540c68740c6e96697d46b.r2.dev` |

---

## 🔒 Acceso Interno al Panel de Prospectos
- URL: `admin.html`
- PIN por defecto: `1234`
- Permite ver los prospectos en tiempo real, filtrar por estado (Nuevo, Contactado, Cerrado) y abrir WhatsApp directamente con cada cliente.
