import { defineConfig } from 'vitest/config';
import { prerenderFallback } from './build/prerenderFallback';

export default defineConfig({
  base: '/',
  plugins: [prerenderFallback()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
