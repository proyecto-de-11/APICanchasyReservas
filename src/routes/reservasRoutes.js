// routes/reservasRoutes.js
import express from 'express';
import { getAllReservas, createReserva } from '../controllers/reservasController.js';

const router = express.Router();

router.get('/', getAllReservas);
router.post('/', createReserva);
// ...

export default router;