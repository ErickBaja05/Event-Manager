# EPN Event Manager — Proyecto Final (Construcción y Evolución de Software)

> **Repositorio base del Event Hub:** `https://github.com/ErickBaja05/Event-Manager`  
> **Modalidad actual:** Trabajo colaborativo en **Fase 1** (dejar este Event Manager corregido entre los 4) y desarrollo **individual** en **Fase 2** (cada integrante crea su propio CRUD en un repo separado con temática libre y sube **2 videos** al canal de Teams del profesor).

---

## Tabla de Contenidos

- [Cómo Funciona el Proyecto (Resumen Rápido)](#cómo-funciona-el-proyecto-resumen-rápido)
- [FASE 1: Mantenimiento del Event Manager (Trabajo en Este Repositorio)](#fase-1-mantenimiento-del-event-manager-trabajo-en-este-repositorio)
  - [1.1 Herramientas e Instalación (Windows PowerShell y Linux Fedora)](#11-herramientas-e-instalación-windows-powershell-y-linux-fedora)
  - [1.2 Clonar, Levantar y Verificar el Entorno](#12-clonar-levantar-y-verificar-el-entorno)
  - [1.3 Probar Endpoints Base (Antes de Modificar Código)](#13-probar-endpoints-base-antes-de-modificar-código)
  - [1.4 Flujo de Trabajo en Git (Issues, Ramas y Pull Requests)](#14-flujo-de-trabajo-en-git-issues-ramas-y-pull-requests)
- [FASE 2: CRUD Individual en Repositorio Propio](#fase-2-crud-individual-en-repositorio-propio)
  - [2.1 Reglas y Consideraciones Clave](#21-reglas-y-consideraciones-clave)
  - [2.2 Contrato de Integración con el Event Manager](#22-contrato-de-integración-con-el-event-manager)
  - [2.3 Stack Sugerido para Terminar Rápido](#23-stack-sugerido-para-terminar-rápido)
- [Entregables: 2 Videos por Integrante en Teams](#entregables-2-videos-por-integrante-en-teams)
- [Checklist Final para Terminar Hoy](#checklist-final-para-terminar-hoy)

---

## Cómo Funciona el Proyecto (Resumen Rápido)

- **No es una sola app con microservicios ni un sistema con login central.**
- Son **5 repositorios independientes**:
  1. **Este repositorio (`Event-Manager`)**: Contiene `epn-event-manager` (NestJS + TypeORM + SQLite) en el puerto `3000`. **Es el único punto donde colaboramos los 4** para dejarlo corregido y listo.
  2. **4 repositorios personales (1 por integrante)**: Cada uno crea su propio CRUD con **temática libre y única** (ej. videojuegos, películas, libros, mascotas, etc.). Cada CRUD funciona por su cuenta y simplemente envía sus eventos vía HTTP (`POST http://localhost:3000/events`) al `epn-event-manager` ya corregido.

> **Importante:** La calificación es **individual**. Sin embargo, si alguien no termina su mantenimiento de Fase 1 a tiempo, bloquea la versión final del Event Manager que todos necesitamos para grabar el Video 2. Cumplamos todos con nuestra parte hoy.

---

## FASE 1: Mantenimiento del Event Manager (Trabajo en Este Repositorio)

### 1.1 Herramientas e Instalación (Windows PowerShell y Linux Fedora)

Instalen estas herramientas antes de comenzar:

- **Node.js LTS (v20 o v22)** + **npm** *(muy importante usar versión LTS para que `better-sqlite3` no falle al instalar binarios nativos)*.
- **Git**.
- **VS Code** con las extensiones:
  - *ESLint*
  - *Prettier - Code formatter*
  - *SQLite Viewer* (para inspeccionar `epn-event-manager/db/events.sqlite`).
- **Cliente HTTP**: **Bruno**, **Postman**, **Insomnia** o **Thunder Client** (extensión de VS Code).

#### Opción A: Instalación en Windows (PowerShell)

Abre **PowerShell** y ejecuta:

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

> **Nota para Windows (`better-sqlite3`):** Si al hacer `npm install` aparece un error de `node-gyp` o compilación C++, asegúrate de tener Node **v20 LTS** o **v22 LTS**. Si persiste, instala las herramientas C++ de Visual Studio (*Desktop development with C++*):
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

# 3. (Opcional) Instalar Bruno vía Flatpak
flatpak install -y flathub com.usebruno.Bruno
```

---

### 1.2 Clonar, Levantar y Verificar el Entorno

Todos ya están agregados como colaboradores en este repositorio.

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

Si todo está bien, NestJS iniciará sin errores escuchando en **`http://localhost:3000`**.

---

### 1.3 Probar Endpoints Base (Antes de Modificar Código)

Antes de cambiar código:

1. Abre **Bruno** o **Postman** y prueba los 6 endpoints base sobre `http://localhost:3000`:
   - `GET http://localhost:3000/health`
   - `POST http://localhost:3000/events`
   - `GET http://localhost:3000/events`
   - `GET http://localhost:3000/stats`
   - `GET http://localhost:3000/events/source/test-crud`
   - `GET http://localhost:3000/events/entity/test-entity`
2. **Ejemplo de JSON para `POST /events`:**
   ```json
   {
     "source": "test-crud",
     "entity": "item",
     "action": "CREATE",
     "title": "Prueba inicial",
     "description": "Verificando que el hub recibe eventos",
     "payload": {
       "id": 1,
       "name": "Ejemplo"
     }
   }
   ```
3. **Importante para tu Video 1:** Antes de aplicar tu arreglo, **graba o reproduce el fallo de tu Issue** (en Bruno/Postman y en `epn-event-manager/db/events.sqlite`) para poder mostrar claramente el **"antes"** en tu video.

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
4. Verifica que compila, pasa lint y pruebas antes de subir:
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
7. **Listo para Fase 2:** Cada integrante hace `git pull` de `main` (o `develop` ya con los 4 arreglos) para usar el Event Manager corregido al grabar su Video 2.

---

## FASE 2: CRUD Individual en Repositorio Propio

Una vez terminada la Fase 1, cada integrante trabaja de forma **100% independiente**.

### 2.1 Reglas y Consideraciones Clave

1. **Temática libre y única:** Cada integrante escoge el tema que prefiera para su CRUD (ej. *Gestión de Jugadores*, *Catálogo de Anime*, *Inventario de Planetas*, *Biblioteca*, etc.), sin repetir tema entre compañeros.
2. **Repositorio aparte:** Crea tu propio repositorio en GitHub para tu CRUD.
3. **Prohibido copiar `epn-event-manager`:** Tu repositorio CRUD **no** debe contener una copia de `epn-event-manager`. Corre `epn-event-manager` desde el repo del grupo (`localhost:3000`) y tu CRUD desde tu propio repo (en otro puerto, ej. `3001`).
4. **Responsabilidad individual:** Ya no hay informe escrito ni presentación grupal obligatoria; tu nota depende de tu código en la Issue, tu CRUD y tus **2 videos**.

---

### 2.2 Contrato de Integración con el Event Manager

Tu CRUD debe exponer una **API REST** (Crear, Listar/Consultar, Actualizar, Eliminar) y, cada vez que ocurra una de esas acciones, enviar un `POST http://localhost:3000/events`:

| Operación en tu CRUD | Método HTTP de tu API | `action` enviado al Hub |
| :--- | :--- | :--- |
| Listar / Buscar registros | `GET /api/<entidad>` | `"QUERY"` |
| Crear registro | `POST /api/<entidad>` | `"CREATE"` |
| Actualizar registro | `PUT /api/<entidad>/:id` | `"UPDATE"` |
| Eliminar registro | `DELETE /api/<entidad>/:id` | `"DELETE"` |

**Ejemplo de helper `eventClient.js` (con `try/catch` para no romper tu CRUD si el Hub está apagado):**

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
      console.error(`[EventManager] Error ${response.status}:`, await response.text());
    }
  } catch (error) {
    console.error('[EventManager] No se pudo conectar al Hub:', error.message);
  }
}

module.exports = { sendEvent };
```

---

### 2.3 Stack Sugerido para Terminar Rápido

Puedes usar cualquier lenguaje o framework para tu CRUD, pero si quieres terminarlo rápido hoy mismo, se recomienda:

- **Backend:** Node.js + Express (`express`, `cors`, `dotenv`, `better-sqlite3`) en puerto `3001`.
- **Frontend (opcional pero muy útil para el video):** HTML + CSS + JS puro en una carpeta `public/` servida por el mismo Express.
- **Variables de entorno (`.env`):**
  ```env
  PORT=3001
  EVENT_MANAGER_URL=http://localhost:3000
  ```

---

## Entregables: 2 Videos por Integrante en Teams

Cada integrante debe subir **2 videos** al **canal de Teams del profesor**:

### Video 1 — Mantenimiento en el Event Manager (Fase 1)
1. **El Antes (Diagnóstico):** Muestra el problema o debilidad original de tu Issue en ejecución (Bruno/Postman y/o `events.sqlite`).
2. **La Intervención y Justificación:** Muestra el código modificado (**antes vs. después**, puedes usar el diff de tu PR o `git diff`) y explica **por qué** clasifica exactamente en ese tipo de mantenimiento (*Correctivo*, *Adaptativo*, *Perfectivo* o *Preventivo*).
3. **El Después:** Demuestra que tu corrección ya funciona correctamente sin romper los demás endpoints.

### Video 2 — Tu CRUD conectado al Event Manager Corregido (Fase 2)
1. **Contexto:** Explica brevemente la temática de tu CRUD, cómo está estructurada tu API REST y cómo se conecta a `http://localhost:3000/events` desde tu repositorio independiente.
2. **Prueba de Vida:** Con el `epn-event-manager` ya corregido corriendo en `:3000` y tu CRUD corriendo en tu puerto (ej. `:3001`), ejecuta las 4 operaciones (**Crear, Consultar, Editar, Eliminar**) y muestra en vivo en `GET http://localhost:3000/events` y `GET http://localhost:3000/stats` (y/o en SQLite) que todos los eventos quedaron registrados correctamente.

---

## Checklist Final para Terminar Hoy

- [ ] Todos instalaron herramientas y levantaron `epn-event-manager` en `:3000`.
- [ ] Cada integrante grabó/capturó el **"antes"** de su Issue.
- [ ] Cada integrante creó su rama desde `develop`, aplicó su mantenimiento y abrió PR hacia `develop`.
- [ ] Los 4 PRs están aprobados y mergeados en `develop`, y `develop` mergeado en `main`.
- [ ] Todos actualizaron su repo local (`git pull`) para tener el Event Manager corregido.
- [ ] Cada integrante creó su repositorio CRUD independiente con temática libre y lo conectó a `POST http://localhost:3000/events`.
- [ ] Cada integrante grabó y subió sus **2 videos** al canal de Teams del profesor.
