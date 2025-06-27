import OBSWebSocket from 'obs-websocket-js';
import tmi from 'tmi.js';
import { exec } from 'child_process';
import { exit } from 'process';
import express from 'express';
import axios from 'axios';
import request from 'request';

const obs = new OBSWebSocket();

let volumeArgs = process.argv[2];
let counterArgs = process.argv[3];

let VOLUME = volumeArgs|| 0.5; // Set the loudness here. 0.0 = muted, 1.0 = full loudness.
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

const OPENGL_PLAYER_IP   = "0.0.0.0"; // Only localhost possible atm.
const OPENGL_PLAYER_PORT = 8081;

// === Connect to OBS ===
async function connectOBS() {
  try {
    await obs.connect(OBS_ADDRESS, OBS_PASSWORD);
    console.log('✅ Connected to OBS WebSocket');
  } catch (err) {
    console.error('❌ OBS connection error:', err);
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

client.on('message', async (channel, tags, message, self)  => {
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

        // Send opengl-player request:
        //try {
        //  let res = await fetch(`http://${OPENGL_PLAYER_IP}:${OPENGL_PLAYER_PORT}`);
        //  //console.log(`Sent message to opengl-player. Received:`);

        //  //const headerDate = res.headers && res.headers.get('date') ? res.headers.get('date') : 'no response date';
        //  //console.log('Status Code:', res.status);
        //  //console.log('Date in Response header:', headerDate);

        //  const data = await res.json();
        //  //console.log(data);
        //} catch(err) {
        //  console.log(`Failed getting response from opengl-player.`);
        //  console.log(`Error: ${err}`)
        //}
    //
    const client = axios.create({
  responseType: "json",
  headers: {
    Accept: "application/json",
  }
});

client.get(`http://${OPENGL_PLAYER_IP}:${OPENGL_PLAYER_PORT}/`)
  .then(res => {
        //console.log(res);
    //const headerdate = res.headers && res.headers.date ? res.headers.date : 'no response date';
    //console.log('Status Code:', res.status);
    //console.log('Date in Response header:', headerDate);

    //const msg  = res.data;
    //console.log(msg);
        const obj = res.data;
        console.log(obj.message);

  })
  .catch(err => {
    console.log('Error-Msg: ', err.message);
    //console.log('Full Error-Obj: ', err);
  });
    //
   
    
//request('http://localhost:8081/', function (error, response, body) {
//  console.error('error:', error); // Print the error if one occurred
//  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
//  console.log('body:', body); // Print the HTML for the Google homepage.
//});

        // Reset counter
        USER_COUNTERS.set(displayName, 0);
    }
});

await connectOBS()

console.log("OBS Bot running.");
