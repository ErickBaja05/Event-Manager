# EPN Event Manager — Proyecto Final (Construcción y Evolución de Software)

> **Repositorio base del Event Hub:** `https://github.com/ErickBaja05/Event-Manager`  
> **Objetivo del equipo:** Completar los **4 mantenimientos** sobre este repositorio (**Fase 1**) y conectar **4 repositorios CRUD independientes** formando un sistema unificado (**Fase 2**), junto con las evidencias para el informe y la sustentación.

---

## Tabla de Contenidos

- [Arquitectura General del Proyecto (5 Repositorios)](#arquitectura-general-del-proyecto-5-repositorios)
- [FASE 1: Mantenimiento del Event Manager (Este Repositorio)](#fase-1-mantenimiento-del-event-manager-este-repositorio)
  - [1.1 Herramientas e Instalación (Windows PowerShell y Linux Fedora)](#11-herramientas-e-instalación-windows-powershell-y-linux-fedora)
  - [1.2 Clonar, Levantar y Verificar el Entorno](#12-clonar-levantar-y-verificar-el-entorno)
  - [1.3 Probar Endpoints Base (Antes de Modificar Código)](#13-probar-endpoints-base-antes-de-modificar-código)
  - [1.4 Flujo de Trabajo en Git (Issues, Ramas y Pull Requests)](#14-flujo-de-trabajo-en-git-issues-ramas-y-pull-requests)
  - [1.5 Entregables e Informe de Fase 1](#15-entregables-e-informe-de-fase-1)
- [FASE 2: Sistema Unificado con 4 CRUDs Independientes](#fase-2-sistema-unificado-con-4-cruds-independientes)
  - [2.1 División de Módulos (Sistema Académico EPN)](#21-división-de-módulos-sistema-académico-epn)
  - [2.2 Stack Tecnológico Oficial](#22-stack-tecnológico-oficial)
  - [2.3 Estructura de Carpetas Obligatoria](#23-estructura-de-carpetas-obligatoria)
  - [2.4 Reglas, Archivos Obligatorios y Restricciones](#24-reglas-archivos-obligatorios-y-restricciones)
  - [2.5 Contrato de Integración con el Event Manager](#25-contrato-de-integración-con-el-event-manager)
  - [2.6 Pruebas en Local y Preparación para la Demostración](#26-pruebas-en-local-y-preparación-para-la-demostración)
- [Checklist Final para Terminar Hoy](#checklist-final-para-terminar-hoy)

---

## Arquitectura General del Proyecto (5 Repositorios)

Trabajaremos con **5 repositorios** en GitHub:

1. **Este repositorio (`Event-Manager`)**: Contiene `epn-event-manager` (NestJS + TypeORM + SQLite) corriendo en el puerto **`3000`**. Aquí todos somos colaboradores.
2. **4 repositorios personales (1 por integrante)**: Cada uno contiene un módulo CRUD autónomo corriendo en su propio puerto (**`3001`**, **`3002`**, **`3003`**, **`3004`**).

Ningún repositorio CRUD copia el código de `epn-event-manager`; todos se comunican vía HTTP enviando peticiones `POST http://localhost:3000/events`.

---

## FASE 1: Mantenimiento del Event Manager (Este Repositorio)

### 1.1 Herramientas e Instalación (Windows PowerShell y Linux Fedora)

Instalen exactamente estas herramientas antes de comenzar:

- **Node.js LTS (v20 o v22)** + **npm** *(muy importante usar versión LTS para que `better-sqlite3` no falle al instalar binarios nativos)*.
- **Git**.
- **VS Code** con las extensiones:
  - *ESLint*
  - *Prettier - Code formatter*
  - *SQLite Viewer* (para inspeccionar `epn-event-manager/db/events.sqlite`).
- **Cliente HTTP**: **Bruno**, **Postman**, **Insomnia** o **Thunder Client** (extensión de VS Code).

#### Opción A: Instalación en Windows (PowerShell)

Abre **PowerShell** (como usuario normal, o administrador si usas `winget`) y ejecuta:

```powershell
# 1. Instalar Git, Node.js LTS (v22), VS Code y Bruno (o Postman)
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Microsoft.VisualStudioCode -e
winget install --id Bruno.Bruno -e
# Si prefieres Postman en lugar de Bruno:
# winget install --id Postman.Postman -e

# 2. Cierra y vuelve a abrir PowerShell, luego verifica las versiones:
git --version
node -v
npm -v
```

> **Nota para Windows (`better-sqlite3`):** Si al hacer `npm install` más adelante aparece un error de `node-gyp` o compilación C++, asegúrate de tener Node **v20 LTS** o **v22 LTS**. Si persiste, instala las herramientas C++ de Visual Studio (*Desktop development with C++*):
> ```powershell
> winget install --id Microsoft.VisualStudio.2022.BuildTools -e
> ```

#### Opción B: Instalación en Linux (Fedora)

Abre una terminal y ejecuta:

```bash
# 1. Instalar Git, Node.js, npm y herramientas de compilación para better-sqlite3
sudo dnf install -y git nodejs npm gcc-c++ make python3

# 2. Verificar versiones
git --version
node -v
npm -v

# 3. (Opcional) Instalar Bruno o Postman vía Flatpak
flatpak install -y flathub com.usebruno.Bruno
```

---

### 1.2 Clonar, Levantar y Verificar el Entorno

Todos ya están agregados como colaboradores en este repositorio.

**En Windows (PowerShell) o Linux (Bash):**

```bash
# 1. Clonar el repositorio (por defecto apunta a la rama develop)
git clone https://github.com/ErickBaja05/Event-Manager.git
cd Event-Manager

# 2. Verificar que estás en develop y actualizado
git status
git pull origin develop

# 3. Entrar al proyecto NestJS e instalar dependencias
cd epn-event-manager
npm install

# 4. Levantar el servidor en modo desarrollo
npm run start:dev
```

Si todo está bien, verás en consola que NestJS inició sin errores y escucha en el puerto **`3000`**.

---

### 1.3 Probar Endpoints Base (Antes de Modificar Código)

Antes de escribir una sola línea de código:

1. Abre **Bruno** o **Postman** (o usa PowerShell/curl) y prueba los 6 endpoints base sobre `http://localhost:3000`:
   - `GET http://localhost:3000/health`
   - `POST http://localhost:3000/events`
   - `GET http://localhost:3000/events`
   - `GET http://localhost:3000/stats`
   - `GET http://localhost:3000/events/source/test-crud`
   - `GET http://localhost:3000/events/entity/test-entity`
2. **Ejemplo de cuerpo JSON para `POST /events`:**
   ```json
   {
     "source": "test-crud",
     "entity": "student",
     "action": "CREATE",
     "title": "Prueba inicial",
     "description": "Verificando que el hub recibe eventos",
     "payload": {
       "id": 1,
       "name": "Ana"
     }
   }
   ```
3. **Importante para el informe:** Reproduce el fallo o debilidad descrita en **tu Issue asignada** y guarda **capturas de pantalla del "antes"** (respuesta de Bruno/Postman y vista de `epn-event-manager/db/events.sqlite` en SQLite Viewer).

---

### 1.4 Flujo de Trabajo en Git (Issues, Ramas y Pull Requests)

> **Regla estricta:** Las ramas `develop` y `main` están protegidas con **Rulesets**. **Nadie** puede hacer `push` directo a `develop` ni a `main`. Todo cambio entra por **Pull Request aprobado**.

1. Ve a la pestaña **Issues** del repositorio en GitHub y revisa la Issue que te corresponde (**Correctivo**, **Adaptativo**, **Perfectivo** o **Preventivo**). Cada Issue detalla:
   - *Dónde revisar*
   - *Falencia encontrada*
   - *Qué aplicar*
2. Crea tu rama **partiendo desde `develop`** (puedes usar el botón *"Create a branch"* dentro de tu Issue en GitHub asegurándote de que la base sea `develop`, o hacerlo en consola):
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b fix/issue-1-correctivo
   ```
   *(Nombres sugeridos: `fix/issue-1-correctivo`, `feat/issue-2-adaptativo`, `perf/issue-3-perfectivo`, `sec/issue-4-preventivo`)*.
3. Realiza los cambios indicados en tu Issue dentro de `epn-event-manager/`.
   - **Regla del taller:** No fusionen las 4 tablas (`create_events`, `update_events`, `delete_events`, `query_events`) en una sola; el antipatrón de las 4 tablas debe mantenerse.
4. Verifica que el proyecto compila, pasa lint y pruebas antes de subir:
   ```bash
   cd epn-event-manager
   npm run build
   npm run lint
   npm run test
   ```
5. Sube tu rama y abre un **Pull Request hacia `develop`**:
   ```bash
   git add .
   git commit -m "fix: descripcion clara de tu mantenimiento"
   git push -u origin <tu-rama>
   ```
   - En la descripción del PR incluye `Closes #<numero-de-tu-issue>`.
   - Pide revisión del equipo. *(Como los 4 tocamos `events.service.ts`, si hay conflictos al hacer merge, los resolvemos en conjunto y volvemos a probar los 6 endpoints).*
6. Cuando los **4 PRs** estén aprobados y mergeados en `develop`, verificamos que todo funcione en conjunto y abrimos el PR final de **`develop` -> `main`**.

---

### 1.5 Entregables e Informe de Fase 1

Cada integrante debe documentar su mantenimiento (en `docs/` o en el documento conjunto del equipo) con estos **4 puntos obligatorios**:

1. **Diagnóstico:** ¿Qué incidencia técnica encontraste, en qué archivo/endpoint estaba y cómo se reproducía?
2. **Intervención:** Comparativa del código **antes vs. después** (pueden obtenerla con `git diff develop..<tu-rama>`).
3. **Justificación:** Por qué tu cambio clasifica exactamente en ese tipo de mantenimiento (Correctivo, Adaptativo, Perfectivo o Preventivo).
4. **Evidencia de Prueba:** Capturas de Postman/Bruno y `events.sqlite` **antes y después** del cambio.

---

## FASE 2: Sistema Unificado con 4 CRUDs Independientes

Para que el proyecto sea coherente y destaque en la sustentación, construiremos un **Sistema de Gestión Académica EPN** dividido en **4 módulos autónomos**. Cada módulo vive en **su propio repositorio** y envía sus eventos al `epn-event-manager` central.

### 2.1 División de Módulos (Sistema Académico EPN)

| Integrante | Mantenimiento (Fase 1) | Repositorio CRUD (Fase 2) | Puerto | `source` | `entity` | Campos mínimos del módulo |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **1 (Erick)** | Correctivo | `crud-estudiantes` | `3001` | `crud-estudiantes` | `student` | `id`, `codigo`, `nombre`, `correo`, `semestre` |
| **2** | Adaptativo | `crud-docentes` | `3002` | `crud-docentes` | `teacher` | `id`, `cedula`, `nombre`, `departamento`, `titulo` |
| **3** | Perfectivo | `crud-materias` | `3003` | `crud-materias` | `subject` | `id`, `codigo`, `nombre`, `creditos`, `nivel` |
| **4** | Preventivo | `crud-aulas` | `3004` | `crud-aulas` | `classroom` | `id`, `codigo`, `edificio`, `capacidad`, `tipo` |

---

### 2.2 Stack Tecnológico Oficial

Para que los 4 módulos sean fáciles de integrar, probar y levantar en una sola PC hoy mismo, **todos usaremos exactamente este stack**:

- **Runtime:** Node.js LTS (v20 o v22)
- **Backend:** Express (`express`, `cors`, `dotenv`)
- **Base de datos local del módulo:** SQLite con `better-sqlite3` *(cada módulo tiene su propio archivo `.sqlite` independiente)*
- **Frontend:** HTML + CSS + JavaScript puro servido desde la carpeta `public/` del mismo Express *(así cada CRUD usa **un solo puerto** para API + interfaz web)*.

Inicialización rápida de cada repo CRUD:
```bash
npm init -y
npm install express cors dotenv better-sqlite3
```

---

### 2.3 Estructura de Carpetas Obligatoria

Cada uno de los 4 repositorios CRUD debe respetar esta estructura:

```text
crud-<modulo>/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── db/                     # Aquí se crea la BD SQLite local (ej. data.sqlite)
├── public/
│   ├── index.html          # Formulario y tabla para Crear, Buscar/Listar, Editar y Eliminar
│   └── app.js              # Llamadas fetch() a la API local del CRUD
└── src/
    ├── server.js           # Servidor Express, middlewares (cors, json, static public/) y rutas
    ├── db.js               # Conexión SQLite y creación de la tabla del módulo
    └── eventClient.js      # Cliente HTTP que envía POST /events al Event Manager
```

---

### 2.4 Reglas, Archivos Obligatorios y Restricciones

1. **Prohibido copiar `epn-event-manager`:** Ningún repositorio CRUD puede contener copias de `epn-event-manager`.
2. **Independencia total entre CRUDs:** Ningún CRUD debe conectarse a la BD o API de otro CRUD ni tener llaves foráneas entre módulos. Su único punto en común es el Event Manager.
3. **Archivo `.env.example` obligatorio (y `.env` ignorado en `.gitignore`):**
   ```env
   PORT=3001
   EVENT_MANAGER_URL=http://localhost:3000
   ```
   *(Cada integrante cambia `PORT` al suyo: `3001`, `3002`, `3003` o `3004`).*
4. **`.gitignore` obligatorio:** Debe ignorar `node_modules/`, `.env` y `db/*.sqlite`.
5. **`package.json` con script `start`:** Debe permitir arrancar el módulo simplemente con `npm start` (`node src/server.js`).
6. **`README.md` propio:** Debe explicar qué entidad maneja, qué puerto usa y cómo ejecutarlo.
7. **Resiliencia en `eventClient.js`:** La llamada `POST /events` debe estar envuelta en `try/catch` para que, si el Event Manager no responde, el CRUD registre el error en consola sin caerse.

---

### 2.5 Contrato de Integración con el Event Manager

Cada operación en el CRUD debe enviar un evento vía `POST ${EVENT_MANAGER_URL}/events`:

| Operación en el CRUD | Método HTTP del CRUD | `action` enviado al Hub |
| :--- | :--- | :--- |
| Listar / Buscar registros | `GET /api/<entidad>` | `"QUERY"` |
| Crear registro | `POST /api/<entidad>` | `"CREATE"` |
| Actualizar registro | `PUT /api/<entidad>/:id` | `"UPDATE"` |
| Eliminar registro | `DELETE /api/<entidad>/:id` | `"DELETE"` |

**Ejemplo base para `src/eventClient.js`:**

```javascript
async function sendEvent({ source, entity, action, title, description, payload }) {
  const baseUrl = process.env.EVENT_MANAGER_URL || 'http://localhost:3000';
  try {
    const response = await fetch(`${baseUrl}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        entity,
        action,
        title,
        description,
        payload,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[EventManager] Error ${response.status}:`, text);
    }
  } catch (error) {
    console.error('[EventManager] No se pudo conectar al Hub:', error.message);
  }
}

module.exports = { sendEvent };
```

---

### 2.6 Pruebas en Local y Preparación para la Demostración

#### Prueba individual (cada integrante en su máquina)
1. En una terminal, levanta `epn-event-manager` (`npm run start:dev`) en el puerto **`3000`**.
2. En otra terminal, levanta tu CRUD (`npm start`) en tu puerto asignado (`3001..3004`).
3. Abre `http://localhost:300X` en el navegador y realiza: **Crear**, **Buscar/Listar**, **Editar** y **Eliminar**.
4. Verifica que los 4 tipos de eventos aparezcan en:
   - `GET http://localhost:3000/events/source/<tu-source>`
   - `GET http://localhost:3000/stats`

#### Demostración final (en 1 sola PC para evitar fallos de red/Wi-Fi)
El día de la sustentación presentaremos todo corriendo en **una sola laptop principal** con una carpeta de trabajo que contenga los **5 repositorios clonados lado a lado**:

```text
proyecto-final/
├── Event-Manager/      -> http://localhost:3000 (Puerto 3000)
├── crud-estudiantes/   -> http://localhost:3001 (Puerto 3001)
├── crud-docentes/      -> http://localhost:3002 (Puerto 3002)
├── crud-materias/      -> http://localhost:3003 (Puerto 3003)
└── crud-aulas/         -> http://localhost:3004 (Puerto 3004)
```

1. Hacemos `git pull` en los 5 repositorios y verificamos que cada CRUD tenga su `.env` con su puerto correspondiente y `EVENT_MANAGER_URL=http://localhost:3000`.
2. Levantamos los 5 servicios en 5 terminales.
3. En la defensa, cada integrante expone su mantenimiento (Diagnóstico, Antes/Después, Justificación, Evidencia) y luego abre su módulo (`localhost:3001..3004`) para ejecutar la **Prueba de Vida** en vivo mostrando cómo se registran los eventos en `localhost:3000/events` y `localhost:3000/stats`.

---

## Checklist Final para Terminar Hoy

- [ ] Todos tienen instaladas las herramientas y pueden levantar `epn-event-manager` en `:3000`.
- [ ] Cada integrante capturó la evidencia del **"antes"** de su Issue.
- [ ] Cada integrante creó su rama desde `develop`, aplicó su mantenimiento y abrió PR hacia `develop`.
- [ ] Los 4 PRs están aprobados y mergeados en `develop`, y `develop` mergeado en `main`.
- [ ] Cada integrante creó su repositorio CRUD independiente con el stack y estructura definidos.
- [ ] Los 4 CRUDs envían `CREATE`, `UPDATE`, `DELETE` y `QUERY` al Hub en `:3000`.
- [ ] Prueba integrada de los 5 repositorios corriendo simultáneamente completada.
- [ ] Informe con Diagnóstico, Intervención, Justificación y Evidencias listo.
