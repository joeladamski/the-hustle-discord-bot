# The Hustle Discord Bot (Node.js + discord.js)

Production-ready Discord bot with onboarding + role progression:
- Auto-role assignment for new users
- Message-based role progression and automatic promotions
- Promotion logging (console + Discord channel)
- Admin controls for progression and stats
- Config file defaults + runtime overrides stored in SQLite
- Environment variable based secret management
- Dockerized deployment

## 1) Architecture Plan

### Components
- **Discord Gateway Client (`src/index.js`)**
  - Connects to Discord
  - Handles join events, message events, promotion checks, and admin commands
- **Config Layer (`config/bot.config.json` + `src/config/index.js`)**
  - Defines progression roles, admin role, and logging defaults
- **Persistence Layer (`src/db/index.js`, `src/db/users.js`, SQLite)**
  - Stores user `message_count`, `role_level`, and runtime settings
- **Progression Service (`src/services/progression.js`)**
  - Calculates eligibility and applies promotion roles via Discord API
- **Admin Command Layer (`src/commands/admin.js`)**
  - `!promote`, `!demote`, `!userstats`, `!topactivity`, config commands

### Runtime Data Flow
1. Bot starts, loads static config, initializes DB schema.
2. On `guildMemberAdd`:
   - Ensure user exists in DB.
   - Assign starter role.
   - Send welcome + join logs.
3. On each `messageCreate`:
   - Increment `message_count` in SQLite.
   - Compute eligible progression level from thresholds.
   - If level increases, assign new Discord role, persist `role_level`, and log promotion.
4. Admin commands support manual promotions/demotions and user stats lookup.

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
│   │   ├── index.js
│   │   └── users.js
│   ├── events/
│   │   └── guildMemberAdd.js
│   ├── services/
│   │   └── progression.js
│   └── index.js
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## 3) Key Logic Explanation

- **Progression model**:
  - Role definitions live in `config/bot.config.json` as ordered `progressionRoles` with:
    - `level`
    - `name`
    - `minMessages`
- **Promotion metric**:
  - `message_count` is incremented on every non-bot guild message.
- **Duplicate promotion protection**:
  - Auto-promotion only runs when `eligibleLevel > current role_level`.
- **Promotion assignment**:
  - Bot removes other configured progression roles and assigns the target role.
- **Persistence**:
  - SQLite stores `role_level` + `message_count` for each user.
- **Admin controls**:
  - `!promote <user> [level]`, `!demote <user> [level]`, `!userstats`, `!topactivity`.

## Setup Instructions

### Prerequisites
- Node.js 20+
- Discord bot application/token
- Discord bot permissions:
  - Manage Roles
  - Send Messages
  - Read Message History
  - View Channels

### Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```env
   DISCORD_BOT_TOKEN=your_discord_bot_token
   WELCOME_CHANNEL_NAME=welcome
   LOG_CHANNEL_NAME=join-logs
   COMMAND_PREFIX=!
   ```
3. Ensure Discord roles exist for every `progressionRoles[].name`.
4. Run bot:
   ```bash
   npm start
   ```

### Docker Setup
```bash
docker compose up -d --build
docker compose logs -f discord-bot
```

Persistent data is stored in `bot_data` volume (`/app/data/bot.db`).
