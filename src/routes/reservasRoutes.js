// routes/reservasRoutes.js
import express from 'express';
import { createSolicitud, getAllReservas, processSolicitud } from '../controllers/reservasController.js';
const router = express.Router();

// Cliente: Inicia el flujo, crea la solicitud
router.post('/reservas', createSolicitud); 

// Administrador/Dev: Obtener todas las reservas
router.get('/reservas', getAllReservas);

router.put('/solicitudes/:solicitudId/process', processSolicitud);


export default router;