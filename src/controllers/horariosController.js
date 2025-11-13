// src/controllers/horariosController.js
import pool from '../config/db.js';

/**
 * Crea un nuevo horario recurrente para una cancha.
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
 * Actualiza un horario existente.
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
 * Elimina un horario existente.
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
 * Obtiene los horarios recurrentes de una cancha.
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

