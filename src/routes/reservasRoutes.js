// routes/reservasRoutes.js
import express from 'express';
import { createSolicitud, getAllReservas, processSolicitud, deleteReserva, deleteSolicitud, getReservaById } from '../controllers/reservasController.js';
const router = express.Router();

// Cliente: Inicia el flujo, crea la solicitud
router.post('/reservas', createSolicitud); 

// Administrador/Dev: Obtener todas las reservas
router.get('/reservas', getAllReservas);

// Cliente: Obtener una reserva por ID
router.get('/reservas/:reservaId', getReservaById);

// Administrador/Dev: Procesar una solicitud

router.put('/solicitudes/:solicitudId/process', processSolicitud);

router.delete('/solicitudes/:solicitudId', deleteSolicitud);

router.delete('/reservas/:reservaId', deleteReserva);


export default router;