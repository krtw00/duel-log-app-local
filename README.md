# Duel Log App - Local (Electron Edition)

デュエルログアプリのローカル版（Electron）です。元のWebアプリケーションからログイン機能と共有リンク機能を除いたスタンドアロンアプリケーションです。

## 特徴

- ローカルデータベース（SQLite）を使用した完全オフライン対応
- 認証不要で即座に使用可能
- デュエル記録の管理
- デッキ管理
- 統計情報の表示
- ライト/ダークテーマの切り替え
- ストリーマーモード対応

## 削除された機能

- ユーザー認証（ログイン/ログアウト）
- アカウント登録
- パスワードリセット
- 統計情報の共有リンク機能

## 技術スタック

### フロントエンド
- Vue 3 (Composition API)
- TypeScript
- Vuetify 3
- Pinia (状態管理)
- Vue Router 4
- ApexCharts

### バックエンド/データベース
- Electron
- better-sqlite3 (SQLite)

### ビルドツール
- Vite
- electron-builder

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 開発モードで実行

```bash
npm run electron:dev
```

### ビルド

```bash
npm run electron:build
```

## プロジェクト構造

```
duel-log-app-local/
├── config/                # 設定ファイル
│   ├── .eslintrc.cjs      # ESLint設定
│   ├── .prettierrc.json   # Prettier設定
│   ├── tsconfig.json      # TypeScript基本設定
│   ├── tsconfig.main.json # Mainプロセス用TypeScript設定
│   ├── tsconfig.node.json # Node用TypeScript設定
│   ├── tsconfig.preload.json # Preload用TypeScript設定
│   └── vite.config.ts     # Vite設定
├── src/
│   ├── main/              # Electronメインプロセス
│   │   ├── index.ts       # メインプロセスエントリーポイント
│   │   └── database.ts    # SQLiteデータベースロジック
│   ├── preload/           # Electronプリロードスクリプト
│   │   └── index.ts       # IPC通信の公開API
│   └── renderer/          # Vueフロントエンド
│       ├── assets/        # 静的アセット
│       ├── components/    # Vueコンポーネント
│       ├── plugins/       # Vueプラグイン（Vuetify等）
│       ├── router/        # Vue Router設定
│       ├── services/      # APIサービス
│       ├── stores/        # Pinia状態管理
│       ├── types/         # TypeScript型定義
│       ├── utils/         # ユーティリティ関数
│       ├── views/         # ページビュー
│       ├── App.vue        # ルートコンポーネント
│       └── main.ts        # レンダラープロセスエントリーポイント
├── public/                # 公開静的ファイル
├── dist/                  # ビルド出力（レンダラープロセス）
├── dist-electron/         # ビルド出力（Electronプロセス）
├── electron-builder/      # Electron Builder設定
├── index.html             # HTMLエントリーポイント
├── package.json           # プロジェクト依存関係
└── README.md              # このファイル
```

## データベース

アプリケーションデータは以下の場所に保存されます：
- Windows: `%APPDATA%/duel-log-app-local/duel-log.db`
- macOS: `~/Library/Application Support/duel-log-app-local/duel-log.db`
- Linux: `~/.config/duel-log-app-local/duel-log.db`

## ライセンス

元のduel-log-appプロジェクトと同じライセンスに従います。
