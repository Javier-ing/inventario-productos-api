# API de inventario de productos

API REST para gestionar los productos de un inventario, construida con **Node.js**, **Express** y **MongoDB (Mongoose)**,
siguiendo el componente formativo «Construcción API».

- Programa: Análisis y desarrollo del software (SENA, ficha 3336155) · Evidencia **GA7-220501096-AA5-EV01**
- Aprendiz: Javier Eduardo Osorio Garcia
- Repositorio: https://github.com/Javier-ing/inventario-productos-api

## Servicios

| Servicio | Método y URL | Respuestas |
|---|---|---|
| Estado del servicio | `GET /api` | 200 |
| Listar / buscar productos | `GET /api/productos` · `GET /api/productos?nombre=texto` | 200 · 400 · 503 |
| Consultar un producto | `GET /api/productos/{id}` | 200 · 400 · 404 · 503 |
| Registrar un producto | `POST /api/productos` | 201 (+ `Location`) · 400 · 409 · 413 · 503 |
| Actualizar un producto | `PUT /api/productos/{id}` | 200 · 400 · 404 · 409 · 503 |
| Eliminar un producto | `DELETE /api/productos/{id}` | 204 · 400 · 404 · 503 |

Documentación de cada servicio:

- **Swagger UI** (interactiva): con la API encendida, abra <http://localhost:8080/api-docs>.
- **Contrato OpenAPI**: `docs/openapi.yaml`.
- **Documento Word/PDF** con ejemplos reales de cada servicio: `docs/Documentacion_API_AA5_EV01.docx` (y `.pdf`).

Cuerpo de producto (`POST` y `PUT`):

```json
{ "codigo": "P-006", "nombre": "Webcam HD", "descripcion": "Cámara web 1080p", "precio": 125000, "stock": 15 }
```

La respuesta agrega `idProducto` (generado por MongoDB) y `fechaRegistro`. Todos los errores tienen el mismo formato:

```json
{ "fecha": "...", "estado": 400, "error": "Bad Request", "mensaje": "Los datos enviados no son válidos",
  "detalles": { "precio": "El precio no puede ser negativo" } }
```

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior (probado con Node 22) y npm.
- Una base de datos MongoDB (**una de las dos opciones**):
    - **Local:** MongoDB Community Server (<https://www.mongodb.com/try/download/community>), servicio en el puerto 27017.
    - **En la nube:** un clúster gratuito de MongoDB Atlas (reemplazo actual de mLab, citado en el componente formativo).
- Visual Studio Code (recomendado) y Postman (opcional).

## Puesta en marcha

```bash
npm install                 # instala las dependencias
cp .env.example .env        # en Windows (CMD): copy .env.example .env  — luego edite los valores si hace falta
npm run sembrar             # (opcional) carga 5 productos de ejemplo
npm run dev                 # modo desarrollo con nodemon (se reinicia al guardar)
# o bien: npm start
```

Con la API encendida: <http://localhost:8080/api> (estado) y <http://localhost:8080/api-docs> (documentación).

Variables de `.env`:

| Variable | Uso | Valor por defecto |
|---|---|---|
| `PORT` | Puerto de la API | `8080` |
| `MONGODB_URI` | Conexión a MongoDB (local o Atlas) | `mongodb://127.0.0.1:27017/inventario_db` |
| `MONGODB_URI_TEST` | Base **solo para pruebas** (su nombre debe terminar en `_test`) | `mongodb://127.0.0.1:27017/inventario_test` |
| `CORS_ORIGIN` | Orígenes permitidos (frontend), separados por coma | `http://localhost:5173` |

> El archivo `.env` contiene credenciales: está en `.gitignore` y **no** debe subirse a GitHub.

## Pruebas

```bash
npm test        # 96 pruebas (Vitest + Supertest) — requieren MongoDB encendido
npm run lint    # normas de codificación (ESLint)
```

Las pruebas de integración usan una base de datos real (`inventario_test`), que se **borra** al terminar.
Con la API encendida también puede ejecutar la colección de Postman de la carpeta `postman/`
(importe `Inventario_API_AA5_EV01.postman_collection.json` y el entorno `Inventario_local.postman_environment.json`;
ejecute la colección completa con *Runner*). Cada petición trae sus propias verificaciones.

## Estructura del proyecto

```
app.js                  Configura Express, conecta con MongoDB y abre el puerto
config/baseDatos.js     Conexión a MongoDB
models/Producto.js      Esquema Mongoose del producto (índices y forma del JSON)
routes/productos.js     Rutas /api/productos
controllers/            Lógica de cada servicio
middlewares/            Validación del id, base de datos disponible y manejo de errores
utils/                  ErrorApi y validaciones de los datos
scripts/sembrar.js      Datos de ejemplo
docs/                   Contrato OpenAPI y documentación de los servicios
postman/                Colección y entorno de Postman
tests/                  Pruebas automáticas
```

## Decisiones de diseño

- **Mismo contrato que la versión Spring Boot del proyecto** (rutas, campos, mensajes y formato de error), para que un
  mismo frontend pueda consumir cualquiera de las dos APIs. Diferencia: el identificador `idProducto` es un texto de
  24 caracteres (ObjectId de MongoDB) y no un número.
- **Código único sin distinguir mayúsculas:** índice único con *collation* (`P-001` y `p-001` son el mismo producto).
- **Validación en dos capas:** reglas propias (`utils/validaciones.js`, un mensaje por campo y siempre el mismo orden)
  y, como respaldo, las reglas del esquema de Mongoose.
- **Precio** guardado como número con hasta 2 decimales; es adecuado para este ejercicio, pero un sistema contable real
  debería usar enteros en centavos o `Decimal128`.
- **Búsqueda por nombre** sin distinguir mayúsculas pero **sí** tildes (`camara` no encuentra `cámara`).
- Sin autenticación: está fuera del alcance de esta evidencia.

## Estándares de codificación aplicados

Punto y coma, comillas simples, `lowerCamelCase` para variables y funciones, `UpperCamelCase` para clases, sangría de
4 espacios, máximo 120 caracteres por línea, funciones cortas de una sola tarea, errores capturados con mensajes
precisos y comentarios JSDoc. `npm run lint` verifica estas reglas.

## Control de versiones

Proyecto versionado con Git (rama `main`, un commit por etapa). Para publicarlo, cree en GitHub un repositorio vacío
llamado `inventario-productos-api` y ejecute:

```bash
git remote add origin https://github.com/Javier-ing/inventario-productos-api.git
git push -u origin main
```

(GitHub pide un *Personal Access Token* en lugar de la contraseña.)
