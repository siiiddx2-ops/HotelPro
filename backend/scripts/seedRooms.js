require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const sampleRooms = require('../data/sampleRooms');

async function seedRooms() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hotelpro');
  const results = await Promise.all(sampleRooms.map(room => Room.updateOne(
    { roomNumber: room.roomNumber },
    { $setOnInsert: { ...room, status: 'Available' } },
    { upsert: true }
  )));
  const added = results.reduce((total, result) => total + (result.upsertedCount || 0), 0);
  const total = await Room.countDocuments();
  console.log(`${added} sample rooms added; ${total} rooms are now in inventory.`);
}

seedRooms()
  .catch(error => {
    console.error('Unable to add sample rooms:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
