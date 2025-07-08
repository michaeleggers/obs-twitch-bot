import OBSWebSocket from 'obs-websocket-js';
import tmi from 'tmi.js';
import { exec } from 'child_process';
import { exit } from 'process';
import express from 'express';
import axios from 'axios';
//import request from 'request';

const obs = new OBSWebSocket();

let volumeArgs = process.argv[2];
let counterArgs = process.argv[3];

let VOLUME = volumeArgs || 0.5; // Set the loudness here. 0.0 = muted, 1.0 = full loudness.
const COUNTER = counterArgs || 5; // Set after how many messages from a user the sound plays.

// Clamp loudness between 0, 1
VOLUME = Math.max(0.0, Math.min(VOLUME, 1.0));
console.log("Volume set to: ", VOLUME);

console.log("Counter set to: ", COUNTER);

// === USER COUNTERS ===
const USER_COUNTERS = new Map();

// === CONFIGURATION ===
const OBS_PASSWORD = process.env.OBS_PASSWORD;
const OBS_ADDRESS = process.env.OBS_ADDRESS;
const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL; // lowercase, no @
const SOUND_COMMAND = `paplay --volume=${VOLUME * 65536} ./sounds/chimes.flac`;

const OPENGL_PLAYER_IP = "0.0.0.0"; // Only localhost possible atm.
const OPENGL_PLAYER_PORT = 8081;


console.log(`Active environment: ${process.env.NODE_ENV}`);


const SendRequest = async (address) => {
  const client = axios.create({
    responseType: "json",
    headers: {
      Accept: "application/json",
    }
  });

  try {
    const res = await client.get(address);
    return res;
  }
  catch {
    err => {
      console.log('Error-Msg: ', err.message);
      return err;
    }
  };
}

if (process.env.NODE_ENV === 'dev-mock') {
  const PORT = 6060;
  const app = express();
  app.get('/', async (req, res) => {
    //console.log(req);
    //Play sound
    exec(SOUND_COMMAND, (err) => {
      if (err) console.error('Sound error:', err);
    });

    // Send request to OpenGL Server and return its response to client.
    try {
      const glPlayerResponse = await SendRequest(`http://${OPENGL_PLAYER_IP}:${OPENGL_PLAYER_PORT}/`);
      return res.send(`Data received from opengl-server: ${JSON.stringify(glPlayerResponse.data)}`);
    }
    catch (err) {
      console.log(`Failed to get a response from opengl-server. Error: ${err}`);
    }
  });

  app.listen(PORT, 'localhost', () => {
    console.log(`listening on ${PORT}.`);
  });
}
else {
  // === Connect to OBS ===
  async function connectOBS() {
    try {
      await obs.connect(OBS_ADDRESS, OBS_PASSWORD);
      console.log('🦭 Connected to OBS WebSocket');
    } catch (err) {
      console.error(`❌ OBS connection error: ${err}`);
      exit(666);
    }
  }

  // === Twitch Chat Connection ===
  const client = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true },
    channels: [TWITCH_CHANNEL],
  });
  client.connect();

  client.on('message', async (channel, tags, message, self) => {
    //if (self) return; // Ignore own messages

    const displayName = tags['display-name'];
    console.log(`[${displayName}]: ${message}`);

    if (USER_COUNTERS.has(displayName)) {
      USER_COUNTERS.set(displayName, USER_COUNTERS.get(displayName) + 1);
    }
    else {
      // First time chatter. Set to COUNTER so that sound plays the first time.
      USER_COUNTERS.set(displayName, COUNTER);
    }

    const counter = USER_COUNTERS.get(displayName);

    //console.log(`DEBUG: Usercounter for ${displayName} is ${counter}`);

    if (counter >= COUNTER) {
      //Play sound
      exec(SOUND_COMMAND, (err) => {
        if (err) console.error('Sound error:', err);
      });

      // Send request to OpenGL Server and return its response to client.
      try {
        const glPlayerResponse = await SendRequest(`http://${OPENGL_PLAYER_IP}:${OPENGL_PLAYER_PORT}/`);
        return res.send(`Data received from opengl-server: ${JSON.stringify(glPlayerResponse.data)}`);
      }
      catch (err) {
        console.log(`Failed to get a response from opengl-server. Error: ${err}`);
      }


      // Reset counter
      USER_COUNTERS.set(displayName, 0);
    }
  });

  await connectOBS()
}


console.log("OBS Bot running.");
