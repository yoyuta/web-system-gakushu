# Step 8｜GitHub連携 - 学習まとめ

```
┌───────────────────────────────────────────┐
│  学んだこと                                  │
│  ① ローカルGitの基本操作（status/diff/commit/log）│
│  ② GitHubリモートとの連携（アカウント〜push）      │
│  ③ ブランチを切っての機能開発                     │
│  ④ Pull Request経由のレビュー・マージフロー        │
└───────────────────────────────────────────┘
```

`Web システム学習/`で作った実際のアプリ（`買い物リスト/`）を題材に、Claude学習Step7（ダミーリポジトリでの練習）の応用として、本物のGitHubリポジトリで一連の流れを実践した記録。

---

## 1. ローカルGitの基本操作

`Webシステム学習/`直下で`git init`し、以下の流れを実際のファイル変更で体験した。

| コマンド | 用途 |
|---|---|
| `git status` | 変更ファイルの確認 |
| `git diff` | 変更内容（差分）の確認 |
| `git add` → `git commit` | 変更をコミット |
| `git log` / `git log --oneline` | 履歴の確認 |

**ポイント**: コミット前に必ず`git status`/`git diff`で内容を確認してからコミットする習慣をつけた。

## 2. GitHubリモートとの連携

| 手順 | 内容 |
|---|---|
| GitHubアカウント作成 | ブラウザで`github.com/signup`から作成（本人確認が必要なため代行不可） |
| GitHub CLI（`gh`）導入 | `winget install --id GitHub.cli -e --source winget` |
| 認証 | `gh auth login --web` → ワンタイムコードをブラウザ（`github.com/login/device`）に入力 |
| credential helper設定 | `gh auth setup-git`（これが未設定だと`git pull`/`git push`が認証待ちで固まる） |
| リポジトリ作成 | `gh repo create <名前> --private --source=. --remote=origin --push` |

**作成したリポジトリ**: https://github.com/yoyuta/web-system-gakushu （Private）

**つまずいたポイント**: `gh auth login`直後は`git pull`が2分タイムアウトした。原因はgit用のcredential helperが未設定だったこと。`gh auth setup-git`を実行して解決した。

## 3. ブランチ運用

1. `git checkout -b feature/xxx` で機能ブランチを作成
2. ブランチ上で実装・コミット（例: 数量入力欄の追加）
3. `git checkout master` → `git merge feature/xxx`（fast-forward）
4. `git push origin master`
5. `git branch -d feature/xxx`（マージ済みブランチを削除）

## 4. Pull Request経由の開発フロー

ブランチを直接masterにマージするのではなく、GitHub上でレビューを挟む流れ。

1. `git checkout -b feature/xxx` → 実装 → コミット
2. `git push -u origin feature/xxx`
3. `gh pr create --title "..." --body "..."` でPR作成
4. `gh pr view <番号>` またはGitHub上でPRの差分をレビュー
5. `gh pr merge <番号> --merge --delete-branch` でマージ＋ブランチ自動削除（リモート）
6. `git fetch --prune` でローカルの古いリモート追跡ブランチを掃除

**作成したPR**: https://github.com/yoyuta/web-system-gakushu/pull/1 （全件削除ボタンの追加）

## 5. このプロジェクト特有の注意点

- `~/.claude/hooks/`に**危険なgitコマンドをブロックするフック**が設定されており、`git push`はClaude Code（AI側）から実行できない。pushが必要な場面では、コマンドを提示してユーザー自身に実行してもらう運用になっている
- `gh pr create`はブランチが未pushの場合、自動pushはしてくれない（`--head`指定か事前pushが必要）

## チェックポイント

- [x] `git status`/`git diff`で変更内容を確認してからコミットできる
- [x] GitHubアカウント作成〜`gh` CLIでの認証〜リモートリポジトリ作成ができる
- [x] ブランチを切って機能開発し、masterにマージできる
- [x] PRを作成し、レビューを経てマージ〜ブランチ削除まで一通り行える
