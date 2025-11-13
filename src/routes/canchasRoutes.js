// src/routes/canchasRoutes.js
import express from 'express';
import { 
    createCancha, 
    getCanchaPropietario, 
    getCanchaById,
    getAllCanchas,        
    updateCancha,         
    disableCancha,
    enableCancha
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

export default router;