// src/controllers/canchasController.js
import pool from '../config/db.js';


/**
 * Crea una nueva cancha deportiva.
 */
export const createCancha = async (req, res) => {
    // Nota: 'empresa_id' es crucial para asociar la cancha a un propietario/empresa.
    const { 
        empresa_id, tipo_deporte_id, nombre, descripcion, superficie, 
        esta_techada, capacidad_jugadores, largo_metros, ancho_metros, 
        precio_hora, precio_hora_fin_semana, ubicacion, 
        servicios_adicionales, coordenadas_lat, coordenadas_lng
    } = req.body;

    //  OBTENER DATOS BINARIOS (BLOB) DESDE req.file
    // El 'req.file' contiene metadata y el buffer binario del archivo.
    // Usamos 'req.file.buffer' para el campo BLOB de MySQL.
    const imagenData = req.file ? req.file.buffer : null;
    
    // Validación básica de campos requeridos
    if (!empresa_id || !nombre || !precio_hora) {
        return res.status(400).json({ message: 'Missing required fields: empresa_id, nombre, and precio_hora.' });
    }

    try {
        const sql = `
            INSERT INTO canchas (
                empresa_id, tipo_deporte_id, nombre, descripcion, superficie, 
                esta_techada, capacidad_jugadores, largo_metros, ancho_metros, 
                precio_hora, precio_hora_fin_semana, imagenes, servicios_adicionales, 
                ubicacion, coordenadas_lat, coordenadas_lng
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            empresa_id, 
            tipo_deporte_id, 
            nombre, 
            descripcion, 
            superficie || 'cesped_sintetico', 
            esta_techada || false, 
            capacidad_jugadores, 
            largo_metros, 
            ancho_metros, 
            precio_hora, 
            precio_hora_fin_semana, 
            imagenData || null, // Para BLOB, si no se envía, usa null
            servicios_adicionales ? JSON.stringify(servicios_adicionales) : null, // JSON debe ser serializado
            ubicacion,
            coordenadas_lat,
            coordenadas_lng
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
 * Endpoint para que otros microservicios obtengan el ID del propietario/empresa.
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
        
        // Simulación de obtener el ID de usuario del propietario
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

/**
 * GET Obtiene una cancha específica, incluyendo la imagen BLOB.
 */
export const getCanchaById = async (req, res) => {
    const { canchaId } = req.params;
    try {
        // Seleccionamos TODOS los campos, incluyendo 'imagenes'
        const [rows] = await pool.query('SELECT * FROM canchas WHERE id = ?', [canchaId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Cancha not found.' });
        }
        
        const cancha = rows[0];

        // Convertimos el Buffer BLOB a un string Base64 para enviarlo al cliente
        if (cancha.imagenes) {
            cancha.imagenes = Buffer.from(cancha.imagenes).toString('base64');
        }
        
        res.status(200).json(cancha);
    } catch (error) {
        console.error('Error fetching cancha by ID:', error);
        res.status(500).json({ message: 'Internal server error fetching cancha data.' });
    }
};

/**
 * GET  Obtiene un listado de todas las canchas activas.
 */
export const getAllCanchas = async (req, res) => {
    try {
        const sql = `
            SELECT id, empresa_id, nombre, superficie, esta_techada, capacidad_jugadores, 
            precio_hora, ubicacion, calificacion_promedio, estado, esta_activa
            FROM canchas
            WHERE esta_activa = TRUE AND estado != 'inactiva'
            ORDER BY calificacion_promedio DESC, nombre ASC
        `;
        const [rows] = await pool.query(sql);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching all canchas:', error);
        res.status(500).json({ message: 'Internal server error fetching canchas list.' });
    }
};

/**
 * PUT Edita los detalles de una cancha.
 * Permite la actualización de la imagen (BLOB) si se envía un nuevo archivo
 * O permite borrarla si se envía 'imagenes: null' en el body JSON.
 */
export const updateCancha = async (req, res) => {
    const { canchaId } = req.params;
    const { 
        nombre, descripcion, superficie, esta_techada, capacidad_jugadores, 
        precio_hora, precio_hora_fin_semana, ubicacion, servicios_adicionales, 
        coordenadas_lat, coordenadas_lng, estado, esta_activa, 
        imagenes
    } = req.body;
    
    // Obtener el buffer si se usa Multer (multipart/form-data)
    const nuevaImagenData = req.file ? req.file.buffer : undefined; 
    
    try {
        let updates = [];
        let values = [];

        // ... (Lógica para otros campos, incluyendo JSON.stringify(servicios_adicionales)) ...
        if (nombre !== undefined) { updates.push('nombre = ?'); values.push(nombre); }
        if (descripcion !== undefined) { updates.push('descripcion = ?'); values.push(descripcion); }
        if (superficie !== undefined) { updates.push('superficie = ?'); values.push(superficie); }
        if (esta_techada !== undefined) { updates.push('esta_techada = ?'); values.push(esta_techada); }
        if (capacidad_jugadores !== undefined) { updates.push('capacidad_jugadores = ?'); values.push(capacidad_jugadores); }
        if (precio_hora !== undefined) { updates.push('precio_hora = ?'); values.push(precio_hora); }
        if (precio_hora_fin_semana !== undefined) { updates.push('precio_hora_fin_semana = ?'); values.push(precio_hora_fin_semana); }
        if (ubicacion !== undefined) { updates.push('ubicacion = ?'); values.push(ubicacion); }
        if (estado !== undefined) { updates.push('estado = ?'); values.push(estado); }
        if (esta_activa !== undefined) { updates.push('esta_activa = ?'); values.push(esta_activa); }
        if (coordenadas_lat !== undefined) { updates.push('coordenadas_lat = ?'); values.push(coordenadas_lat); }
        if (coordenadas_lng !== undefined) { updates.push('coordenadas_lng = ?'); values.push(coordenadas_lng); }
        
        // Manejo del campo JSON: servicios_adicionales
        if (servicios_adicionales !== undefined) { 
            updates.push('servicios_adicionales = ?'); 
            values.push(JSON.stringify(servicios_adicionales)); 
        }

        //  Manejo del campo BLOB: imagenes 
        if (nuevaImagenData !== undefined) {
            //  Se subió un nuevo archivo (multipart/form-data)
            updates.push('imagenes = ?');
            values.push(nuevaImagenData);
        } else if (imagenes === null) {
            //  El cliente envió el JSON { "imagenes": null } para borrar la imagen
            updates.push('imagenes = ?');
            values.push(null);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields provided for update.' });
        }

        values.push(canchaId); 

        const sql = `
            UPDATE canchas 
            SET ${updates.join(', ')} 
            WHERE id = ?
        `;

        const [result] = await pool.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cancha not found or no changes made.' });
        }
        
        res.status(200).json({ message: 'Cancha updated successfully.', canchaId: canchaId });

    } catch (error) {
        console.error('Error updating cancha:', error);
        res.status(500).json({ message: 'Internal server error updating the cancha.' });
    }
};

/**
 * PUT  Deshabilita (desactiva) una cancha.
 */
export const disableCancha = async (req, res) => {
    const { canchaId } = req.params;
    
    try {
        // Ponemos esta_activa en FALSE e indicamos que el estado es 'inactiva'
        const sql = `
            UPDATE canchas 
            SET esta_activa = FALSE, estado = 'inactiva' 
            WHERE id = ?
        `;
        const [result] = await pool.query(sql, [canchaId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cancha not found.' });
        }
        
        res.status(200).json({ 
            message: `Cancha ${canchaId} has been successfully disabled.`, 
            estado: 'inactiva' 
        });

    } catch (error) {
        console.error('Error disabling cancha:', error);
        res.status(500).json({ message: 'Internal server error disabling the cancha.' });
    }
};

/**
 * PUT Habilita (activa) una cancha.
 */
export const enableCancha = async (req, res) => {
    const { canchaId } = req.params;
    
    try {
        const sql = `
            UPDATE canchas 
            SET esta_activa = TRUE, estado = 'disponible' 
            WHERE id = ?
        `;
        const [result] = await pool.query(sql, [canchaId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cancha not found.' });
        }
        
        res.status(200).json({ 
            message: `Cancha ${canchaId} has been successfully enabled.`, 
            estado: 'disponible' 
        });

    } catch (error) {
        console.error('Error enabling cancha:', error);
        res.status(500).json({ message: 'Internal server error enabling the cancha.' });
    }
};
