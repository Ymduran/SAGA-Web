CREATE DATABASE IF NOT EXISTS SAGA;
USE SAGA;

CREATE TABLE Usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    contraseña VARCHAR(255) NOT NULL, -- Aumentado para seguridad (Hashes)
    rol VARCHAR(45) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
    
CREATE TABLE Ciudadanos (
    id_citizen INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50) NOT NULL,
    telefono VARCHAR(15), 
    fecha_ingreso DATE DEFAULT (CURRENT_DATE),
    estado BOOLEAN DEFAULT TRUE
);

CREATE TABLE Reuniones (
    id_reunion INT AUTO_INCREMENT PRIMARY KEY,
    nombre_reunion VARCHAR(100) NOT NULL,
    fecha_reunion DATE DEFAULT (CURRENT_DATE),
    descripcion TEXT
);
    
CREATE TABLE Asistencias (
    id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
    id_ciudadano INT NOT NULL,
    id_reunion INT NOT NULL,
    id_usuario_registro INT NOT NULL,
    hora_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_asistencia BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT unique_asistencia UNIQUE (id_ciudadano, id_reunion),

    CONSTRAINT fk_asistencia_ciudadano FOREIGN KEY (id_ciudadano) 
        REFERENCES Ciudadanos(id_ciudadano) ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_asistencia_reunion FOREIGN KEY (id_reunion) 
        REFERENCES Reuniones(id_reunion) ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_asistencia_usuario FOREIGN KEY (id_usuario_registro) 
        REFERENCES Usuarios(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);