```
ticket-bot/
├── .env
├── package.json
├── nixpacks.toml
├── src/
│   ├── index.js
│   ├── database/
│   │   └── mongodb.js
│   ├── events/
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── guildMemberRemove.js
│   ├── commands/
│   │   ├── ticket/
│   │   │   ├── setup.js
│   │   │   └── close.js
│   │   └── admin/
│   │       ├── refresh.js
│   │       ├── dashboard.js
│   │       └── resetpanel.js
│   ├── utils/
│   │   ├── embeds.js
│   │   ├── logger.js
│   │   └── emojis.js
│   └── web/
│       ├── server.js
│       └── views/
│           ├── login.ejs
│           ├── dashboard.ejs
│           ├── guild-config.ejs
│           ├── templates.ejs
│           ├── template-editor.ejs
│           └── tickets.ejs
```
