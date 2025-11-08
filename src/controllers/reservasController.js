// controllers/reservasController.js
import pool from '../config/db.js';

/**
 * Función auxiliar para verificar la disponibilidad de la cancha.
 */
const checkDisponibilidad = async (canchaId, fechaReserva, horaInicio, horaFin) => {
    const sql = `
        SELECT id
        FROM reservas
        WHERE cancha_id = ?
        AND fecha_reserva = ?
        AND estado IN ('pendiente', 'confirmada')
        -- Conflicto si los rangos se solapan:
        AND NOT (? >= hora_fin OR ? <= hora_inicio)
    `;
    // Nota: El orden de los parámetros es crucial: [canchaId, fechaReserva, horaFin, horaInicio]
    const values = [canchaId, fechaReserva, horaFin, horaInicio];

    const [rows] = await pool.query(sql, values);
    // Retorna True si NO hay conflictos (disponible)
    return rows.length === 0; 
};

/**
 * Obtener todas las reservas.
 */
export const getAllReservas = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reservas');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener reservas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};


/**
 * Crear una nueva reserva, incluyendo verificación de disponibilidad.
 */
export const createReserva = async (req, res) => {
    const data = req.body;
    
    // VALIDACIÓN
    const { cancha_id, usuario_solicitante_id, fecha_reserva, hora_inicio, hora_fin, duracion_horas, monto_total } = data;

    if (!cancha_id || !usuario_solicitante_id || !fecha_reserva || !hora_inicio || !hora_fin || !monto_total || !duracion_horas) {
        return res.status(400).json({ message: 'Faltan campos obligatorios para la reserva.' });
    }
    
    let connection; // Usaremos una transacción para mayor seguridad 
    try {
        // VERIFICACIÓN DE DISPONIBILIDAD (Lógica de Negocio)
        const disponible = await checkDisponibilidad(cancha_id, fecha_reserva, hora_inicio, hora_fin);
        
        if (!disponible) {
            return res.status(409).json({ message: 'La cancha ya está reservada o hay un conflicto de horario.' }); // 409 Conflict
        }

        // INSERCIÓN DE LA RESERVA (Lógica de DB)
        const insertSql = `
            INSERT INTO reservas (cancha_id, equipo_id, usuario_solicitante_id, fecha_reserva, hora_inicio, hora_fin, duracion_horas, monto_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertValues = [
            cancha_id, data.equipo_id, usuario_solicitante_id, fecha_reserva, 
            hora_inicio, hora_fin, duracion_horas, monto_total
        ];

        connection = await pool.getConnection(); // Obtener una conexión para la transacción
        await connection.beginTransaction(); // Iniciar la transacción
        
        const [result] = await connection.query(insertSql, insertValues);
        
               
        await connection.commit(); // Confirmar la transacción
        
        const newReserva = { id: result.insertId, ...data, estado: 'pendiente' };
        res.status(201).json({ 
            message: 'Reserva creada exitosamente y disponibilidad verificada.', 
            reserva: newReserva
        });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // Deshacer si algo falla
        }
        console.error('Error al crear la reserva:', error);
        res.status(500).json({ message: 'Error interno del servidor al procesar la reserva' });
    } finally {
        if (connection) {
            connection.release(); // Liberar la conexión al pool
        }
    }
};
