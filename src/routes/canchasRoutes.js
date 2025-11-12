// src/routes/canchasRoutes.js
import express from 'express';
import { 
    createCancha, 
    getCanchaPropietario, 
    getCanchaById,
    getAllCanchas,        
    updateCancha,         
    disableCancha,
    enableCancha,
    getCanchaHorarios,
    createHorario,  
    updateHorario,  
    deleteHorario
} from '../controllers/canchasController.js'; 
import multer from 'multer';


const upload = multer(); 

const router = express.Router();

// Ver todas las canchas activas (GET)
router.get('/canchas', getAllCanchas); 

// Ruta para crear una cancha
router.post('/canchas', upload.single('imagen'), createCancha);

// Editar una cancha específica (PUT)
router.put('/canchas/:canchaId', upload.single('imagen'), updateCancha);

// Deshabilitar una cancha (PUT)
router.put('/canchas/:canchaId/deshabilitar', disableCancha); 

router.put('/canchas/:canchaId/habilitar', enableCancha);

// Ruta para obtener información de propietario (para el microservicio de Reservas)
router.get('/empresa/:canchaId', getCanchaPropietario); 

// Obtener una cancha específica por ID, incluyendo la imagen BLOB
router.get('/canchas/:canchaId', upload.single('imagen'), getCanchaById);







// Ruta para obtener horarios de disponibilidad
router.get('/canchas/horarios/:canchaId', getCanchaHorarios);

// Crear un nuevo horario recurrente
router.post('/canchas/horarios', createHorario); 

// Actualizar un horario recurrente por su ID
router.put('/canchas/horarios/:horarioId', updateHorario); 

// Eliminar un horario recurrente por su ID
router.delete('/canchas/horarios/:horarioId', deleteHorario);

export default router;