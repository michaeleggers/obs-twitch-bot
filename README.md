# Small program that connects via WebSocket to OBS to capture incoming Twitch chat-messages.

It plays a sound when a message comes in. You can configure the interval
at which a sound is being played for a user via the `COUNTER` variable.

The volume of the sound is being controlled via a numeric value called `VOLUME`, between 0.0 (muted)
and 1.0 (full loudness).

As this was made on Linux `paplay` is called to play the sound.
You would have to call a Windows/MacOS equivalent here:

```js
const SOUND_COMMAND = `paplay --volume=${VOLUME * 65536} ./sounds/chimes.flac`;
```

## Get it running
- Install all the packages via npm.
- Create your own env-file with obs-password, obs-ip and twitch-username:

```bash
mv .env-cmdrc.example .env-cmdrc
```

- Run `npm run start`.

