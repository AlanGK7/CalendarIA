import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import { Response } from './geminis.js'; // Asegúrate de que la ruta sea correcta
import { encrypt, decrypt } from './cripto.js'; // Asegúrate de que la ruta sea correcta
import { v4 as uuidv4 } from 'uuid';
import { saveTokenToDB, getTokenFromDB  } from './mongo.js';
// Obtener __dirname (no existe por defecto en ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ámbitos (scopes) y rutas
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

function cleanJson(respuesta) {
  return respuesta
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}


/**
 * Lee credenciales previamente guardadas desde token.json.
 */
// Carga token.json y lo desencripta
async function loadSavedCredentialsIfExist(uuid) {
  const tokenPayload = await getTokenFromDB(uuid);
  if (!tokenPayload) return null;
  const credentials = JSON.parse(tokenPayload);
  return google.auth.fromJSON(credentials);
}


// Guarda y cifra el token.json
async function saveCredentials(client, uuid) {
  const tokenPayload = JSON.stringify({
    type: 'authorized_user',
    client_id: process.env.client_id,
    client_secret: process.env.client_secret,
    refresh_token: client.credentials.refresh_token,
  });

  await saveTokenToDB(uuid, tokenPayload);
}


// Autoriza: si no hay token, lanza login en navegador
async function authorize(uuid) {
  let client = await loadSavedCredentialsIfExist(uuid);
  if (client) {
    console.log("Token encontrado en DB, reutilizando.");
    return client;  // <-- SI YA TIENE TOKEN, LO REUTILIZAS
  }

  console.log("Token no encontrado, iniciando flujo de login.");
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
    access_type: 'offline',
    prompt: 'consent'
   });

  if (client.credentials) {
    await saveCredentials(client, uuid);
  }

  return client;
}


async function Calendar(message, uuid) {
  const respuesta = await Response(message);
  const txt = cleanJson(respuesta);

  let json;
  try {
    json = JSON.parse(txt);
  } catch (e) {
    console.error("Respuesta no es JSON válido:", txt);
    return "No pude entender tu mensaje.";
  }
  console.log("JSON interpretado:", json);

  const { accion, evento, rango } = json; 
  console.log("Acción:", accion);

  if (accion === "crear") {
    const event = {
      summary: evento.titulo,
      description: evento.descripcion || '',
      start: {
        dateTime: evento.inicio,
        timeZone: 'America/Santiago',
      },
      end: {
        dateTime: evento.fin,
        timeZone: 'America/Santiago',
      }
    };
    try {
    const auth = await authorize(uuid); // ← Obtenemos credenciales autenticadas
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

      console.log("Evento insertado:", response.data);
      return "Evento creado con éxito.";
    } catch (err) {
      console.error("Error al insertar el evento:", err);
      return "Ocurrió un error al crear el evento.";
    }


  }

  if (accion === "consultar") {
    // Consulta eventos para la fecha indicada
    const auth = await authorize(uuid);
    const calendar = google.calendar({ version: 'v3', auth });
    
    const startDateTime = rango?.inicio || new Date().toISOString();
    const endDateTime = rango?.fin || new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();


    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDateTime,
      timeMax: endDateTime,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = res.data.items;

    if (!events || events.length === 0) {
     console.log('No hay eventos para esa fecha.');
     return "No hay eventos para esa fecha.";
    }

    const results = events.map(event => {
      const start = event.start.dateTime || event.start.date;
      return `📌 ${event.summary} a las ${start}`
      }).join("\n");
    

    return `Eventos encontrados:\n${results}`;
  }
  

  return "Acción no reconocida.";
}


export { authorize, Calendar };
