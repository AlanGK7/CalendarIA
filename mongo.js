import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI; 
const client = new MongoClient(uri);

const dbName = 'cluster0'; 
const collectionName = 'tokens'; 

export async function saveTokenToDB(uuid, tokenPayload) {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    await collection.updateOne(
      { uuid }, 
      { $set: { token: tokenPayload } }, 
      { upsert: true } 
    );

    console.log(`Token guardado para UUID: ${uuid}`);
  } catch (error) {
    console.error('Error al guardar el token en la DB:', error);
  } finally {
    await client.close();
  }
}

export async function getTokenFromDB(uuid) {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const result = await collection.findOne({ uuid });
    return result ? result.token : null;
  } catch (error) {
    console.error('Error al obtener token desde DB:', error);
    return null;
  } finally {
    await client.close();
  }
}