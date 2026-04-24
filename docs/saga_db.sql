CREATE DATABASE IF NOT EXISTS saga CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saga;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(45) NOT NULL DEFAULT 'admin',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ciudadanos (
    id_ciudadano INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(120) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT (CURRENT_DATE),
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS reuniones (
    id_reunion INT AUTO_INCREMENT PRIMARY KEY,
    nombre_reunion VARCHAR(100) NOT NULL,
    fecha_reunion DATE NOT NULL,
    descripcion TEXT NULL
);

CREATE TABLE IF NOT EXISTS asistencias (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_ciudadano INT NOT NULL,
    id_reunion INT NOT NULL,
    estado_asistencia BOOLEAN NOT NULL DEFAULT FALSE,
    hora_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_asistencia UNIQUE (id_ciudadano, id_reunion),
    CONSTRAINT fk_asistencia_ciudadano FOREIGN KEY (id_ciudadano)
        REFERENCES ciudadanos(id_ciudadano) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_asistencia_reunion FOREIGN KEY (id_reunion)
        REFERENCES reuniones(id_reunion) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO usuarios (nombre_usuario, contrasena, rol)
VALUES ('admin', '1234', 'admin')
ON DUPLICATE KEY UPDATE nombre_usuario = VALUES(nombre_usuario);