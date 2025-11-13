// src/routes/horariosRoutes.js
import express from 'express';

import { 
    getCanchaHorarios,
    createHorario,  
    updateHorario,  
    deleteHorario
} from '../controllers/horariosController.js'; 

const router = express.Router();


// Ruta para obtener horarios de disponibilidad
router.get('/canchas/horarios/:canchaId', getCanchaHorarios);

// Crear un nuevo horario recurrente
router.post('/canchas/horarios', createHorario); 

// Actualizar un horario recurrente por su ID
router.put('/canchas/horarios/:horarioId', updateHorario); 

// Eliminar un horario recurrente por su ID
router.delete('/canchas/horarios/:horarioId', deleteHorario);

export default router;