import express from 'express';
import './config/db.js';
import bodyParser from 'body-parser';
import cors from 'cors';
import reservasRoutes from './routes/reservasRoutes.js';
const app = express();


app.use(cors()); 

app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true })); 

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

app.use('/api', reservasRoutes);

const port = parseInt(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en: http://localhost:${port}`);
});