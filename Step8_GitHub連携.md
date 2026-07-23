# Step 8｜GitHub連携 - 学習まとめ

```
┌───────────────────────────────────────────┐
│  学んだこと                                  │
│  ① ローカルGitの基本操作（status/diff/commit/log）│
│  ② GitHubリモートとの連携（アカウント〜push）      │
│  ③ ブランチを切っての機能開発                     │
│  ④ Pull Request経由のレビュー・マージフロー        │
│  ⑤ GitHub ActionsによるCI（自動チェック）         │
│  ⑥ GitHub PagesへのCD（自動デプロイ）             │
│  ⑦ PR→CI→マージ→自動デプロイの反復サイクル        │
│  ⑧ ブランチ保護ルールで直接pushを禁止              │
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

## 5. GitHub ActionsによるCI

PRを出すたびに、コーディング規約（jQuery1.11／ECMAScript5準拠）を自動チェックする仕組みを追加した。

| ファイル | 役割 |
|---|---|
| `package.json` / `package-lock.json` | ESLintを devDependency として管理 |
| `.eslintrc.json` | `parserOptions.ecmaVersion: 5` を指定。アロー関数・`let`/`const`など**ES6構文が入るとパースエラーになる**ため、規約違反をそのまま構文エラーとして検出できる |
| `.github/workflows/ci.yml` | `push`/`pull_request`（対象: `master`）で `npm ci` → `npx eslint 買い物リスト/js/**/*.js` を実行 |

**検証手順**:
1. ローカルで`npx eslint 買い物リスト/js/app.js`を実行し0件エラーを確認
2. 意図的にアロー関数を書いた別ファイルで実行し、`Parsing error: Unexpected token )`で検出されることを確認
3. PR (`#2`) を作成し、実際にGitHub Actions上で`lint`ジョブが`pass`することを確認してからマージ

**作成したPR**: https://github.com/yoyuta/web-system-gakushu/pull/2 （CI追加）

## 6. GitHub PagesによるCD（継続的デプロイ）

masterにマージするたびに、アプリを自動でインターネット公開する仕組みを追加した。スマートフォン実機からいつでもアクセスしたい、という実用上のニーズから着手。

| ファイル | 役割 |
|---|---|
| `.github/workflows/deploy.yml` | `push`（対象: `master`）で`買い物リスト/`配下をPagesにデプロイ。`actions/configure-pages` → `actions/upload-pages-artifact` → `actions/deploy-pages` の3ステップ |

**判断が必要だった点**: GitHub PagesはFreeプランだとPrivateリポジトリでは使えない（`gh api .../pages`が422エラー）。対応として、リポジトリ内に機密情報がないことを`git grep`で確認したうえで、リポジトリをPublicに変更（`gh repo edit --visibility public --accept-visibility-change-consequences`）してから有効化した。アプリの状態（買い物データ）はブラウザのlocalStorage内で完結する設計のため、ページが公開されてもユーザーのデータ自体が漏れることはない。

**Pagesの有効化**: `gh api repos/<owner>/<repo>/pages -X POST -f build_type=workflow`（ソースを「GitHub Actions」に設定）

**公開URL**: https://yoyuta.github.io/web-system-gakushu/ （スマホからもこのURLでアクセス可能。QRコード化して読み取ると早い）

**作成したPR**: https://github.com/yoyuta/web-system-gakushu/pull/3 （デプロイCD追加）

## 7. PR→CI→マージ→自動デプロイの反復サイクル

CI・CDが揃った後は、機能追加のたびに同じサイクルで進められることを確認した（例: 数量の＋－ボタン追加、PR #4）。

```
ブランチ作成 → 実装 → ローカルでESLint確認 → コミット → push
  → PR作成 → GitHub Actions(lint)がpassするのを確認
  → マージ → 自動でdeploy.ymlが走りGitHub Pagesへ反映
```

一度この基盤を作ってしまえば、以降の変更は「実装してpushしてPRをマージする」だけで、規約チェックとスマホへの反映が自動化される。

## 8. このプロジェクト特有の注意点

- `~/.claude/hooks/`に**危険なgitコマンドをブロックするフック**が設定されており、`git push`はClaude Code（AI側）から実行できない。pushが必要な場面では、コマンドを提示してユーザー自身に実行してもらう運用になっている
- `gh pr create`はブランチが未pushの場合、自動pushはしてくれない（`--head`指定か事前pushが必要）
- **`.github/workflows/`配下のファイルをpushするには、GitHub CLIの認証に`workflow`スコープが必要**。通常の`gh auth login`では付与されず、`! [remote rejected] ... (refusing to allow an OAuth App to create or update workflow ...)`で拒否される。`gh auth refresh -h github.com -s workflow`でスコープを追加し、`gh auth setup-git`でgitのcredential情報も更新して解決した
- **GitHub PagesはFreeプランではPrivateリポジトリに使えない**。使うにはPublic化（またはPro以上へのアップグレード）が必要で、公開範囲が変わるため事前に中身の機密情報確認と、ユーザー本人への確認を挟んだ

## 9. ブランチ保護ルール

これまでは「master に直接pushしない」「PR経由でマージする」をルールとして自分で守ってきたが、それを**GitHub側の仕組みとして強制**する設定を追加した。

**設定コマンド**:
```
gh api repos/yoyuta/web-system-gakushu/branches/master/protection -X PUT --input protection.json
```

**設定内容**（`protection.json`）:

| 項目 | 値 | 効果 |
|---|---|---|
| `required_status_checks.contexts` | `["lint"]` | CIの`lint`ジョブがpassしないとマージボタンが押せない |
| `required_status_checks.strict` | `true` | masterの最新状態を取り込んでいないブランチはマージ前に更新が必要 |
| `enforce_admins` | `true` | リポジトリオーナー自身にもルールが適用される（自分だけ抜け道を作らない） |
| `allow_force_pushes` / `allow_deletions` | `false` | masterへの強制push・削除を禁止 |
| `required_pull_request_reviews` | `null`（未設定） | あえて設定しない。GitHubの仕様上PR作成者は自分のPRを承認できないため、ソロ開発でレビュー必須化すると詰む。チーム開発になったら追加する項目 |

**動作確認**: このセクション自体の追記をmasterに直接コミットした状態で`git push origin master`を実行し、GitHub側から拒否されることを確認した（本ドキュメントはその後、正規のブランチ＋PRルートに移して反映している）。

**学び**: 「ルールを人が守る」から「ルールを仕組みが強制する」への発展。個人開発でも、CIが通らない変更を誤ってmasterに入れてしまうミスを構造的に防げる。

## チェックポイント

- [x] `git status`/`git diff`で変更内容を確認してからコミットできる
- [x] GitHubアカウント作成〜`gh` CLIでの認証〜リモートリポジトリ作成ができる
- [x] ブランチを切って機能開発し、masterにマージできる
- [x] PRを作成し、レビューを経てマージ〜ブランチ削除まで一通り行える
- [x] GitHub Actionsで自動チェック（CI）が動く仕組みを作り、実際にpass/failを確認できる
- [x] GitHub Pagesで自動デプロイ（CD）が動く仕組みを作り、実機（スマホ）から公開URLにアクセスできる
- [x] CI/CDが揃った状態で、新機能追加→PR→マージ→自動反映のサイクルを繰り返し実行できる
- [x] ブランチ保護ルールを設定し、masterへの直接pushがGitHub側で拒否されることを確認できる
