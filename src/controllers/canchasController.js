// src/controllers/canchasController.js
import pool from '../config/db.js';

/**
 * POST /api/canchas: Crea una nueva cancha deportiva.
 */
export const createCancha = async (req, res) => {
    // Nota: 'empresa_id' es crucial para asociar la cancha a un propietario/empresa.
    const { 
        empresa_id, tipo_deporte_id, nombre, descripcion, superficie, 
        esta_techada, capacidad_jugadores, largo_metros, ancho_metros, 
        precio_hora, precio_hora_fin_semana, ubicacion 
    } = req.body;
    
    // Validación básica de campos requeridos
    if (!empresa_id || !nombre || !precio_hora) {
        return res.status(400).json({ message: 'Missing required fields: empresa_id, nombre, and precio_hora.' });
    }

    try {
        const sql = `
            INSERT INTO canchas (
                empresa_id, tipo_deporte_id, nombre, descripcion, superficie, 
                esta_techada, capacidad_jugadores, largo_metros, ancho_metros, 
                precio_hora, precio_hora_fin_semana, ubicacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            empresa_id, tipo_deporte_id, nombre, descripcion, superficie || 'cesped_sintetico', 
            esta_techada || false, capacidad_jugadores, largo_metros, ancho_metros, 
            precio_hora, precio_hora_fin_semana, ubicacion
        ];
        
        const [result] = await pool.query(sql, values);
        const newCanchaId = result.insertId;

        res.status(201).json({ 
            message: 'Cancha created successfully.', 
            canchaId: newCanchaId,
            empresaId: empresa_id 
        });

    } catch (error) {
        console.error('Error creating cancha:', error);
        // ER_NO_REFERENCED_ROW_2: Si empresa_id no existe en la tabla empresas
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(409).json({ message: 'Foreign Key Constraint Failed: The provided empresa_id does not exist.' });
        }
        res.status(500).json({ message: 'Internal server error creating the cancha.' });
    }
};

/**
 * GET /api/canchas/:canchaId/propietario: Endpoint para que otros microservicios obtengan el ID del propietario/empresa.
 */
export const getCanchaPropietario = async (req, res) => {
    const { canchaId } = req.params;
    
    try {
        const [rows] = await pool.query('SELECT empresa_id FROM canchas WHERE id = ?', [canchaId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Cancha not found.' });
        }
        
        const empresaId = rows[0].empresa_id;
        
        if (!empresaId) {
            return res.status(404).json({ message: 'Cancha found, but no empresa_id associated.' });
        }
        
        // 🚨 Simulación de obtener el ID de usuario del propietario
        // En un microservicio real, aquí se haría una llamada a la API de Usuarios/Empresas
        // para buscar el ID de usuario asociado a esta empresaId.
        
        // Mockeamos el usuario_propietario_id para la EmpresaId:
        const usuarioPropietarioId = 100; 

        // El servicio de Reservas SOLO necesita el ID del usuario procesador (100)
        res.status(200).json({ 
            cancha_id: parseInt(canchaId),
            empresa_id: empresaId,
            usuario_propietario_id: usuarioPropietarioId // Este es el ID que usará Reservas
        });

    } catch (error) {
        console.error('Error fetching cancha owner:', error);
        res.status(500).json({ message: 'Internal server error fetching cancha owner data.' });
    }
};

// --- FUNCIONES DE HORARIOS_CANCHA (CRUD) ---

/**
 * POST /api/canchas/horarios: Crea un nuevo horario recurrente para una cancha.
 */
export const createHorario = async (req, res) => {
    //  Se incluye 'esta_disponible' en la desestructuración. 
    // Si no se proporciona en el body, usa TRUE por defecto, según la tabla.
    const { 
        cancha_id, 
        dia_semana, 
        hora_inicio, 
        hora_fin, 
        esta_disponible = true // - Captura el valor o usa 'true' por defecto -
    } = req.body;

    if (!cancha_id || !dia_semana || !hora_inicio || !hora_fin) {
        return res.status(400).json({ message: 'Missing required fields for schedule creation.' });
    }

    try {
        const sql = `
            INSERT INTO horarios_cancha (cancha_id, dia_semana, hora_inicio, hora_fin, esta_disponible)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [cancha_id, dia_semana, hora_inicio, hora_fin, esta_disponible]; 
        
        const [result] = await pool.query(sql, values);
        res.status(201).json({ 
            message: 'Schedule slot created successfully.', 
            horarioId: result.insertId,
            disponible: esta_disponible
        });

    } catch (error) {
        console.error('Error creating horario:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A schedule entry already exists for this court, day, and start time.' });
        }
        res.status(500).json({ message: 'Internal server error creating the schedule.' });
    }
};

/**
 * PUT /api/canchas/horarios/:horarioId: Actualiza un horario existente.
 */
export const updateHorario = async (req, res) => {
    const { horarioId } = req.params;
    const { dia_semana, hora_inicio, hora_fin, esta_disponible } = req.body;
    
    // Al menos un campo debe ser proporcionado
    if (!dia_semana && !hora_inicio && !hora_fin && esta_disponible === undefined) {
        return res.status(400).json({ message: 'No fields provided for update.' });
    }

    try {
        let updates = [];
        let values = [];

        if (dia_semana) { updates.push('dia_semana = ?'); values.push(dia_semana); }
        if (hora_inicio) { updates.push('hora_inicio = ?'); values.push(hora_inicio); }
        if (hora_fin) { updates.push('hora_fin = ?'); values.push(hora_fin); }
        // Uso estricto de booleano (esta_disponible puede ser false)
        if (esta_disponible !== undefined) { updates.push('esta_disponible = ?'); values.push(esta_disponible); }

        values.push(horarioId); // Añade el ID al final

        const sql = `
            UPDATE horarios_cancha 
            SET ${updates.join(', ')} 
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Horario not found or no changes made.' });
        }
        
        res.status(200).json({ message: 'Schedule updated successfully.' });

    } catch (error) {
        console.error('Error updating horario:', error);
        res.status(500).json({ message: 'Internal server error updating the schedule.' });
    }
};

/**
 * DELETE /api/canchas/horarios/:horarioId: Elimina un horario existente.
 */
export const deleteHorario = async (req, res) => {
    const { horarioId } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM horarios_cancha WHERE id = ?', [horarioId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Horario not found.' });
        }

        res.status(200).json({ message: 'Schedule deleted successfully.' });

    } catch (error) {
        console.error('Error deleting horario:', error);
        res.status(500).json({ message: 'Internal server error deleting the schedule.' });
    }
};

/**
 * GET /api/canchas/:canchaId/horarios: Obtiene los horarios recurrentes de una cancha.
 */
export const getCanchaHorarios = async (req, res) => {
    const { canchaId } = req.params;
    try {
        const [rows] = await pool.query('SELECT dia_semana, hora_inicio, hora_fin FROM horarios_cancha WHERE cancha_id = ? AND esta_disponible = TRUE', [canchaId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener horarios:', error);
        res.status(500).json({ message: 'Internal server error fetching cancha schedules.' });
    }
};

