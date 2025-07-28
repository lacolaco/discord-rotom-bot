# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot built with TypeScript that runs on Cloudflare Workers. The bot provides Pokémon-related information and news notifications through Discord slash commands.

### Key Technologies
- **Runtime**: Cloudflare Workers (serverless)
- **Framework**: Hono (web framework for Workers)
- **Language**: TypeScript with CommonJS modules
- **Package Manager**: pnpm
- **Discord Integration**: discord-interactions and discord-api-types
- **Observability**: Sentry with toucan-js
- **Data Source**: @lacolaco/pokemon-data package

## Architecture

### Core Components

- **src/index.ts**: Main application entry point with Hono server and scheduled job handler
- **src/context.ts**: TypeScript context definitions for Hono app and Cloudflare Workers environment
- **src/discord/**: Discord API integration layer
  - `api.ts`: Discord REST API client
  - `interactions.ts`: Interaction handling and verification middleware
  - `utils.ts`: Discord-related utilities
- **src/commands/**: Slash command implementations
  - `index.ts`: Command registry and lookup
  - `ping.ts`: Simple ping command
  - `pokeinfo.ts`: Pokémon information command with autocomplete
- **src/news/**: News notification system
  - Fetches Pokémon news and sends notifications via Discord
  - Uses Cloudflare KV for state persistence
- **src/pokeinfo/**: Pokémon data handling utilities
- **src/observability/**: Sentry integration for error tracking and monitoring

### Deployment Architecture

- **Cloudflare Workers**: Serverless execution environment
- **Cloudflare KV**: Used for storing news notification state
- **Scheduled Jobs**: Cron job runs every 5 minutes for news notifications
- **Environment Variables**: Configuration stored in wrangler.toml and secrets

## Development Commands

### Core Development
```bash
pnpm dev          # Start development server with wrangler
pnpm start        # Alias for dev
pnpm deploy       # Deploy to Cloudflare Workers
pnpm format       # Format code with Prettier
```

### Discord Command Management
```bash
pnpm register-commands    # Register slash commands with Discord API
```

**Environment variables required for command registration:**
- `DISCORD_TOKEN`: Bot token
- `DISCORD_APPLICATION_ID`: Discord application ID  
- `DISCORD_GUILD_ID`: Target Discord server ID

### Building and Type Checking
- No explicit build command - uses tsx for development execution
- TypeScript compilation handled by wrangler for deployment
- Configuration in tsconfig.json with strict mode enabled

## Key Development Patterns

### Command Structure
Commands follow a consistent pattern:
- Export a `default` object with `name` and `description`
- Implement `createResponse()` for handling interactions
- Optional `createAutocompleteResponse()` for autocomplete support
- Commands are automatically registered in `src/commands/index.ts`

### Environment Handling
- Development: Uses wrangler.toml for configuration
- Secrets: Managed through Cloudflare Workers secrets (not in wrangler.toml)
- Type safety: Environment variables typed in `src/context.ts`

### Error Handling
- Global error handler in main app with Sentry integration
- Structured logging with console.error
- Cron job monitoring with Sentry check-ins

### Data Flow
1. Discord sends interaction to `/api/interactions` endpoint
2. Request verified using Discord's verification middleware
3. Command lookup and execution via command registry
4. Response sent back to Discord API
5. Scheduled news checks run independently via cron trigger