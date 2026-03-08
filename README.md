# 🛒 E-commerce CMS — White-Label

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-10-ffca28?logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)

Solución **e-commerce modular** de alto rendimiento con panel de administración integral y storefront público. Backend 100% potenciado por **Firebase** (Auth, Firestore, Storage). Pensada para ser adaptable a cualquier rubro comercial con personalización total sin tocar código.

---

## 📑 Tabla de contenidos

- [Visión del proyecto](#-visión-del-proyecto)
- [Panel de administración (CMS)](#-panel-de-administración-cms)
- [Storefront (tienda pública)](#-storefront-tienda-pública)
- [Arquitectura y tecnologías](#-arquitectura-y-tecnologías)
- [Guía de instalación y variables de entorno](#-guía-de-instalación-y-variables-de-entorno)
- [Despliegue](#-despliegue-deployment)
- [Creación del usuario administrador (primeros pasos)](#-creación-del-usuario-administrador-primeros-pasos)

---

## 🎯 Visión del proyecto

Este repositorio implementa una **plataforma e-commerce en marca blanca (white-label)** dividida en dos grandes bloques: un **panel de administración (CMS)** para gestionar catálogo, precios, promociones y apariencia, y un **storefront público** que consume esa configuración en tiempo real.

- **Modular y adaptable:** La solución está pensada para adaptarse a distintos rubros (neumáticos, indumentaria, electrónica, etc.) mediante categorías, atributos, marcas y productos variables, sin cambios estructurales en el código.

- **Enfoque headless parcial:** El contenido comercial (productos, precios, promociones) y la configuración de apariencia viven en Firestore. El frontend los consume vía SDK, lo que permite cambiar textos, colores, menús y bloques HTML desde el CMS sin redesplegar.

- **Personalización sin tocar código:** Logos, paleta de colores, carrusel de portada, menús de navegación anidados, footer por columnas con widgets (HTML, menús, imágenes, contacto) y páginas con inyección de HTML/scripts se gestionan desde **Apariencia** y **Páginas**. Ideal para que cada cliente tenga su propia identidad.

- **Ampliable:** La arquitectura permite sumar nuevos módulos (por ejemplo: multi-tienda, integraciones con ERPs, pasarelas de pago adicionales, notificaciones, reportes) extendiendo servicios en `src/services/`, rutas en `App.tsx` y pantallas en `src/features/`.

---

## 🖥️ Panel de administración (CMS)

El panel es un **entorno protegido** por control de acceso basado en roles (**RBAC**). Solo los usuarios con rol **`admin`** pueden acceder a las rutas bajo `/admin`. El resto de roles (`consumer`, `distributor`) no tienen acceso al CMS.

### Módulos principales

| Módulo | Descripción |
|--------|-------------|
| **Catálogo avanzado** | Gestión de productos **simples** y **variables**, categorías, taxonomías de **marcas**, **atributos** globales y generador automático de **variaciones** mediante producto cartesiano (atributos que generan variación + combinaciones). Incluye galería de imágenes, SKU, precios y stock por variación. |
| **Motor de precios (ERP)** | Sistema basado en **costos base** por producto/variación, **múltiples listas de precios** asignables por rol de usuario (admin, distributor, consumer) y **simulador de precios en vivo** para ver el precio final según rol y lista. |
| **Motor financiero** | **Medios de pago** personalizados (transferencia, tarjeta, etc.) y sistema de **promociones** complejo: cuotas con/sin interés, descuentos por categoría o producto, recargos y combinación con medios de pago. |
| **Ventas** | Listado de **pedidos** con filtros y seguimiento del **estado** (pendiente, enviado, completado, cancelado). Detalle de ítems, datos de envío y cliente. |
| **Gestor de apariencia** | Control total del look & feel del storefront: **logo**, tagline, **paleta de colores**, fondos por zona del header, **carrusel** de imágenes de portada, **menús de navegación** anidados (enlaces y categorías) con subítems y **footer** por columnas con widgets (HTML, menú, imagen, contacto). Incluye **copyright/copywriting** configurable. |
| **Páginas y headless CMS** | Creación de **páginas estáticas** (sistema o personalizadas). Los administradores pueden inyectar **HTML puro** en el contenido y añadir **scripts o estilos** en el `<head>` o al cierre del `<body>`, permitiendo landing pages, guías o bloques con lógica propia sin redeploy. |

---

## 🏪 Storefront (tienda pública)

Frontend **altamente responsivo** que refleja en tiempo real la configuración de apariencia y el catálogo almacenados en Firestore.

- **Portada:** Carrusel de imágenes configurable, contenido HTML inyectable (promos, beneficios, CTAs) y enlaces a tienda y guías.
- **Tienda:** Grilla de productos con filtros por categoría, marca, atributos y precio; ordenamiento y búsqueda.
- **Detalle de producto:** Layout en tres columnas (galería, información + promociones, precio + selector de variantes + cantidad y CTAs). Cálculo de **cuotas en vivo** según promociones. Cross-selling configurable por SKU.
- **Carrito:** Widget lateral (drawer) con ítems, cantidades y subtotal; enlace directo al checkout.
- **Checkout:** Formulario de datos del comprador y envío; selección de medio de pago con promociones aplicadas; autocompletado desde perfil si el usuario está logueado.
- **Portal del cliente (Mi cuenta):** Área protegida con historial de **pedidos** (por email del comprador), **perfil y direcciones** (nombre, teléfono, dirección de envío) y cierre de sesión.
- **Favoritos:** Lista persistente en `localStorage`, drawer lateral y página dedicada; icono en card (hover) y en detalle de producto.
- **Autenticación:** Rutas públicas de **login** y **registro** (Firebase Auth). Tras el registro se crea el perfil en Firestore con rol `consumer` por defecto.

---

## 🏗️ Arquitectura y tecnologías

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18, React Router v6, TypeScript |
| **Build** | Vite 5 |
| **Estilos** | Tailwind CSS |
| **Backend / BaaS** | Firebase Auth, Firestore, Firebase Storage |
| **Estado** | Context API (Auth, Cart, Favorites, Storefront) |

- **Firebase Auth:** Login/registro y sesión; perfiles y roles en Firestore.
- **Firestore:** Productos, categorías, marcas, atributos, listas de precios, medios de pago, promociones, pedidos, usuarios, configuración del storefront (settings), páginas.
- **Firebase Storage:** Imágenes de productos, medios del CMS y biblioteca de medios para logo/carrusel/footer.

---

## 📦 Guía de instalación y variables de entorno

### Requisitos

- **Node.js** 18+ (recomendado LTS)
- **npm** o **yarn**
- Proyecto en [Firebase Console](https://console.firebase.google.com/) con Auth, Firestore y Storage habilitados

### Pasos

1. **Clonar el repositorio e instalar dependencias**

```bash
git clone <url-del-repositorio>
cd ecommerce-cms-olpa
npm install
```

2. **Configurar Firebase**

Crea un archivo `.env` en la raíz del proyecto (o `.env.local`) y define las variables de entorno con las credenciales de tu proyecto Firebase. Puedes copiarlas desde **Firebase Console → Configuración del proyecto → Tus apps → SDK de Firebase → Configuración**.

```bash
# Ejemplo .env (nombres sugeridos; el proyecto puede usar firebase.ts con variables)
VITE_FIREBASE_API_KEY=tu-api-key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Si la aplicación aún usa un archivo de configuración fija (por ejemplo `src/services/firebase.ts`), reemplaza allí los valores por los de tu proyecto o por `import.meta.env.VITE_FIREBASE_*` leyendo desde `.env`.

3. **Ejecutar en desarrollo**

```bash
npm run dev
```

La aplicación quedará disponible en `http://localhost:5173` (o el puerto que indique Vite).

4. **Compilar para producción**

```bash
npm run build
```

Los artefactos se generan en la carpeta `dist/`.

5. **Previsualizar build de producción (opcional)**

```bash
npm run preview
```

---

## 🚀 Despliegue (Deployment)

Se recomienda desplegar la aplicación como **SPA estática** después de ejecutar `npm run build`. Algunas opciones:

- **[Vercel](https://vercel.com):** Conectar el repositorio, configurar las variables de entorno y usar el comando de build por defecto (`npm run build`). La salida es `dist` (Vite).
- **[Firebase Hosting](https://firebase.google.com/docs/hosting):** Configurar `firebase.json` con `public: "dist"` y desplegar con `firebase deploy`. Permite mantener frontend y backend (Firebase) en el mismo ecosistema.
- **Netlify, Cloudflare Pages, etc.:** Build command `npm run build`, publish directory `dist`, y definir las variables de entorno equivalentes a tu configuración de Firebase.

En todos los casos, asegura que las variables de entorno de Firebase (o el archivo de configuración) correspondan al **proyecto y entorno** (producción/staging) que uses.

---

## 🔐 Creación del usuario administrador (primeros pasos)

Para acceder al panel de administración (`/admin`) es **necesario** que el usuario tenga rol **`admin`** en Firestore. Por defecto, los nuevos usuarios se crean con rol **`consumer`**. Sigue estos pasos la **primera vez**:

### a) Crear el perfil en la base de datos

1. En la aplicación, ve a la **ruta pública de la tienda** (por ejemplo `http://localhost:5173`).
2. Navega a **Iniciar sesión** o **Registrarse** (`/login` o `/registro`).
3. **Regístrate** con el email y contraseña que quieras usar como administrador (o inicia sesión si ya tienes cuenta).
4. El sistema creará (o actualizará) tu perfil en la colección **`users`** de Firestore con el rol por defecto **`consumer`**.

### b) Asignar el rol de administrador en Firestore

1. Abre la [Consola de Firebase](https://console.firebase.google.com/) y selecciona tu proyecto.
2. Ve a **Firestore Database**.
3. Abre la colección **`users`**.
4. Localiza el **documento** cuyo ID coincide con tu **User UID** de Firebase Auth (mismo que el `uid` del usuario con el que te registraste).
5. Edita el documento y cambia el campo **`role`** de `consumer` a **`admin`**.
6. Guarda los cambios.

### c) Acceder al panel CMS

1. Recarga la aplicación en el navegador (o cierra sesión y vuelve a iniciar sesión).
2. Navega a **`/admin`** (o usa el enlace al panel si está en el header).
3. Deberías tener acceso al panel de administración. Si no, verifica que el documento en `users` tenga exactamente `role: "admin"` y que hayas recargado para que el contexto de autenticación actualice el perfil.

> **Importante:** No expongas las credenciales de Firebase ni el acceso a la consola. En producción, considera restringir edición directa en Firestore mediante reglas de seguridad y, si aplica, un flujo de “elevación de rol” controlado (por ejemplo, solo desde un script o desde otro admin).

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.
