import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'public/draco/', '.claude/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { languageOptions: { globals: { ...globals.browser } } },
  { files: ['*.config.{js,ts}', 'build/**'], languageOptions: { globals: { ...globals.node } } },
);
