import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  if (!db) {
    try {
      await client.connect();
      console.log('Connected to MongoDB');
      db = client.db('users');

      // Ensure the collection is created
      await db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name'],
            properties: {
              name: {
                bsonType: 'string',
                description: 'must be a string and is required'
              }
            }
          }
        }
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }
  return db;
}

export { connectDB };
