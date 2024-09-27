
<div align="center">
    <h1>LP SVIZEC</h1>
    <h3>Discord bot for tracking Match history and LP changes</h3>
    <h3>Built with discord.js</h3>
</div>

<p align="center">
  <a href="https://skillicons.dev">
    <img src=https://skillicons.dev/icons?i=nodejs,js,discord,git,github />
  </a>
</p>

---

## 📖 Table of Contents

- [📍 Overview](#-overview)
- [📦 Features](#-features)
- [📂 Repository Structure](#-repository-structure)
- [⚙️ Modules](#modules)
- [🚀 Getting Started](#-getting-started)
    - [🔧 Installation](#-installation)
    - [🤖 Running {{PROJECT_NAME}}](#-running-{{PROJECT_NAME}})
- [🛣 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [👏 Acknowledgments](#-acknowledgments)

---

## 📍 Overview

Welcome to **Summoner Stats Bot**, a **Node.js** application designed to fetch and display League of Legends player stats in Discord servers.

---

## 📦 Features

- **Real-time Stats Fetching:** Retrieve up-to-date player statistics from the Riot Games API.
- **Dynamic Embeds:** Display stats in richly formatted Discord embed messages.
- **Automated Updates:** Regularly update and post player stats to designated channels.
- **Rate Limit Handling:** Efficiently manage API calls to comply with Riot's rate limits.

---

## 📂 Repository Structure

```sh
└── summoner-stats-bot/
    ├── commands/
    │   └── addAccount.js
    │   └── clearAll.js
    │   └── help.js
    │   └── init.js
    │   └── leaderboard.js
    │   └── ping.js
    │   └── removeAccount.js
    │   └── stats.js
    ├── events/
    │   └── messageCreate.js
    │   └── ready.js
    ├── models/
    │   ├── Account.js
    │   └── GuildSettings.js
    ├── utils/
    │   ├── riotApi.js
    │   └── logger.js
    ├── .env
    ├── .gitignore
    ├── .prettierrc
    ├── index.js
    ├── package.json
    └── README.md
```

---

## ⚙️ Modules

<details closed><summary>Root</summary>
File	Summary
index.js	Main entry point of the Discord bot
package.json	Project dependencies and scripts
</details> <details closed><summary>Commands</summary>
File	Summary
stats.js	Command to fetch and display player stats
</details> <details closed><summary>Events</summary>
File	Summary
messageCreate.js	Handles incoming messages and commands
</details> <details closed><summary>Models</summary>
File	Summary
Account.js	Mongoose schema for player accounts
GuildSettings.js	Mongoose schema for guild configurations
</details> <details closed><summary>Utils</summary>
File	Summary
riotApi.js	Functions to interact with the Riot API
riotLimiter.js	Rate limiting implementation using Bottleneck
logger.js	Logging utility using Winston or similar
</details>

---

## 🚀 Getting Started

### 🔧 Installation

1. Clone the repository:
```sh
git clone https://github.com/sgtpolde/lp-svizec
```

2. Change to the project directory:
```sh
cd lp-svizec
```

3. Install the dependencies:
```sh
npm install
```

### 🤖 Running {{PROJECT_NAME}}
  Create a .env file in the root directory and add your configuration:

    DISCORD_TOKEN=your_discord_bot_token
    RIOT_API_KEY=your_riot_api_key
    MONGODB_URI=your_mongodb_connection_string
    COMMAND_PREFIX=[!, /, ..]
    LOG_LEVEL=info

```sh
npm start
```

---

## 🛣 Roadmap

> - [X] `Completed tasks`
> - [ ] `Upcoming features`

---

## 🤝 Contributing

Follow these steps to contribute:

1. **Fork the repository**
2. **Clone locally**
   ```sh
   git clone <your-forked-repo-url>
   ```
3. **Create a new branch**
   ```sh
   git checkout -b new-feature-x
   ```
4. **Submit a Pull Request**

---

## 👏 Acknowledgments

     Discord.js: For the powerful Discord API library.
     Riot Games API: For providing access to game data.
     Mongoose: For MongoDB object modeling.
     CommunityDragon: For providing game assets.
     Contributors and the open-source community.



Levels in Order of Priority (Lowest to Highest Severity):

    silly (lowest severity)
    debug
    verbose
    info
    warn
    error (highest severity)

    examples:

    If the log level is set to info, then messages with levels info, warn, and error will be logged.
    Messages with levels verbose, debug, and silly will be ignored.

