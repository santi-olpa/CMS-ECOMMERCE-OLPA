# Snippets para inyectar en páginas del CMS

HTML listo para pegar en el panel de **Páginas** (editar página → campos de inyección).

---

## Contenido secundario de la página de Inicio

**Archivo:** `inicio-contenido-secundario.html`

Contenido para insertar **debajo del carrusel** en la página de inicio (slug: **inicio**). Incluye:

- **Promociones y beneficios:** 10% en transferencia, 3 cuotas sin interés, envíos gratis (con iconos SVG, sin dependencias).
- **Cómo elegir tu neumático:** texto breve sobre cómo leer el código (205/55 R16 91V) + botón “Ir a la tienda” (`/tienda`) + botón “Guía completa” (`/como-elegir-neumatico`).

**Dónde pegarlo:** En el panel, editar la página **Inicio** → campo **Contenido**. Opcional: en “Inyectar en &lt;head&gt;” de esa misma página podés agregar las fuentes (link en el comentario del archivo) para que coincida con la estética de la guía.

---

## Guía “Cómo elegir tu neumático” (página completa)

**Carpeta:** `como-elegir-neumatico/`

1. **Inyectar en &lt;head&gt;** → contenido de `01-head.html`
2. **Contenido de la página** → contenido de `02-body-content.html`
3. **Inyectar al final del &lt;body&gt;** → contenido de `03-body-scripts.html`

**Nota sobre iconos:** La guía usa Phosphor Icons (script en el head). Si no se ven, asegurate de que el script de Phosphor se cargue antes del contenido (por ejemplo que “Inyectar en head” esté guardado y la página recargue bien), o probá en otra red/navegador por si hay bloqueos. Los iconos del contenido de inicio usan SVG inline y no dependen de scripts.
