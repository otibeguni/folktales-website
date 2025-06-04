import { defineConfig, envField } from 'astro/config';
import astroI18next from 'astro-i18next';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react(), astroI18next()],

  env: {
    schema: {
      BASEROW_URL: envField.string({ context: 'server', access: 'secret' }),
      BASEROW_TOKEN: envField.string({ context: 'server', access: 'secret' }),
      BASEROW_DATABASE_ID: envField.string({
        context: 'server',
        access: 'secret',
      }),
    },
  },
});
