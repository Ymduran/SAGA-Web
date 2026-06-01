const path = require("path");
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");



require("dotenv").config();
const app = express();
const port = Number(process.env.PORT || 3000);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "saga",
  password: process.env.DB_PASSWORD || "proyecto2026",
  database: process.env.DB_NAME || "saga",
  waitForConnections: true,
  connectionLimit: 10
});

app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));
//app.use(express.static(__dirname));

/*
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});*/
app.get("/", (_req, res) => {
  console.log("Entrando al login");
  res.sendFile(path.join(__dirname, "public/src/views/login.html"));
});
/*
app.post("/api/auth/login", async (req, res) => {
  const { usuario, contrasena } = req.body;
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id_usuario, nombre_usuario, rol FROM usuarios WHERE nombre_usuario = ? AND contrasena = ?",
      [usuario, contrasena]
    );
    if (!rows.length) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }
    return res.json({ message: "Login correcto", user: rows[0] });
  } catch (error) {
    return res.status(500).json({ error: "Error al validar usuario." });
  }
});
*/
app.post("/api/auth/login", async (req, res) => {

  const { usuario, contrasena } = req.body;

  // Validar campos vacíos
  if (!usuario || !contrasena) {

    return res.status(400).json({
      error: "Todos los campos son obligatorios."
    });

  }

  try {

    // Buscar usuario
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE nombre_usuario = ?",
      [usuario]
    );

    // Verificar usuario
    if (rows.length === 0) {

      return res.status(401).json({
        error: "Usuario o contraseña incorrectos."
      });

    }

    const usuarioDB = rows[0];

    // Comparar contraseña encriptada
    /*
    const passwordCorrecta = await bcrypt.compare(
      contrasena,
      usuarioDB.contrasena
    );*/
    const passwordCorrecta = contrasena === usuarioDB.contrasena;

    // Contraseña incorrecta
    if (!passwordCorrecta) {

      return res.status(401).json({
        error: "Usuario o contraseña incorrectos."
      });

    }

    // Login exitoso
    res.json({

      mensaje: "Inicio de sesión exitoso",

      usuario: {
        id: usuarioDB.id_usuario,
        nombre: usuarioDB.nombre_usuario,
        rol: usuarioDB.rol
      }

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Error interno del servidor"
    });

  }

});

app.get("/api/ciudadanos", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_ciudadano, nombre_completo, telefono, fecha_ingreso FROM ciudadanos WHERE estado = 1 ORDER BY id_ciudadano DESC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "No fue posible consultar ciudadanos." });
  }
});

app.post("/api/ciudadanos", async (req, res) => {
  const { nombre_completo, telefono } = req.body;
  if (!nombre_completo || !telefono) {
    return res.status(400).json({ error: "Nombre y teléfono son obligatorios." });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO ciudadanos (nombre_completo, telefono) VALUES (?, ?)",
      [nombre_completo, telefono]
    );
    const [rows] = await pool.query(
      "SELECT id_ciudadano, nombre_completo, telefono, fecha_ingreso FROM ciudadanos WHERE id_ciudadano = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "No fue posible crear el ciudadano." });
  }
});

app.put("/api/ciudadanos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre_completo, telefono } = req.body;
  if (!nombre_completo || !telefono) {
    return res.status(400).json({ error: "Nombre y teléfono son obligatorios." });
  }

  try {
    const [result] = await pool.query(
      "UPDATE ciudadanos SET nombre_completo = ?, telefono = ? WHERE id_ciudadano = ? AND estado = 1",
      [nombre_completo, telefono, id]
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
    const [result] = await pool.query(
      "UPDATE ciudadanos SET estado = 0 WHERE id_ciudadano = ?",
      [id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Ciudadano no encontrado." });
    }
    res.json({ message: "Ciudadano eliminado." });
  } catch (error) {
    res.status(500).json({ error: "No fue posible eliminar el ciudadano." });
  }
});

app.get("/api/reuniones", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_reunion, nombre_reunion, fecha_reunion, descripcion FROM reuniones ORDER BY fecha_reunion DESC"
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
  try {
    const [result] = await pool.query(
      "INSERT INTO reuniones (nombre_reunion, fecha_reunion, descripcion) VALUES (?, ?, ?)",
      [nombre_reunion, fecha_reunion, descripcion || null]
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
  try {
    const [result] = await pool.query(
      "UPDATE reuniones SET nombre_reunion = ?, fecha_reunion = ?, descripcion = ? WHERE id_reunion = ?",
      [nombre_reunion, fecha_reunion, descripcion || null, id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Reunión no encontrada." });
    }
    res.json({ message: "Reunión actualizada." });
  } catch (error) {
    res.status(500).json({ error: "No fue posible actualizar la reunión." });
  }
});

app.get("/api/asistencias", async (req, res) => {
  const reunionId = Number(req.query.reunionId);
  const search = (req.query.search || "").trim();
  if (!reunionId) {
    return res.status(400).json({ error: "reunionId es obligatorio." });
  }

  try {
    const [rows] = await pool.query(
      `SELECT c.id_ciudadano, c.nombre_completo, c.telefono,
              COALESCE(a.estado_asistencia, 0) AS estado_asistencia
       FROM ciudadanos c
       LEFT JOIN asistencias a
         ON a.id_ciudadano = c.id_ciudadano AND a.id_reunion = ?
       WHERE c.estado = 1
         AND (c.nombre_completo LIKE ? OR CAST(c.id_ciudadano AS CHAR) LIKE ?)
       ORDER BY c.nombre_completo ASC`,
      [reunionId, `%${search}%`, `%${search}%`]
    );
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




