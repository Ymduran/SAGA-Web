const path = require("path");
const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const loginPage = path.join(publicDir, "src", "views", "login.html");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "saga",
  waitForConnections: true,
  connectionLimit: 10
});

const PBKDF2_ITERATIONS = Number(process.env.PBKDF2_ITERATIONS || 100000);
const PBKDF2_KEYLEN = Number(process.env.PBKDF2_KEYLEN || 64);
const PBKDF2_DIGEST = process.env.PBKDF2_DIGEST || "sha512";

function derivePasswordHash(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
}

function isAuthenticated(req) {
  return Boolean(req.session?.user);
}

function requireAuthPage(req, res, next) {
  if (isAuthenticated(req)) return next();
  return res.redirect("/");
}

function requireAuthApi(req, res, next) {
  if (isAuthenticated(req)) return next();
  return res.status(401).json({ error: "No autenticado." });
}

function validarTelefonoMx(telefono) {
  const soloDigitos = String(telefono || "").replace(/\D/g, "");
  if (soloDigitos.length !== 10) {
    return {
      ok: false,
      error: "El teléfono debe tener exactamente 10 dígitos (ej. 9516668896)."
    };
  }
  return { ok: true, telefono: soloDigitos };
}

function validarTextoNombre(texto, campo) {
  const valor = String(texto || "").trim();
  const nombreRegex = /^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/;
  if (!valor || !nombreRegex.test(valor)) {
    return {
      ok: false,
      error: `El campo ${campo} solo permite letras, acentos y espacios.`
    };
  }
  return { ok: true, texto: valor };
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "saga-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.get("/", (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect("/inicio");
  }
  return res.sendFile(loginPage);
});

const protectedPages = [
  ["/inicio", path.join(__dirname, "index.html")],
  ["/public/src/views/ciudadanos.html", path.join(publicDir, "src", "views", "ciudadanos.html")],
  ["/public/src/views/registros.html", path.join(publicDir, "src", "views", "registros.html")],
  ["/public/src/views/reuniones.html", path.join(publicDir, "src", "views", "reuniones.html")],
  ["/public/src/views/reportes.html", path.join(publicDir, "src", "views", "reportes.html")]
];

protectedPages.forEach(([route, filePath]) => {
  app.get(route, requireAuthPage, (_req, res) => {
    res.sendFile(filePath);
  });
});

app.get("/index.html", requireAuthPage, (_req, res) => {
  res.redirect("/inicio");
});

app.use("/public", (req, res, next) => {
  const isProtectedView =
    req.path.startsWith("/src/views/") && !req.path.endsWith("/login.html");
  if (isProtectedView && !isAuthenticated(req)) {
    return res.redirect("/");
  }
  return next();
}, express.static(publicDir));

app.use("/api", (req, res, next) => {
  const isPublicAuthRoute =
    (req.method === "POST" && (req.path === "/auth/login" || req.path === "/auth/register")) ||
    (req.method === "GET" && req.path === "/auth/me");
  if (isPublicAuthRoute) return next();
  return requireAuthApi(req, res, next);
});

app.get("/api/auth/me", (req, res) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "No autenticado." });
  }
  return res.json({ user: req.session.user });
});

app.post("/api/auth/login", async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;
  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id_usuario, nombre_usuario, rol, salt, password_hash FROM usuarios WHERE nombre_usuario = ?",
      [nombre_usuario]
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    const user = rows[0];
    if (!user.salt || !user.password_hash) {
      return res.status(500).json({ error: "La configuración de autenticación es incompleta." });
    }

    const computedHash = derivePasswordHash(contrasena, user.salt);
    const validPassword =
      computedHash.length === user.password_hash.length &&
      crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(user.password_hash, "hex"));

    if (!validPassword) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    req.session.user = {
      id_usuario: user.id_usuario,
      nombre_usuario: user.nombre_usuario,
      rol: user.rol
    };
    return res.json({ message: "Login correcto", user: req.session.user });
  } catch (error) {
    return res.status(500).json({ error: "Error al validar usuario." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: "No fue posible cerrar sesión." });
    }
    res.clearCookie("connect.sid");
    return res.json({ message: "Sesión cerrada." });
  });
});

app.get("/api/ciudadanos", async (req, res) => {
  try {
    const userId = req.session.user.id_usuario;
    const [rows] = await pool.query(
      "SELECT id_ciudadano, apellido_paterno, apellido_materno, nombres, telefono, fecha_ingreso FROM ciudadanos WHERE activo = 1 AND id_usuario = ? ORDER BY id_ciudadano DESC",
      [userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "No fue posible consultar ciudadanos." });
  }
});

app.post("/api/ciudadanos", async (req, res) => {
  const { apellido_paterno, apellido_materno, nombres, telefono } = req.body;
  if (!apellido_paterno || !apellido_materno || !nombres || !telefono) {
    return res.status(400).json({ error: "Apellido paterno, apellido materno, nombre(s) y teléfono son obligatorios." });
  }

  const validApellidoPaterno = validarTextoNombre(apellido_paterno, "Apellido Paterno");
  if (!validApellidoPaterno.ok) {
    return res.status(400).json({ error: validApellidoPaterno.error });
  }
  const validApellidoMaterno = validarTextoNombre(apellido_materno, "Apellido Materno");
  if (!validApellidoMaterno.ok) {
    return res.status(400).json({ error: validApellidoMaterno.error });
  }
  const validNombres = validarTextoNombre(nombres, "Nombre(s)");
  if (!validNombres.ok) {
    return res.status(400).json({ error: validNombres.error });
  }

  const telefonoValidado = validarTelefonoMx(telefono);
  if (!telefonoValidado.ok) {
    return res.status(400).json({ error: telefonoValidado.error });
  }

  try {
    const userId = req.session.user.id_usuario;
    const [result] = await pool.query(
      "INSERT INTO ciudadanos (id_usuario, apellido_paterno, apellido_materno, nombres, telefono) VALUES (?, ?, ?, ?, ?)",
      [userId, validApellidoPaterno.texto, validApellidoMaterno.texto, validNombres.texto, telefonoValidado.telefono]
    );
    const [rows] = await pool.query(
      "SELECT id_ciudadano, apellido_paterno, apellido_materno, nombres, telefono, fecha_ingreso FROM ciudadanos WHERE id_ciudadano = ? AND id_usuario = ?",
      [result.insertId, userId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "No fue posible crear el ciudadano." });
  }
});

app.put("/api/ciudadanos/:id", async (req, res) => {
  const { id } = req.params;
  const { apellido_paterno, apellido_materno, nombres, telefono } = req.body;
  if (!apellido_paterno || !apellido_materno || !nombres || !telefono) {
    return res.status(400).json({ error: "Apellido paterno, apellido materno, nombre(s) y teléfono son obligatorios." });
  }

  const validApellidoPaterno = validarTextoNombre(apellido_paterno, "Apellido Paterno");
  if (!validApellidoPaterno.ok) {
    return res.status(400).json({ error: validApellidoPaterno.error });
  }
  const validApellidoMaterno = validarTextoNombre(apellido_materno, "Apellido Materno");
  if (!validApellidoMaterno.ok) {
    return res.status(400).json({ error: validApellidoMaterno.error });
  }
  const validNombres = validarTextoNombre(nombres, "Nombre(s)");
  if (!validNombres.ok) {
    return res.status(400).json({ error: validNombres.error });
  }

  const telefonoValidado = validarTelefonoMx(telefono);
  if (!telefonoValidado.ok) {
    return res.status(400).json({ error: telefonoValidado.error });
  }

  try {
    const userId = req.session.user.id_usuario;
    const [result] = await pool.query(
      "UPDATE ciudadanos SET apellido_paterno = ?, apellido_materno = ?, nombres = ?, telefono = ? WHERE id_ciudadano = ? AND activo = 1 AND id_usuario = ?",
      [validApellidoPaterno.texto, validApellidoMaterno.texto, validNombres.texto, telefonoValidado.telefono, id, userId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Ciudadano no encontrado." });
    }
    res.json({ message: "Ciudadano actualizado." });
  } catch (error) {
    res.status(500).json({ error: "No fue posible actualizar el ciudadano." });
  }
});

app.delete("/api/ciudadanos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.session.user.id_usuario;
    const [result] = await pool.query(
      "UPDATE ciudadanos SET activo = 0 WHERE id_ciudadano = ? AND id_usuario = ?",
      [id, userId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Ciudadano no encontrado." });
    }
    res.json({ message: "Ciudadano eliminado." });
  } catch (error) {
    res.status(500).json({ error: "No fue posible eliminar el ciudadano." });
  }
});

app.get("/api/reuniones", async (req, res) => {
  try {
    const userId = req.session.user.id_usuario;
    const [rows] = await pool.query(
      "SELECT id_reunion, nombre_reunion, fecha_reunion, descripcion, finalizada FROM reuniones WHERE id_usuario = ? ORDER BY fecha_reunion DESC",
      [userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "No fue posible consultar reuniones." });
  }
});

app.post("/api/reuniones", async (req, res) => {
  const { nombre_reunion, fecha_reunion, descripcion } = req.body;
  if (!nombre_reunion || !fecha_reunion) {
    return res.status(400).json({ error: "Nombre y fecha son obligatorios." });
  }
  // Verify the user is authenticated and has an id
  if (!req.session || !req.session.user || !req.session.user.id_usuario) {
    return res.status(401).json({ error: "No autenticado." });
  }

  // Validate fecha_reunion is not in the past (local date)
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  if (fecha_reunion < hoyStr) {
    return res.status(400).json({ error: "La fecha de la reunión no puede ser anterior a hoy." });
  }

  try {
    const userId = req.session.user.id_usuario;
    const [result] = await pool.query(
      "INSERT INTO reuniones (id_usuario, nombre_reunion, fecha_reunion, descripcion) VALUES (?, ?, ?, ?)",
      [userId, nombre_reunion, fecha_reunion, descripcion || null]
    );
    res.status(201).json({ id_reunion: result.insertId });
  } catch (error) {
    res.status(500).json({ error: "No fue posible crear la reunión." });
  }
});

app.put("/api/reuniones/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre_reunion, fecha_reunion, descripcion } = req.body;
  if (!nombre_reunion || !fecha_reunion) {
    return res.status(400).json({ error: "Nombre y fecha son obligatorios." });
  }
  // Verify the user is authenticated
  if (!req.session || !req.session.user || !req.session.user.id_usuario) {
    return res.status(401).json({ error: "No autenticado." });
  }

  // Validate fecha_reunion is not in the past (local date)
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  if (fecha_reunion < hoyStr) {
    return res.status(400).json({ error: "La fecha de la reunión no puede ser anterior a hoy." });
  }

  try {
    const userId = req.session.user.id_usuario;
    const [reunionRows] = await pool.query(
      "SELECT finalizada FROM reuniones WHERE id_reunion = ? AND id_usuario = ?",
      [id, userId]
    );

    if (!reunionRows.length) {
      return res.status(404).json({ error: "Reunión no encontrada." });
    }

    if (reunionRows[0].finalizada) {
      return res.status(400).json({ error: "No es posible editar una reunión finalizada." });
    }

    const [result] = await pool.query(
      "UPDATE reuniones SET nombre_reunion = ?, fecha_reunion = ?, descripcion = ? WHERE id_reunion = ? AND id_usuario = ?",
      [nombre_reunion, fecha_reunion, descripcion || null, id, userId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Reunión no encontrada." });
    }
    res.json({ message: "Reunión actualizada." });
  } catch (error) {
    res.status(500).json({ error: "No fue posible actualizar la reunión." });
  }
});

app.post("/api/reuniones/:id/finalizar", async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.session.user.id_usuario;
    const [rows] = await pool.query(
      "SELECT finalizada FROM reuniones WHERE id_reunion = ? AND id_usuario = ?",
      [id, userId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Reunión no encontrada." });
    }
    if (rows[0].finalizada) {
      return res.status(400).json({ error: "La reunión ya está finalizada." });
    }
    await pool.query(
      "UPDATE reuniones SET finalizada = 1 WHERE id_reunion = ? AND id_usuario = ?",
      [id, userId]
    );
    res.json({ message: "Reunión marcada como finalizada." });
  } catch (error) {
    res.status(500).json({ error: "No fue posible finalizar la reunión." });
  }
});

app.get("/api/asistencias", async (req, res) => {
  const reunionId = Number(req.query.reunionId);
  const search = (req.query.search || "").trim();
  if (!reunionId) {
    return res.status(400).json({ error: "reunionId es obligatorio." });
  }

  const searchPattern = `%${search}%`;

  try {
    const userId = req.session.user.id_usuario;
    const [[reunion]] = await pool.query(
      "SELECT finalizada FROM reuniones WHERE id_reunion = ? AND id_usuario = ?",
      [reunionId, userId]
    );
    if (!reunion) {
      return res.status(404).json({ error: "Reunión no encontrada." });
    }

    let rows;
    if (!reunion.finalizada) {
      // Reuniones abiertas o futuras: mostrar todos los ciudadanos existentes + asistencias ya registradas.
      [rows] = await pool.query(
        `SELECT c.id_ciudadano, c.apellido_paterno, c.apellido_materno, c.nombres, c.telefono,
                COALESCE(a.estado_asistencia, 0) AS estado_asistencia
         FROM ciudadanos c
         LEFT JOIN asistencias a
           ON a.id_ciudadano = c.id_ciudadano AND a.id_reunion = ?
         WHERE (c.activo = 1 OR a.id_asistencia IS NOT NULL)
           AND (c.apellido_paterno LIKE ? OR c.apellido_materno LIKE ? OR c.nombres LIKE ? OR CAST(c.id_ciudadano AS CHAR) LIKE ?)
         ORDER BY c.nombres ASC, c.apellido_paterno ASC`,
        [reunionId, searchPattern, searchPattern, searchPattern, searchPattern]
      );
    } else {
      // Reuniones finalizadas: historial fiel desde la tabla de asistencias sin generar ausentes nuevos.
      [rows] = await pool.query(
        `SELECT c.id_ciudadano, c.apellido_paterno, c.apellido_materno, c.nombres, c.telefono, a.estado_asistencia
         FROM asistencias a
         INNER JOIN ciudadanos c ON c.id_ciudadano = a.id_ciudadano
         WHERE a.id_reunion = ?
           AND (c.apellido_paterno LIKE ? OR c.apellido_materno LIKE ? OR c.nombres LIKE ? OR CAST(c.id_ciudadano AS CHAR) LIKE ?)
         ORDER BY c.nombres ASC, c.apellido_paterno ASC`,
        [reunionId, searchPattern, searchPattern, searchPattern, searchPattern]
      );
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "No fue posible consultar asistencias." });
  }
});

app.post("/api/asistencias", async (req, res) => {
  const { id_ciudadano, id_reunion, estado_asistencia } = req.body;
  if (!id_ciudadano || !id_reunion) {
    return res.status(400).json({ error: "id_ciudadano e id_reunion son obligatorios." });
  }

  try {
    const userId = req.session.user.id_usuario;
    const [reunionRows] = await pool.query(
      "SELECT finalizada FROM reuniones WHERE id_reunion = ? AND id_usuario = ?",
      [id_reunion, userId]
    );
    if (!reunionRows.length) {
      return res.status(404).json({ error: "Reunión no encontrada." });
    }
    if (reunionRows[0].finalizada) {
      return res.status(400).json({ error: "No se pueden cambiar asistencias de una reunión finalizada." });
    }

    await pool.query(
      `INSERT INTO asistencias (id_ciudadano, id_reunion, estado_asistencia)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       estado_asistencia = VALUES(estado_asistencia),
       hora_registro = CURRENT_TIMESTAMP`,
      [id_ciudadano, id_reunion, Boolean(estado_asistencia)]
    );
    res.json({ message: "Asistencia guardada." });
  } catch (error) {
    res.status(500).json({ error: "No fue posible guardar asistencia." });
  }
});

app.get("/api/reportes/resumen", async (req, res) => {
  const reunionId = Number(req.query.reunionId);
  const fechaInicio = req.query.fechaInicio;
  const fechaFin = req.query.fechaFin;

  const where = [];
  const values = [];

  // Always scope reports to the logged-in user's reuniones
  where.push("r.id_usuario = ?");
  values.push(req.session.user.id_usuario);

  if (reunionId) {
    where.push("r.id_reunion = ?");
    values.push(reunionId);
  }
  if (fechaInicio) {
    where.push("r.fecha_reunion >= ?");
    values.push(fechaInicio);
  }
  if (fechaFin) {
    where.push("r.fecha_reunion <= ?");
    values.push(fechaFin);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  try {
    const [rows] = await pool.query(
      `SELECT
         SUM(CASE WHEN a.estado_asistencia = 1 THEN 1 ELSE 0 END) AS presentes,
         SUM(CASE WHEN a.estado_asistencia = 0 THEN 1 ELSE 0 END) AS ausentes
       FROM asistencias a
       INNER JOIN reuniones r ON r.id_reunion = a.id_reunion
       ${whereClause}`,
      values
    );
    const presentes = Number(rows[0].presentes || 0);
    const ausentes = Number(rows[0].ausentes || 0);
    const total = presentes + ausentes;
    const porcentaje_presentes = total ? Math.round((presentes * 100) / total) : 0;
    const porcentaje_ausentes = total ? 100 - porcentaje_presentes : 0;
    res.json({ presentes, ausentes, porcentaje_presentes, porcentaje_ausentes, total });
  } catch (error) {
    res.status(500).json({ error: "No fue posible calcular el reporte." });
  }
});

app.listen(port, () => {
  console.log(`SAGA disponible en http://localhost:${port}`);
});

app.post("/api/auth/register", async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;
  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios." });
  }

  try {
    const [[existing]] = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE nombre_usuario = ?",
      [nombre_usuario]
    );
    if (existing) {
      return res.status(400).json({ error: "El nombre de usuario ya está en uso." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const password_hash = derivePasswordHash(contrasena, salt);

    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre_usuario, salt, password_hash) VALUES (?, ?, ?)",
      [nombre_usuario, salt, password_hash]
    );

    return res.status(201).json({ message: "Cuenta creada correctamente", id_usuario: result.insertId });
  } catch (error) {
    return res.status(500).json({ error: "Error al crear el usuario." });
  }
});