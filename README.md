# The Hustle Discord Bot (Node.js + discord.js)

Production-ready onboarding bot for Discord with:
- Auto-role assignment for new users
- Welcome message delivery
- Join event logging
- Config file defaults + runtime overrides stored in SQLite
- Environment variable based secret management
- Dockerized deployment

## 1) Architecture Plan

### Components
- **Discord Gateway Client (`src/index.js`)**
  - Connects to Discord
  - Registers event handlers and admin command handling
- **Config Layer (`config/bot.config.json` + `src/config/index.js`)**
  - Static defaults for role, welcome message, admin role
- **Persistence Layer (`src/db/index.js`, SQLite)**
  - Stores mutable runtime settings (`autoRoleName`, `welcomeMessage`)
- **Join Workflow (`src/events/guildMemberAdd.js`)**
  - Handles role assignment, welcome posting, and logging
- **Admin Command Layer (`src/commands/admin.js`)**
  - `!setautorole`, `!setwelcome`, `!showconfig`

### Runtime Data Flow
1. Bot starts and loads static config.
2. DB initializes and seeds defaults if not present.
3. On `guildMemberAdd`:
   - Load current settings from DB
   - Assign configured role
   - Send welcome message to configured welcome channel
   - Write structured join log (console + optional log channel)
4. Admins can update role/message settings at runtime via commands.

## 2) File Structure

```text
.
├── config/
│   └── bot.config.json
├── src/
│   ├── commands/
│   │   └── admin.js
│   ├── config/
│   │   └── index.js
│   ├── db/
│   │   └── index.js
│   ├── events/
│   │   └── guildMemberAdd.js
│   └── index.js
├── .dockerignore
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## 3) Key Logic Explanation

- **Auto-role assignment**:
  - On member join, bot resolves the role by name and assigns it.
- **Welcome message**:
  - Template supports placeholders: `{user}`, `{server}`, `{role}`.
- **Join logging**:
  - Console logs always emitted.
  - Optional log sent to `LOG_CHANNEL_NAME` channel if found.
- **Config strategy**:
  - `config/bot.config.json` provides default values.
  - Admin commands override values into SQLite for persistent runtime customization.
- **Security**:
  - Bot token never hardcoded; loaded from `DISCORD_BOT_TOKEN`.

## Setup Instructions

### Prerequisites
- Node.js 20+
- Discord bot application/token
- Discord server where bot has permissions:
  - Manage Roles
  - Send Messages
  - Read Message History
  - View Channels

### Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your values:
   ```env
   DISCORD_BOT_TOKEN=your_discord_bot_token
   DISCORD_GUILD_ID=your_guild_id
   WELCOME_CHANNEL_NAME=welcome
   LOG_CHANNEL_NAME=join-logs
   COMMAND_PREFIX=!
   ```
4. Ensure your Discord server has the role configured in `config/bot.config.json`.
5. Start bot:
   ```bash
   npm start
   ```

### Admin Commands
- `!showconfig` → Show current runtime config
- `!setautorole <role name>` → Update auto-assigned role
- `!setwelcome <message>` → Update welcome message template

### Docker Setup

1. Create `.env` from `.env.example`.
2. Build and run:
   ```bash
   docker compose up -d --build
   ```
3. Follow logs:
   ```bash
   docker compose logs -f discord-bot
   ```

Persistent data is stored in Docker volume `bot_data` (`/app/data/bot.db`).

## Notes
- If the configured role or channels are missing, the bot logs warnings instead of crashing.
- Enable `Server Members Intent` and `Message Content Intent` in Discord Developer Portal.
