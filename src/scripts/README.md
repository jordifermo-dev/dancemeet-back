# Scripts

This folder is for standalone one-off scripts run against the live database
via `tsx` (e.g. `npm run connection-test`), separate from the NestJS app
itself. Past data migrations/backfills that already ran against the live DB
have been removed once applied - they aren't meant to be kept around
long-term, since each one only made sense against a specific, one-time state
of the data.

## `connection-test.ts`

A quick MongoDB connectivity smoke test - connects using `MONGODB_URI`/
`MONGODB_DB_NAME` from `.env`, lists collections, and pings the server.

```bash
npm run connection-test
```

Expected output:
```
🔄 Connecting to MongoDB...
✅ Successfully connected to MongoDB
✅ Successfully accessed database: DanceMeetDB
✅ Collections found: N
✅ Ping successful: { ok: 1 }
✅ All connection tests passed!
🔌 Connection closed
```

## Writing a new script

Follow the same shape as `connection-test.ts`: import `connectMongoose` from
`../config/mongoose.config`, do the work, then `mongoose.disconnect()`. Add an
npm script entry in `package.json` (`"my-script": "tsx src/scripts/my-script.ts"`)
so it's discoverable and consistently invoked.
