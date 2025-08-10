
import express from 'express';
import dotenv from 'dotenv';
import {authorize, Calendar} from './GoogleCalendar.js';
import {engine} from 'express-handlebars';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { google } from 'googleapis';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

function generarUUID() {
  return uuidv4();
}



app.post('/send', async (req, res) => {
  let uuid = req.cookies.uuid;  // ← Buscamos la UUID en las cookies
  const userMessage = req.body.message;

  // Si no hay UUID, generamos una y la guardamos como cookie
  if (!uuid) {
    uuid = generarUUID();
    res.cookie('uuid', uuid, { httpOnly: true, sameSite: 'Strict', secure: false }); // Secure en false si estás en localhost
    console.log(`UUID creada y almacenada en cookie: ${uuid}`);
    
  }

  if (!userMessage) {
    return res.status(400).json({ error: 'Mensaje no proporcionado' });
  }

  try {
    const response = await Calendar(userMessage, uuid);  // Envías la UUID a Calendar
    res.json({ response });
  } catch (error) {
    console.error('Error en /send:', error);
    res.status(500).json({ error: 'Error al obtener respuesta de la IA' });
  }
});




app.get('/', async (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
  });
  res.redirect(url);
});


app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('No se proporcionó código de autorización');
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Guarda los tokens en token.json
    await fs.writeFile('token.json', JSON.stringify(tokens, null, 2));

    // Redirige a la página principal
    res.redirect('/');
  } catch (err) {
    console.error('Error intercambiando el código:', err);
    res.status(500).send('Error durante autenticación');
  }
});



app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});



