// src/routes/canchasRoutes.js
import express from 'express';
import { 
    createCancha, 
    getCanchaPropietario, 
    getCanchaHorarios,
    createHorario,  
    updateHorario,  
    deleteHorario
} from '../controllers/canchasController.js'; 

const router = express.Router();

// Ruta para crear una cancha
router.post('/canchas', createCancha); 

// Ruta para obtener información de propietario (para el microservicio de Reservas)
router.get('/canchas/:canchaId/', getCanchaPropietario);  

// Ruta para obtener horarios de disponibilidad
router.get('/canchas/horarios/:canchaId', getCanchaHorarios);

// Crear un nuevo horario recurrente
router.post('/canchas/horarios', createHorario); 

// Actualizar un horario recurrente por su ID
router.put('/canchas/horarios/:horarioId', updateHorario); 

// Eliminar un horario recurrente por su ID
router.delete('/canchas/horarios/:horarioId', deleteHorario);

export default router;