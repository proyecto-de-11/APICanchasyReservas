// controllers/reservasController.js
import pool from '../config/db.js';

/**
 * Verifica si hay conflicto de horario para una cancha específica.
 */
const checkDisponibilidad = async (canchaId, fechaReserva, horaInicio, horaFin, reservaIdToExclude = null) => {
    let sql = `
        SELECT id
        FROM reservas
        WHERE cancha_id = ?
        AND fecha_reserva = ?
        AND estado IN ('pendiente', 'confirmada')
        -- Conflicto si los rangos se solapan: (A_end > B_start AND A_start < B_end)
        AND NOT (? >= hora_fin OR ? <= hora_inicio)
    `;
    const values = [canchaId, fechaReserva, horaFin, horaInicio];

    if (reservaIdToExclude) {
        sql += ` AND id != ?`;
        values.push(reservaIdToExclude);
    }

    try {
        const [rows] = await pool.query(sql, values);
        return rows.length === 0; // True si está disponible
    } catch (error) {
        console.error("Error checking availability:", error);
        return false; 
    }
};

// --- ENDPOINTS PARA EL CLIENTE (jugador) ---
/**
 * POST /api/reservas: Crea una Solicitud de Reserva (Inicializa el flujo de aprobación).
 */
export const createSolicitud = async (req, res) => {
    const { cancha_id, equipo_id, usuario_solicitante_id, fecha_reserva, hora_inicio, hora_fin, duracion_horas, monto_total, mensaje_solicitud } = req.body;
    
    if (!cancha_id || !usuario_solicitante_id || !fecha_reserva || !hora_inicio || !hora_fin || !monto_total || !duracion_horas) {
        return res.status(400).json({ message: 'Missing required fields for reservation request.' });
    }
    
    let connection; 
    try {
        connection = await pool.getConnection(); 
        await connection.beginTransaction(); 
        
        let usuario_acepto_rechazo_id;
        
       //  BYPASS TEMPORAL DE MOCKING PARA PRUEBAS 
        // Únicamente asignamos el ID fijo y OMITIMOS la consulta a la base de datos.
        console.log(" Usando ID de Propietario Mock (100) para evitar error de tabla faltante.");
        usuario_acepto_rechazo_id = 100; 
        
        
        /* 
        //  LÓGICA  DESCOMENTAR ESTE BLOQUE CUANDO LA TABLA 'canchas' ESTE DISPONIBLE.
        const [ownerData] = await connection.query(`
            SELECT e.usuario_id 
            FROM canchas c 
            JOIN empresas e ON c.empresa_id = e.id 
            WHERE c.id = ?
        `, [cancha_id]);

        if (ownerData.length === 0 || !ownerData[0].usuario_id) {
            await connection.rollback();
            return res.status(404).json({ message: 'Cancha not found or the associated Company User ID (empresas.usuario_id) is missing.' });
        }
        
        usuario_acepto_rechazo_id = ownerData[0].usuario_id;
        */
        
        // 2. Insertar en la tabla reservas con estado 'pendiente' (Reserva "placeholder")
        const insertReservaSql = `
            INSERT INTO reservas (cancha_id, equipo_id, usuario_solicitante_id, fecha_reserva, hora_inicio, hora_fin, duracion_horas, monto_total, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
        `;
        const insertReservaValues = [
            cancha_id, equipo_id, usuario_solicitante_id, fecha_reserva, 
            hora_inicio, hora_fin, duracion_horas, monto_total
        ];
        
        const [reservaResult] = await connection.query(insertReservaSql, insertReservaValues);
        const newReservaId = reservaResult.insertId;

        // 3. Insertar la Solicitud de Reserva
        const insertSolicitudSql = `
            INSERT INTO solicitudes_reserva (reserva_id, cancha_id, usuario_solicitante_id, usuario_acepto_rechazo_id, mensaje_solicitud)
            VALUES (?, ?, ?, ?, ?)
        `;
        const insertSolicitudValues = [
            newReservaId, cancha_id, usuario_solicitante_id, usuario_acepto_rechazo_id, mensaje_solicitud || 'Solicitud sin mensaje.'
        ];
        
        const [solicitudResult] = await connection.query(insertSolicitudSql, insertSolicitudValues);
        
        await connection.commit(); 
        
        res.status(201).json({ 
            message: 'Reservation request created successfully. Waiting for owner approval.', 
            reservaId: newReservaId,
            solicitudId: solicitudResult.insertId,
            estado: 'pendiente'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback(); 
        }
        // Este catch fallará solo si 'reservas' o 'solicitudes_reserva' NO existen.
        console.error('Error creating reservation request:', error);
        res.status(500).json({ message: 'Internal server error processing reservation request. Ensure core tables (reservas, solicitudes_reserva) exist.' });
    } finally {
        if (connection) {
            connection.release(); 
        }
    }
};

/**
 * GET /api/reservas: Obtener todas las reservas (admin/dev)
 */
export const getAllReservas = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reservas ORDER BY fecha_creacion DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener reservas:', error);
        res.status(500).json({ message: 'Internal server error fetching reservations.' });
    }
};

/**
 * PUT /api/propietario/solicitudes/:solicitudId/process: Función para procesar una solicitud: Aceptar o Rechazar.
 */
export const processSolicitud = async (req, res) => {
    const { solicitudId } = req.params;
    const { accion, usuario_procesador_id, motivo_rechazo } = req.body; 
    
    if (!accion || !usuario_procesador_id || (accion === 'rechazar' && !motivo_rechazo)) {
        return res.status(400).json({ message: 'Missing required fields for processing the request.' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Obtener la solicitud pendiente y su reserva asociada
        const [solicitud] = await connection.query("SELECT * FROM solicitudes_reserva WHERE id = ? AND estado = 'pendiente'", [solicitudId]);

        if (solicitud.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Solicitud not found or already processed.' });
        }
        
        const data = solicitud[0];
        const reservaId = data.reserva_id;
        const now = new Date();
        let newReservaEstado;

        // 2. Verificar que el usuario_procesador_id sea el dueño/responsable
        if (data.usuario_acepto_rechazo_id !== parseInt(usuario_procesador_id)) {
             await connection.rollback();
             return res.status(403).json({ message: 'Forbidden: You are not authorized to process this request.' });
        }

        if (accion === 'rechazar') {
            // A. RECHAZAR SOLICITUD
            newReservaEstado = 'cancelada';

            // 3. Actualizar Solicitud
            const updateSolicitudSql = `
                UPDATE solicitudes_reserva 
                SET estado = 'rechazada', usuario_acepto_rechazo_id = ?, motivo_rechazo = ?, fecha_respuesta = ?
                WHERE id = ?
            `;
            await connection.query(updateSolicitudSql, [usuario_procesador_id, motivo_rechazo, now, solicitudId]);
            
            // 4. Actualizar Reserva Placeholder
            await connection.query('UPDATE reservas SET estado = ? WHERE id = ?', [newReservaEstado, reservaId]);
            
            await connection.commit();
            return res.status(200).json({ message: 'Solicitud rejected successfully.', estado: 'rechazada' });

        } else if (accion === 'aprobar') {
            // B. APROBAR SOLICITUD
            newReservaEstado = 'confirmada';
            
            // 3. Obtener datos de la reserva para verificación de disponibilidad
            const [reservaData] = await connection.query('SELECT cancha_id, fecha_reserva, hora_inicio, hora_fin FROM reservas WHERE id = ?', [reservaId]);

            if (reservaData.length === 0) {
                 await connection.rollback();
                 return res.status(404).json({ message: 'Associated reservation not found.' });
            }
            
            const rData = reservaData[0];

            // 4. Verificar Disponibilidad FINAL (CRÍTICO)
            const disponible = await checkDisponibilidad(rData.cancha_id, rData.fecha_reserva, rData.hora_inicio, rData.hora_fin, reservaId); 

            if (!disponible) {
                // Si ya no está disponible, la rechazamos automáticamente y cancelamos la reserva.
                await connection.query('UPDATE solicitudes_reserva SET estado = "rechazada", motivo_rechazo = "Horario ocupado al momento de la aprobación." WHERE id = ?', [solicitudId]);
                await connection.query("UPDATE reservas SET estado = 'cancelada' WHERE id = ?", [reservaId]);
                await connection.commit();
                return res.status(409).json({ message: 'Cannot approve: time slot is now occupied.' });
            }

            // 5. Actualizar Solicitud a 'aprobada'
            const updateSolicitudSql = `
                UPDATE solicitudes_reserva 
                SET estado = 'aprobada', fecha_respuesta = ?
                WHERE id = ?
            `;
            await connection.query(updateSolicitudSql, [now, solicitudId]);

            // 6. Actualizar Reserva Placeholder a 'confirmada'
            await connection.query('UPDATE reservas SET estado = ? WHERE id = ?', [newReservaEstado, reservaId]);
            
            await connection.commit();
            return res.status(200).json({ 
                message: 'Solicitud approved and Reservation confirmed successfully.', 
                reservaId: reservaId,
                estado: 'confirmada'
            });
        }
        
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Internal server error during request processing.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

