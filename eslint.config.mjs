import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'guilds/**', 'src/data/**'],
  },
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      // 既存コードに27箇所残存するため Phase 2 で error に引き上げ予定
      '@typescript-eslint/no-explicit-any': 'warn',
      // 既存コードに多数残存するため Phase 2 で error に引き上げ予定
      '@typescript-eslint/no-unused-vars': 'warn',
      // 既存コードへの影響を抑えるため Phase 2 で error に引き上げ予定
      'prefer-const': 'warn',
    },
  },
);
