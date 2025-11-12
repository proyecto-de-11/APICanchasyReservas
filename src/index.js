import express from 'express';
import './config/db.js';
import bodyParser from 'body-parser';
import cors from 'cors';
import reservasRoutes from './routes/reservasRoutes.js';
import canchasRoutes from './routes/canchasRoutes.js';
import multer from 'multer'; // Importar Multer

const app = express();
const upload = multer(); // Inicializar Multer sin destino de guardado por defecto (lo gestionamos después)

// Configuración de Middlewares
// Express para JSON (generalmente usado, pero NO para multipart)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors()); 

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

app.use('/api', reservasRoutes);
app.use('/api', canchasRoutes);


const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en: http://localhost:${port}`);
});