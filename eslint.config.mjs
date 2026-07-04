import pluginVue from 'eslint-plugin-vue'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormattingConfig from '@vue/eslint-config-prettier/skip-formatting'

export default withVueTs(
  // ビルド成果物・旧設定ファイルを除外
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'release/**',
      'node_modules/**',
      'config/.eslintrc.cjs',
    ],
  },

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormattingConfig,

  // プロジェクト全体の共通ルール上書き
  {
    rules: {
      // eslint-plugin-vue v10 では vue/multi-word-component-names がデフォルト有効。
      // App.vue / index.vue 等の単語コンポーネントを許容するために off。
      'vue/multi-word-component-names': 'off',

      // 既存コードに any が多用されているため移行段階では off にする。
      // 将来的に warn → error へ段階的に引き上げることを推奨。
      '@typescript-eslint/no-explicit-any': 'off',

      // no-unused-vars は既存ビルドスクリプトに未使用変数があるため warn に緩和。
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // Node.js CJS ファイル (Electron main / ビルドスクリプト) は require() を許容
  {
    files: ['src/main/**/*.js', 'src/main/**/*.cjs', '*.js', '*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
