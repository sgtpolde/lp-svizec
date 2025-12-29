<div align="center">
  <h1>🏆 LP SVIZEC</h1>
  <h3>Advanced Discord Bot for League of Legends LP & Match Tracking</h3>
  <p><strong>Version 3.0.0</strong> - Built with Discord.js v14 & ES Modules</p>
</div>

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=nodejs,js,discord,mongodb,git" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/badge/discord.js-v14.25-blue" alt="Discord.js">
  <img src="https://img.shields.io/badge/mongoose-v9.0-red" alt="Mongoose">
  <img src="https://img.shields.io/badge/ES%20Modules-✓-success" alt="ES Modules">
  <img src="https://img.shields.io/badge/Slash%20Commands-✓-success" alt="Slash Commands">
</p>

---

## 📖 Table of Contents

- [📍 Overview](#-overview)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [📂 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Slash Command Deployment](#slash-command-deployment)
  - [Running the Bot](#running-the-bot)
- [💻 Development](#-development)
- [📝 Available Commands](#-available-commands)
- [🔄 Scheduled Tasks](#-scheduled-tasks)
- [🛠️ Tech Stack](#️-tech-stack)
- [📋 Changelog](#-changelog)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 📍 Overview

**LP SVIZEC** is a production-ready Discord bot that automatically tracks League of Legends ranked gameplay, providing real-time LP (League Points) updates, match statistics, and leaderboards for your Discord community.

### What Makes v3.0 Special?

- 🎯 **Discord Slash Commands** - Native Discord command integration
- 📦 **ES Modules** - Modern JavaScript with import/export
- 🏗️ **Clean Architecture** - Service layer, proper separation of concerns
- ⚡ **Developer Experience** - Hot-reload, ESLint, Prettier
- 🔄 **Automated Tracking** - Cron-based stats updates every 3 minutes
- 📊 **Rich Visualizations** - LP history graphs with Chart.js
- 🌍 **Multi-Region** - Supports all League of Legends regions

---

## ✨ Features

### Core Functionality

- ✅ **Automatic LP Tracking** - Monitors ranked games and broadcasts results
- 📈 **LP History Graphs** - Visual representation of LP progression
- 🏆 **Leaderboards** - Competitive rankings for tracked players
- 🔔 **Real-time Notifications** - Instant match result embeds with detailed stats
- 💾 **Persistent Storage** - MongoDB for reliable data retention (500 games per player)
- ⏰ **Scheduled Updates** - Automatic stats refresh every 3 minutes

### Match Details Include

- Win/Loss status with LP gain/loss
- Rank changes (e.g., Gold IV → Gold III)
- KDA (Kills/Deaths/Assists)
- CS per minute
- Kill participation percentage
- Vision score
- Champion played

### Technical Features

- 🚀 **Slash Commands** - Modern Discord command system
- 🔒 **Permission Checks** - Role-based command access
- 🌐 **Multi-Guild Support** - Works across multiple Discord servers
- 📝 **Comprehensive Logging** - Winston logger with environment-aware formatting
- 🛡️ **Error Handling** - Graceful error recovery and user-friendly messages
- ♻️ **Graceful Shutdown** - Proper cleanup of resources

---

## 🏗️ Architecture

LP SVIZEC v3.0 follows modern software architecture principles:

```
┌─────────────────────────────────────────────┐
│           Discord API (Slash Commands)      │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│         Event Handlers Layer                │
│  ├─ interactionCreate (slash commands)      │
│  ├─ messageCreate (legacy support)          │
│  └─ ready (initialization & scheduling)     │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│           Commands Layer                    │
│  ├─ /addaccount    ├─ /leaderboard         │
│  ├─ /removeaccount ├─ /gengraph            │
│  ├─ /stats         ├─ /help                │
│  ├─ /ping          ├─ /init                │
│  └─ /clear                                  │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│         Services Layer (Business Logic)     │
│  ├─ Scheduler Service (cron management)     │
│  └─ Stats Service (match processing)        │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│            Utilities Layer                  │
│  ├─ Riot API Client (axios-based)          │
│  ├─ Error Handler (centralized)            │
│  ├─ Validation (input checking)            │
│  ├─ Logger (Winston)                        │
│  └─ Image Generator (Chart.js)             │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│            Data Layer                       │
│  ├─ Account Model (Mongoose)               │
│  └─ GuildSettings Model (Mongoose)         │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│         External Services                   │
│  ├─ MongoDB (persistent storage)           │
│  ├─ Riot Games API (match data)            │
│  └─ Data Dragon (assets)                   │
└─────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
lp-svizec/
├── commands/              # Slash command implementations
│   ├── addAccount.js     # Track new League account
│   ├── removeAccount.js  # Stop tracking account
│   ├── stats.js          # Fetch latest ranked stats
│   ├── leaderboard.js    # Display rankings
│   ├── genGraph.js       # Generate LP history graph
│   ├── help.js           # Command list
│   ├── ping.js           # Health check
│   ├── init.js           # Channel configuration
│   └── clear.js          # Message management
│
├── events/               # Discord event handlers
│   ├── interactionCreate.js  # Slash command handler
│   ├── messageCreate.js      # Legacy message handler
│   └── ready.js              # Bot initialization
│
├── models/               # MongoDB schemas
│   ├── Account.js        # Player account schema
│   ├── GuildSettings.js  # Server configuration schema
│   └── baseOptions.js    # Shared schema options
│
├── services/             # Business logic layer
│   └── scheduler.js      # Cron task management
│
├── utils/                # Utility functions
│   ├── riotApi.js        # Riot API client
│   ├── logger.js         # Winston logger
│   ├── helpers.js        # Helper functions
│   ├── ddragon.js        # Data Dragon API
│   ├── generateImage.js  # Chart generation
│   ├── constants.js      # Shared constants
│   ├── errorHandler.js   # Error handling
│   └── validation.js     # Input validation
│
├── deploy-commands.js    # Slash command registration
├── index.js              # Application entry point
├── package.json          # Dependencies & scripts
├── eslint.config.js      # ESLint configuration
├── .prettierrc           # Prettier configuration
├── .env.example          # Environment variables template
└── README.md             # Documentation

```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **MongoDB** ([Atlas](https://www.mongodb.com/cloud/atlas) or local installation)
- **Discord Bot Token** ([Discord Developer Portal](https://discord.com/developers/applications))
- **Riot Games API Key** ([Riot Developer Portal](https://developer.riotgames.com/))

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/sgtpolde/lp-svizec.git
   cd lp-svizec
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

### Configuration

1. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your credentials:**

   ```env
   # Required
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_application_id
   RIOT_API_KEY=your_riot_api_key_here
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lp-svizec

   # Optional
   LOG_LEVEL=info                    # error | warn | info | debug
   NODE_ENV=development              # development | production
   GUILD_ID=your_test_guild_id      # For faster command deployment during dev
   ```

3. **Get your credentials:**
   - **Discord Token & Client ID**: [Discord Developer Portal](https://discord.com/developers/applications)
     1. Create a new application
     2. Go to "Bot" section → Get token
     3. Copy Application ID (Client ID) from "General Information"
   - **Riot API Key**: [Riot Developer Portal](https://developer.riotgames.com/)
     1. Sign in with your Riot account
     2. Generate a new API key (production key recommended)

### Slash Command Deployment

**Important:** You must deploy slash commands before the bot can use them.

1. **Deploy to test guild (instant, recommended for testing):**

   ```bash
   npm run deploy:guild
   ```

2. **Deploy globally (takes up to 1 hour, use for production):**

   ```bash
   npm run deploy
   ```

### Running the Bot

**Development mode (with hot-reload):**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

**Verify the bot is running:**

- Check console for `✅ Logged in as YourBotName#1234`
- Check console for `Commands loaded: 9 | Events loaded: 3`
- Try `/ping` in Discord

---

## 💻 Development

### Available Scripts

```bash
npm start          # Start bot in production mode
npm run dev        # Start with nodemon (auto-restart on changes)
npm run deploy     # Deploy slash commands globally
npm run deploy:guild # Deploy to test guild (faster)
npm run lint       # Check code quality with ESLint
npm run lint:fix   # Auto-fix ESLint issues
npm run format     # Format code with Prettier
npm run format:check # Check formatting without changes
```

### Development Workflow

1. **Make changes** to command or event files
2. **Hot-reload** automatically restarts the bot (if using `npm run dev`)
3. **Lint and format** before committing:

   ```bash
   npm run lint:fix && npm run format
   ```

4. **Re-deploy commands** if you modified slash command definitions:

   ```bash
   npm run deploy:guild
   ```

### Code Style

- **ESLint** enforces code quality rules
- **Prettier** ensures consistent formatting
- **ES Modules** with `import/export` (no CommonJS)
- **JSDoc** comments for function documentation
- **Named exports** for utilities, **default exports** for commands/events/models

---

## 📝 Available Commands

All commands use Discord's native slash command system (`/command`):

| Command          | Description                           | Options                         | Permissions     |
| ---------------- | ------------------------------------- | ------------------------------- | --------------- |
| `/addaccount`    | Track a new League of Legends account | `gamename`, `tagline`, `region` | None            |
| `/removeaccount` | Stop tracking an account              | `gamename`, `tagline`, `region` | None            |
| `/stats`         | Manually trigger stats update         | None                            | None            |
| `/leaderboard`   | Display rankings for tracked players  | None                            | None            |
| `/gengraph`      | Generate LP history graph             | `summoner` (GameName#TagLine)   | None            |
| `/help`          | List all available commands           | None                            | None            |
| `/ping`          | Check bot latency and API status      | None                            | None            |
| `/init`          | Set channel for stats broadcasts      | None                            | Administrator   |
| `/clear`         | Bulk delete messages                  | `amount` (1-100)                | Manage Messages |

### Command Examples

```
/addaccount gamename:Faker tagline:T1 region:kr
/removeaccount gamename:Faker tagline:T1 region:kr
/gengraph summoner:Faker#T1
/leaderboard
/help
```

### Supported Regions

`na`, `euw`, `eun`, `kr`, `jp`, `oce`, `br`, `lan`, `las`, `ru`, `tr`

---

## 🔄 Scheduled Tasks

The bot automatically runs these tasks in the background:

### Stats Update (Every 3 minutes)

- Checks all tracked accounts for new ranked games
- Fetches match details from Riot API
- Calculates LP changes and rank updates
- Broadcasts results to configured channels

### Leaderboard Update (Every 4 hours)

- Generates fresh leaderboard rankings
- Posts to all configured guild channels
- Shows top players by current LP

### Cron Schedule

- **Stats**: `*/3 * * * *` (every 3 minutes)
- **Leaderboard**: `0 */4 * * *` (every 4 hours at :00)

---

## 🛠️ Tech Stack

### Core Dependencies

- **[Discord.js](https://discord.js.org/)** v14.25.1 - Discord API wrapper
- **[Mongoose](https://mongoosejs.com/)** v9.0.2 - MongoDB ODM
- **[Axios](https://axios-http.com/)** v1.13.2 - HTTP client for Riot API
- **[Express](https://expressjs.com/)** v5.2.1 - Web server framework
- **[Node-Cron](https://github.com/node-cron/node-cron)** v4.2.1 - Task scheduling

### Data & Visualization

- **[Chart.js](https://www.chartjs.org/)** v4.5.1 - LP graph generation
- **[Canvas](https://www.npmjs.com/package/canvas)** v3.2.0 - Server-side rendering

### Logging & Configuration

- **[Winston](https://github.com/winstonjs/winston)** v3.19.0 - Comprehensive logging
- **[Dotenv](https://github.com/motdotla/dotenv)** v17.2.3 - Environment variables

### Development Tools

- **[ESLint](https://eslint.org/)** v9.39.2 - Code quality
- **[Prettier](https://prettier.io/)** v3.7.4 - Code formatting
- **[Nodemon](https://nodemon.io/)** v3.1.11 - Auto-restart during development

---

## 📋 Changelog

### v3.0.0 (Latest)

- ✨ Migrated to Discord slash commands
- 📦 Converted to ES Modules (import/export)
- 🏗️ Added service layer architecture
- 🔧 Configured ESLint & Prettier
- ⚡ Added nodemon for development hot-reload
- 🛠️ Created centralized error handling
- ✅ Added input validation utilities
- 📝 Comprehensive documentation update

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes following the code style
4. **Test** thoroughly with `npm run dev`
5. **Lint** and format: `npm run lint:fix && npm run format`
6. **Commit** with descriptive messages
7. **Push** to your branch (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 👏 Acknowledgments

- **[Discord.js](https://discord.js.org/)** - Powerful Discord API library
- **[Riot Games API](https://developer.riotgames.com/)** - League of Legends data
- **[Mongoose](https://mongoosejs.com/)** - MongoDB object modeling
- **[Community Dragon](https://communitydragon.org/)** - Game assets
- **[Chart.js](https://www.chartjs.org/)** - Beautiful charts
- Open-source community and contributors

---

<div align="center">
  <p>Made with ❤️ for the League of Legends community</p>
  <p><strong>LP SVIZEC v3.0.0</strong></p>
</div>
