# Node + Express Service Starter

This is a simple API sample in Node.js with express.js based on [Google Cloud Run Quickstart](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service).

## Getting Started

Server should run automatically when starting a workspace. To run manually, run:
```sh
npm run dev
```

Script bd


-- Reservas de canchas
CREATE TABLE reservas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cancha_id INT NOT NULL,
    equipo_id INT NULL, -- Solo equipos pueden reservar según tu aclaración
    usuario_solicitante_id INT NULL, -- Debe ser capitán del equipo
    partido_id INT, -- Si la reserva es para un partido
    fecha_reserva DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_horas DECIMAL(3, 1) NOT NULL,
    monto_total DECIMAL(10, 2) NOT NULL,
    estado ENUM('pendiente', 'confirmada', 'cancelada', 'completada') DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cancha_id) REFERENCES canchas(id),
    INDEX idx_fecha_cancha (cancha_id, fecha_reserva, hora_inicio)
);

-- Solicitudes de reserva (requieren aprobación de empresa)
CREATE TABLE solicitudes_reserva (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reserva_id INT NOT NULL UNIQUE,
    cancha_id INT NOT NULL,
    usuario_solicitante_id INT  NULL,
    usuario_acepto_rechazo_id INT NULL, -- Usuario de empresa que procesó
    mensaje_solicitud TEXT,
    estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'pendiente',
    motivo_rechazo TEXT,
    fecha_respuesta TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE,
    FOREIGN KEY (cancha_id) REFERENCES canchas(id)
);


-- Canchas deportivas
CREATE TABLE canchas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    empresa_id INT NULL,
    tipo_deporte_id INT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    superficie ENUM('cesped_natural', 'cesped_sintetico', 'cemento', 'madera', 'tierra', 'otro'),
    esta_techada BOOLEAN DEFAULT FALSE,
    capacidad_jugadores INT,
    largo_metros DECIMAL(5, 2),
    ancho_metros DECIMAL(5, 2),
    precio_hora DECIMAL(10, 2) NOT NULL,
    precio_hora_fin_semana DECIMAL(10, 2), -- Precio diferenciado
    imagenes JSON, -- Array de URLs de imágenes
    servicios_adicionales JSON, -- ['vestuarios', 'estacionamiento', 'cafetería', etc.]
    ubicacion TEXT, -- Dirección específica si difiere de la empresa
    coordenadas_lat DECIMAL(10, 8),
    coordenadas_lng DECIMAL(11, 8),
    calificacion_promedio DECIMAL(3, 2) DEFAULT 0,
    total_calificaciones INT DEFAULT 0,
    estado ENUM('disponible', 'mantenimiento', 'inactiva') DEFAULT 'disponible',
    esta_activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Horarios disponibles de canchas (recurrentes)
CREATE TABLE horarios_cancha (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cancha_id INT NOT NULL,
    dia_semana ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo') NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    esta_disponible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (cancha_id) REFERENCES canchas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_horario (cancha_id, dia_semana, hora_inicio)
);