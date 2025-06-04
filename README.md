# Otibeguni - Folktales Website

This repository contains code of Otibeguni - Folktales Website, built with [Astro](https://astro.build/) and [Tailwind CSS](https://tailwindcss.com/).

## Prerequisites

Before starting, ensure you have the following installed:

- Node.js `v20.18.3` (Use the correct version via NVM)

- NVM (Node Version Manager - optional)

- npm

## Setting Up the Project

1. Install NVM and use the correct Node.js version:

   ```
   nvm install 20.18.3
   nvm use
   ```

2. Install dependencies using **npm**:

   ```
   npm install
   ```

3. Copy the example environment file:

   ```
   cp .env.example .env
   ```

4. Fill in the required values and tokens in the `.env` file.

5. Run the development server:

   ```
   npm run dev
   ```

6. Open [http://localhost:4321](http://localhost:4321) in your browser.

## Deploying on Production

To deploy the application for production use, follow these command:

```
npm run build
```

## Releasing a New Version

To release a new version, and automatically generate changelogs, simply runs command below.

```
npm run release
```

## Commit Guidelines

All commits must follow the Conventional Commits format:

```
<type>: <description>
```

### Example:

```
feat: add OAuth login support
fix: resolve layout shift issue on homepage
```

## Documentation References

- [Astro](https://astro.build/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [Baserow - Otibeguni Database](https://benign-bird.pikapod.net/api-docs/database/170)
