-- Creación de la base de datos
CREATE DATABASE IF NOT EXISTS saga CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saga;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    salt VARCHAR(64) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    rol VARCHAR(45) NOT NULL DEFAULT 'admin',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Ciudadanos
CREATE TABLE IF NOT EXISTS ciudadanos (
    id_ciudadano INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    apellido_paterno VARCHAR(80) NOT NULL,
    apellido_materno VARCHAR(80) NOT NULL,
    nombres VARCHAR(120) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    fecha_ingreso DATE NOT NULL DEFAULT (CURRENT_DATE),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_ciudadano_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Tabla de Reuniones
CREATE TABLE IF NOT EXISTS reuniones (
    id_reunion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_reunion VARCHAR(100) NOT NULL,
    fecha_reunion DATE NOT NULL,
    descripcion TEXT NULL,
    finalizada BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_reunion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Tabla de Asistencias
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

-- 5. Inserción de usuario administrador inicial
INSERT INTO usuarios (nombre_usuario, salt, password_hash, rol)
VALUES ('admin', '02c3d39ddfdabca7a85bdb7ad5fef287', 'adc52ac2bd1305054be482b9c7c317fbcb6e37a74719041f610b1a244591da972816285e1e0934a554c1501915f1f6c40f4bd09c8760a3e7a386b3b496cfeb4f', 'admin')
ON DUPLICATE KEY UPDATE salt = VALUES(salt), password_hash = VALUES(password_hash), rol = VALUES(rol);
