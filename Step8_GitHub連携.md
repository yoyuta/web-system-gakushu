# Step 8｜GitHub連携 - 学習まとめ

```
┌───────────────────────────────────────────┐
│  学んだこと                                  │
│  ① ローカルGitの基本操作（status/diff/commit/log）│
│  ② GitHubリモートとの連携（アカウント〜push）      │
│  ③ ブランチを切っての機能開発                     │
│  ④ Pull Request経由のレビュー・マージフロー        │
│  ⑤ GitHub ActionsによるCI（ESLintで自動チェック）  │
│  ⑥ GitHub PagesへのCD（自動デプロイ）             │
│  ⑦ PR→CI→マージ→自動デプロイの反復サイクル        │
│  ⑨ ブランチ保護ルールで直接pushを禁止              │
│  ⑩ マージコンフリクトの解消                       │
│  ⑪ Issueによるタスク管理（closes連携）             │
│  ⑫ ブランチ戦略（GitHub Flow / Git Flow）           │
│  ⑬ Releaseとタグ管理                              │
│  ⑭ CIへのテスト組み込み（テストの書き方はStep9参照）  │
│  ⑮ Claude Code GitHub Action（@claudeで自動実装/レビュー）│
└───────────────────────────────────────────┘
```

（⑧は「このプロジェクト特有の注意点」章。スキル一覧ではないため番号のみ欠番）

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

PRを出すたびに、ESLintでコーディング規約（jQuery1.11／ECMAScript5準拠）を自動チェックする仕組みを追加した。

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

**実際に助けられたケース**: 機能追加を続ける中で、ブランチを切り忘れて`master`上で直接ファイルを編集してしまったことがあった。`git push`しようとする前に`git status`で気づき、以下の手順で復旧した。

```
① master上で編集してしまった（まだコミット前）
② git checkout -b feature/xxx  ← 今の変更を持ったまま新しいブランチを作成
③ git add・commit はこの新しいブランチ上で行う
④ 通常通りpush → PR → マージ
```

`git checkout -b`は今の作業内容（コミット前の変更）を保持したままブランチを切り替えられるため、「うっかりmasterで作業してしまった」ことに気づいた時点でこの手順を踏めば、変更を失わずに正規のフローへ戻せる。ブランチ保護ルールが「pushする前」ではなく「pushする時」に発動する仕組みだと理解していたからこそ、慌てずに対処できた。

## 10. マージコンフリクトの解消

わざと同じ行を書き換える2つのブランチ（`demo/conflict-a`・`demo/conflict-b`）をmasterの同じコミットから作成し、実際にコンフリクトを起こして解消する練習をした。

**手順**:
1. masterの同じコミットから`demo/conflict-a`・`demo/conflict-b`を作成
2. 両ブランチで、本ドキュメントの同じ行（学んだことリストの末尾）をそれぞれ別の内容で編集してコミット
3. `demo/conflict-a`を先にpush → PR (`#7`) 作成 → CI pass → マージ。masterが更新される
4. `demo/conflict-b`をpush → PR (`#8`) 作成 → `gh pr view --json mergeable`で`"mergeable":"CONFLICTING"`を確認。GitHub上でも「マージ不可」と表示される
5. ローカルの`demo/conflict-b`で`git fetch origin` → `git merge origin/master`を実行し、実際にコンフリクトを発生させる:
   ```
   <<<<<<< HEAD
   │  ⑧ マージコンフリクトの解消                       │
   =======
   │  ⑧ ブランチ保護ルールで直接pushを禁止              │
   >>>>>>> origin/master
   ```
6. `<<<<<<<`〜`=======`〜`>>>>>>>`のマーカーを手で削除し、両方の変更を活かす形（⑧⑨に分けて両方残す）に編集
7. `git add` → マージコミットを`git commit`（メッセージ引数なしでマージ用の既定メッセージを使用）→ push
8. `gh pr view --json mergeable`が`"mergeable":"MERGEABLE"`に変化したことを確認し、PRをマージ

**学び**:
- コンフリクトは「他人と衝突したとき」だけでなく、**先にマージされた変更と自分のブランチが同じ箇所を触っていれば、ソロ開発でも普通に起きる**
- `<<<<<<< HEAD`（自分の変更）と`>>>>>>> origin/master`（取り込もうとした変更）の間にある`=======`が境界線。どちらか一方を選ぶだけでなく、両方の意図を汲んで書き直してよい
- `gh pr view --json mergeable`でPRが今マージ可能な状態かどうかをコマンドラインから確認できる

**作成したPR**: https://github.com/yoyuta/web-system-gakushu/pull/7 、 https://github.com/yoyuta/web-system-gakushu/pull/8

**補足: 修正した行数・場所が違えばコンフリクトにならない？**

判断基準は「行番号」ではなく「変更箇所（前後の文脈を含む差分のかたまり＝hunk）が重なっているかどうか」。Gitの3-way mergeは、両ブランチの変更箇所が重なっていなければ、行数や合計の変更量が違っていても自動的に両方を取り込む（コンフリクトにならない）。

```
ケース1: 離れた行を編集 → 自動マージ成功
  A: 3行目を編集         B: 5行目を編集
       └── 重なっていないので両方そのまま取り込める

ケース2: 同じ行/隣接する行を編集 → コンフリクト
  A: 2行目を編集         B: 2行目を編集
       └── 同じ場所なので <<<<<<< が発生
```

- 「同じ行」でなくても、diffの文脈（デフォルト前後3行）が重なっていればコンフリクトになることがある
- 片方が「編集」、もう片方が同じ行を「削除」した場合はmodify/deleteという別種のコンフリクトになる
- 今回`demo/conflict-a`・`demo/conflict-b`で**あえて全く同じ行**を編集したのは、確実にコンフリクトを再現するための意図的な設定だった

## 11. Issueによるタスク管理

機能追加をいきなり実装から始めるのではなく、GitHub Issueとして起票してから着手する流れを練習した。

**手順**:
1. `gh issue create --title "..." --body "..."` で機能要望を起票（背景・やりたいこと・完了条件を書く）
2. `git checkout -b feature/xxx` で対応ブランチを作成し実装
3. PR本文の先頭に`closes #10`のようにIssue番号を書いてPR作成（`closes`/`fixes`/`resolves`のいずれかのキーワード＋`#番号`でGitHubがリンクを認識する）
4. PRをマージすると、紐付けたIssueが**自動でクローズ**される
5. `gh issue view 10 --json state,closedAt`でクローズを確認

**実践した題材**: 「未購入件数をヘッダーに表示する」（Issue #10 → PR #11）。`renderList()`内で未購入アイテム数を数え直し、`#remainingCount`に反映する小さな機能追加。

**学び**:
- Issueは「やることリスト」であると同時に、「なぜその変更をしたか」をPRやコミットから遡って追える記録にもなる
- `closes #番号`はコミットメッセージに書いても効くが、PR本文に書いておくのが確実（複数コミットにまたがる変更でも1回書けば済む）
- ソロ開発でもIssueを起票してから着手する習慣を持つと、後から「これは何のための変更だったか」を思い出しやすい

**作成したIssue/PR**: https://github.com/yoyuta/web-system-gakushu/issues/10 、 https://github.com/yoyuta/web-system-gakushu/pull/11

**補足: Claude CodeにIssueの内容を読み取らせてそのまま実装させることは可能か**

可能。やり方は大きく2通りある。

```
① 手動で指示する方法（Issue #10で実践済み）
     gh issue view <番号>
        ↓ Issueの本文（背景・やりたいこと・完了条件）を読み取る
     ブランチ作成 → 内容通りに実装 → PR作成（closes #番号）

② GitHub Actions経由で自動化する方法（未導入・発展学習）
     Issueに@claudeとコメント／特定ラベルを付与
        ↓
     Claude Code GitHub ActionがIssueの内容を読み取り、
     自動でブランチ作成〜実装〜PR作成まで無人で行う
```

- ①は`gh issue view`でIssue本文を読み取れるため、「Issue #番号の内容で実装して」と指示するだけで背景・完了条件まで汲み取って実装できる
- ②はAnthropic提供の「Claude Code GitHub Action」を`.github/workflows/`に追加すると使える、より発展的な自動化。今のリポジトリには未導入

## 12. ブランチ戦略（GitHub Flow と Git Flow）

`master`と`feature/xxx`だけで運用してきたこのプロジェクトの方式（GitHub Flow）と、`develop`ブランチを使う伝統的な方式（Git Flow）の違いを整理した。実際にブランチは作らず、概念として学習した。

```
【GitHub Flow】（このプロジェクトで実際に使っている方式）

  master ──●──●──●──●──●──●──▶   常に「本番」= 常に「最新」
            │  │  │  │  │  │        push毎にPages自動デプロイ
            └feature └feature ...   マージ＝即リリース

【Git Flow】（develop等を使う伝統的な方式）

  master  ──●─────────────●───────▶  リリース済みの安定版のみ
             │  release   │
  develop ───●──●──●──●───●──●─────▶  開発中の最新（まだ未リリース）
              │  │      │
              feature  feature ...
```

**GitHub Flow（このプロジェクトの方式）**:
- ブランチは`master`と`feature/xxx`だけ
- `master`＝「本番」であり「開発の最新」でもある（1つのブランチが2役）
- マージ＝そのままGitHub Pagesに自動デプロイ（6. 7.で構築済みの仕組み）
- 前提：小さく作って、こまめにリリースし続ける（継続的デプロイ向き）

**Git Flow（develop / release / hotfix を追加する方式）**:

| ブランチ | 役割 |
|---|---|
| `master`（`main`） | リリース済みの安定版のみ。常にデプロイ可能だが、頻繁には更新しない |
| `develop` | 開発中の最新。featureはここにマージする（masterには直接入らない） |
| `feature/xxx` | 個別機能。`develop`から切って`develop`へマージ |
| `release/x.x` | リリース準備用。develop→releaseでバグ修正のみ行い、完了したらmasterとdevelop両方へマージ |
| `hotfix/xxx` | 本番の緊急バグ修正用。masterから切ってmasterとdevelopへマージ |

**構造図（役割の全体像）**:

```
┌───────────────────────────────────────────────────────────┐
│                                                             │
│   feature/login ──┐                                        │
│   feature/cart  ──┼──▶ develop ──▶ release/1.0 ──▶ master  │
│   feature/search──┘        ▲              │                │
│                             └──────────────┘                │
│                       （バグ修正はdevelopにも反映）           │
└───────────────────────────────────────────────────────────┘
```

**時系列で見た実際の流れ（v1.0リリースの例）**:

```
  master   ─────────────────────────────────●(v1.0タグ)──▶
                                             ▲
  release/1.0          ┌────●──●(バグ修正)───┘
                        │                └──────┐
  develop  ──●──●──●────┴───●──●──●──●──●──●──●──●──▶
              │  │              │
              │  │              └feature/search ──┘
              │  └feature/cart ─────┘
              └feature/login ───────┘

  ① feature/login・feature/cart を develop にマージ
  ② そろそろリリース → develop から release/1.0 を切る
  ③ release/1.0 上でバグ修正のみ実施（新機能は追加しない）
  ④ release/1.0 を master にマージ＋タグ付け（v1.0として公開）
  ⑤ release/1.0 の修正を develop にも取り込む（developが後追いにならないように）
  ⑥ release/1.0 は役目を終えたら削除
  ⑦ develop では次の feature/search などの開発が並行して続いている
```

**このプロジェクト（GitHub Flow）との対比**:

```
  GitHub Flow:  feature ──▶ master ──▶ 自動デプロイ（今すぐ本番へ）
  Git Flow:     feature ──▶ develop ──▶ release ──▶ master ──▶ タグでリリース
                             （開発の最新）  （安定化）  （本番のみ）
```

**「develop本数を増やす」ではなく「releaseを都度切る」が正解**:
リリース時期が複数ある場合、develop自体を複製する（develop1, develop2…）のではなく、developから`release/x.x`を都度切り出す。develop はあくまで1本だけを保つのがGit Flowの前提。逆に「リリース後も長期間、旧バージョンのバグ修正を続ける」ような場合は、developとは別に`1.x`のような長命の保守ブランチをmasterの先にぶら下げる、という別パターンで対応する。

**使い分けの判断基準**:
- **継続的デプロイ**（pushすればすぐ公開したい）→ GitHub Flowが向く。develop分岐があると「developには入ったがmasterにはまだ」という**ズレた状態**が生まれ、CDの仕組みと相性が悪い
- **バージョンを区切ってリリース**（例: 月1回のリリース、複数バージョンを並行サポート）→ Git Flowが向く。「開発中のもの」と「今世に出ているもの」を明確に分けられる

**学び**: このリポジトリはGitHub Pagesへの自動デプロイを組んでいるため、実はGit Flow向きの構成ではない。ブランチ戦略は「かっこいいから採用する」ものではなく、リリース頻度やCD構成に合わせて選ぶもの、という判断軸を持てた。

**補足: develop/featureという名前自体に機能的な違いはあるか**

ない。Gitにとって`master`も`develop`も`feature/xxx`も、すべて「特定のコミットを指すポインタ」という点で完全に同じであり、Git自体は名前に特別な意味を持たせていない。

```
Gitから見た場合（すべて同じ「ブランチ」というポインタ）

  master ●   develop ●   feature/xxx ●   release/1.0 ●
   └──────────┴──────────┴──────────────┴─────────────┘
        Gitにとってはどれも「特定のコミットを指す名前」でしかない
```

実際に挙動の違いが生まれるのは、名前に基づいて**外側のツールが**ルールを設定しているから。

| 何が | どこで設定 | このプロジェクトの例 |
|---|---|---|
| ブランチ保護ルール | GitHubのリポジトリ設定 | `master`にのみ保護ルールを設定（9章）。`develop`があっても自動では保護されない |
| CI/CDの発火条件 | `.github/workflows/*.yml`の`on.push.branches` | `ci.yml`/`deploy.yml`は`branches: [master]`と明記しているので`master`にしか反応しない |
| デフォルトブランチ | GitHubのリポジトリ設定 | `git clone`の既定チェックアウト先、PRの既定マージ先 |

`git flow`という拡張コマンド（`git flow feature start xxx`など）も、中身は普通の`git branch`/`checkout`/`merge`を自動実行しているだけの補助ツールであり、Git本体に「featureブランチ」という新概念を追加しているわけではない。

## 13. Releaseとタグ管理

「今のアプリの状態」に区切りをつけて`v1.0.0`として公開する練習をした。

**概念**:
- `git tag`：特定のコミットに名前を付ける機能。軽量タグ（コミットへの単なる目印）と注釈付きタグ（`git tag -a`。作成者・日時・メッセージを持つ、より正式な記録）の2種類がある
- セマンティックバージョニング（`vX.Y.Z`）：`X`=互換性のない変更、`Y`=後方互換な機能追加、`Z`=バグ修正、という意味付けの慣習
- GitHub Releases：タグに「リリースノート」（変更内容の説明文）を紐付けて公開する機能

**コマンド**:
```
gh release create v1.0.0 --title "v1.0.0 - 初回リリース" --target master --notes "..."
```
`git tag`を先に作らなくても、`gh release create`が指定コミット（`--target`）に対してタグを自動作成し、同時にGitHub Release（リリースノート付き）も作成してくれる。

**つまずいたポイント**: `gh release create`で作られたタグは**軽量タグ**だった（`git cat-file -t v1.0.0`が`commit`を返し、`tag`ではなかった）。リリースノートの本文はgitタグのメッセージではなく、GitHub Release側のメタデータとして別に保存されている。`git tag -a`でローカルから作る場合と挙動が違う点に注意。

**ローカルへの反映**: `git fetch --tags`でリモートのタグをローカルに取り込める。

**学び**:
- タグは「コミットに名前を付ける」だけのシンプルな仕組みだが、GitHub Releaseと組み合わせることで「このバージョンで何ができるか」を後から追える記録になる
- `gh release create`はタグ作成とリリース公開を1コマンドで済ませられるので、ローカルで先にタグを打つ必要はない

**作成したRelease**: https://github.com/yoyuta/web-system-gakushu/releases/tag/v1.0.0

**続けて実践: パッチリリース（v1.0.1）**

v1.0.0公開後に見つけたバグ（数量欄でEnterキーを押しても追加されない）を、Issue起票からリリースまで通しで実践した。

```
Issue #17 起票（バグ報告）
     │
     ▼
fix/quantity-enter-key ブランチで修正
     │
     ▼
PR #18（closes #17）→ CI pass → マージ → Issue自動クローズ
     │
     ▼
gh release create v1.0.1 --notes "..."
     │
     ▼
v1.0.0 → v1.0.1（バグ修正のみなので Z を+1）
```

- 新機能ではなく**バグ修正のみ**なので、セマンティックバージョニングに従い`v1.0.0`→`v1.0.1`（パッチ）とした
- リリースノートに`https://github.com/.../compare/v1.0.0...v1.0.1`という比較リンクを入れると、2バージョン間の差分をGitHub上でそのまま確認できる
- 「Issueで管理する（11章）」「PRでマージする（4章）」「リリースする（本章）」が、実際には1本のつながった流れであることを体感できた

**作成したIssue/PR/Release**: https://github.com/yoyuta/web-system-gakushu/issues/17 、 https://github.com/yoyuta/web-system-gakushu/pull/18 、 https://github.com/yoyuta/web-system-gakushu/releases/tag/v1.0.1

**続けて実践: マイナーリリース（v1.1.0）とパッチリリース（v1.1.1）**

複数のPR（編集機能・保留機能・購入件数表示・ドラッグ&ドロップ）を積み重ねた後、区切りとして`v1.1.0`をリリース。新機能の追加なのでセマンティックバージョニングに従い`Y`を+1（`v1.0.1`→`v1.1.0`、`Z`は0に戻る）。その後に行ったUI微調整（レイアウト変更のみ、機能追加なし）は`v1.1.1`としてパッチリリースした。

- **リリースすべきタイミングの見極め方**: `git log v1.1.0..master --oneline`のように「タグ..ブランチ」の範囲指定でコミットを見ると、直近のリリース以降にどんな変更が積み上がっているかを確認できる。「そろそろ区切りをつけていいか」の判断材料になる
- **既存のリリース一覧の確認**: `gh release list`で、これまで作成したReleaseとその最新版（`Latest`ラベル）を一覧できる
- 機能追加は`Y`、UI調整やバグ修正のみなら`Z`、という判断を実際に2回繰り返して体に馴染ませた

**作成したRelease**: https://github.com/yoyuta/web-system-gakushu/releases/tag/v1.1.0 、 https://github.com/yoyuta/web-system-gakushu/releases/tag/v1.1.1

## 14. CIへのテスト組み込み

**CIとは**: 「Continuous Integration（継続的インテグレーション）」の略。複数人・複数ブランチで書いたコードを1つ（例: master）にまとめる「Integration（統合）」を、都度・自動で行うのが「Continuous（継続的）」の意味。要は「コードの変更をmasterに統合するたびに、自動でビルド・テスト・構文チェックなどを実行する仕組み」のこと。このプロジェクトでは`.github/workflows/ci.yml`がそれにあたり、PRを出すたびにGitHub Actions上で`lint`（ESLint）と`test`（Jest）が自動実行される。対になる用語として**CD**（Continuous Delivery/Deployment、継続的デリバリー/デプロイ）もあり、こちらは「統合が終わったコードを自動で本番環境に届ける・公開する」仕組みを指す（このプロジェクトでは`deploy.yml`がGitHub Pagesへの自動デプロイを担当。6章参照）。

**CI/CDとGitHub Actionsの関係**:

```
┌────────────────────────────────────────────┐
│  GitHub Actions（自動化を実行するプラットフォーム）│
│                                              │
│   ┌──────────┐   ┌──────────┐   ┌────────┐ │
│   │   CI     │   │   CD     │   │ その他  │ │
│   │ ci.yml   │   │deploy.yml│   │claude.yml│ │
│   │(lint/test)│  │(Pages公開)│   │(@claude)│ │
│   └──────────┘   └──────────┘   └────────┘ │
│                                              │
│   ↑ CI/CDは「目的」の名前                     │
│   ↑ GitHub Actionsは「それを実行する仕組み」の名前│
└────────────────────────────────────────────┘
```

| | CI | CD | GitHub Actions |
|---|---|---|---|
| 種類 | 目的（概念） | 目的（概念） | 手段（基盤・プラットフォーム） |
| 目的 | 変更が既存コードと問題なく統合できるか確認 | 統合済みのコードを実際に届ける・公開する | GitHub上でイベント（push/PR/Issue等）をきっかけに自動処理を実行する仕組み全般 |
| このリポジトリでの実装 | `.github/workflows/ci.yml` | `.github/workflows/deploy.yml` | `ci.yml`・`deploy.yml`・`claude.yml`・`claude-code-review.yml` は**すべて**GitHub Actions上で動くワークフロー |
| 対応する概念 | CIはGitHub Actionsで実現される用途の1つ | CDも同様にGitHub Actionsで実現される用途の1つ | CI/CD以外も実行できる（例: 15章の`@claude`自動応答は、CIでもCDでもない別用途） |
| 失敗したら | マージをブロック（ブランチ保護ルール） | そもそもCIが通らないと動かない | ワークフロー自体が動かない・エラーで停止する |

**ポイント**: CI/CDは「何のためにやるか」という目的の名前、GitHub Actionsは「GitHub上でそれをどう自動実行するか」という仕組みの名前。CIでもCDでもない自動化（15章のClaude Code GitHub Action）もGitHub Actions上で動いている。

これまでのCIはESLintによる構文チェックのみだった。ロジックが実際に正しく動くかは手動のブラウザ確認頼みだったため、Jestによる自動テストを追加した。**テストの書き方そのもの（Jest環境構築・テストケースの中身）はGitHub固有の話ではないため`Step9_自動テスト.md`にまとめており、本章はそれをGitHubの仕組みに統合した部分だけを扱う。**

**GitHubに関わる構成**:

| ファイル | 役割 |
|---|---|
| `.github/workflows/ci.yml` | `lint`ジョブに加えて`test`ジョブ（`npm test`）を追加 |
| `.eslintrc.json` | `globals`に`module`を追加（Step9で追加したNode向けエクスポート分岐コードを、ES5構文チェックの対象として許可するため） |

**つまずいたポイント**: PRを作成した直後、CIのlint/testジョブが6分以上`queued`のまま進まなかった。`gh api .../actions/runs/<ID>`で`status: "queued"`を確認し、GitHub Actions側のランナー割り当て待ちと判断してそのまま待機。最終的には正常に完了した（実行時間自体は14〜18秒）。CIが固まったように見えても、まず「キュー待ちか、実際に失敗しているか」を切り分けることを学んだ。

**ブランチ保護ルールの更新**: 新しく追加した`test`ジョブも、9章で設定した必須ステータスチェックに追加した（`["lint"]` → `["lint", "test"]`）。CIにチェックを追加しただけでは自動的に必須化されないため、この更新を忘れると`test`が落ちていてもマージできてしまう。

**作成したIssue/PR**: https://github.com/yoyuta/web-system-gakushu/issues/32 、 https://github.com/yoyuta/web-system-gakushu/pull/33

## 15. Claude Code GitHub Action

Issueやコメントで`@claude`とメンションすると、Claude Codeが自動でブランチ作成〜実装〜PR作成まで無人で行う仕組み。あわせて、PR作成時に自動でコードレビューを行う仕組みも導入した。11章の補足で「未導入・発展学習」としていたものを実際に導入した記録。

**導入方法**:

```
cd "Webシステム学習"
claude
```
セッション内で以下を実行するだけで、GitHub Appのインストール〜ワークフロー追加〜Secrets設定までを対話形式で一括セットアップしてくれる。

```
/install-github-app
```

**このコマンドが自動で行うこと**:

| 内容 | 詳細 |
|---|---|
| ワークフロー追加 | `.github/workflows/claude.yml`（`@claude`メンションへの自動応答）と`.github/workflows/claude-code-review.yml`（PR作成時の自動レビュー）を新しいブランチにpush |
| 認証方式 | GitHub SecretsにOAuthトークン（`CLAUDE_CODE_OAUTH_TOKEN`）を登録。`ANTHROPIC_API_KEY`を直接使う方式ではない |
| 使用アクション | `anthropics/claude-code-action@v1` |

その後は通常通り、生成されたブランチから`gh pr create`でPRを作成し、CIを確認してマージする（4〜5章と同じ流れ）。

**つまずいたポイント①: `gh`コマンドが見つからない**

```
Error: Failed to access repository yoyuta/web-system-gakushu:
Command 'gh' not found or is in an unsafe location (current directory)
```

`gh` CLI自体はインストール済み・PATHにも登録済みだったが、**VSCode（Claude Codeを動かしているプロセス）がPATH更新前から起動しっぱなし**だったため、子プロセスに新しいPATHが反映されていなかった。VSCodeを完全に再起動し、ターミナルで`gh --version`が通ることを確認してから再実行して解決した。

**つまずいたポイント②: GitHub App未インストールによる401エラー**

ワークフロー追加・Secrets設定は完了したが、PRを作成してCIを回すと`claude-review`ジョブだけが失敗した。

```
App token exchange failed: 401 Unauthorized -
Claude Code is not installed on this repository.
Please install the Claude Code GitHub App at https://github.com/apps/claude
```

`/install-github-app`はワークフローファイルの生成とSecrets登録までは自動で行うが、**GitHub App本体のインストール（ブラウザでの許可操作）は別途手動で必要**だった。`https://github.com/apps/claude`を開き、対象リポジトリを選んでインストールし、失敗したジョブを`gh run rerun <実行ID> --failed`で再実行したところpassした。

**動作確認**:

1. ワークフロー追加PR（[#37](https://github.com/yoyuta/web-system-gakushu/pull/37)）で`claude-review`ジョブが実際に走り、pass（このPR自体はYAML追加のみでレビュー指摘事項がなかったため、コメントなしの「サイレント合格」だった）
2. マージ後、動作確認用に`@claude このリポジトリの目的を1文で説明してください`とだけ書いたテストIssue（[#38](https://github.com/yoyuta/web-system-gakushu/issues/38)）を作成
3. `claude`という名前のbotアカウントが自動でコメント返信し、リポジトリの内容を正しく要約して回答
4. 動作確認できたのでIssueをクローズ

**学び**:
- `/install-github-app`は便利だが「ワークフロー追加」「Secrets設定」「App本体のインストール」のうち、ブラウザでの同意が必要なApp本体のインストールだけは自動化されない（＝AIが代行できない領域）
- コマンドが「エラーなく完了したように見えても」、実際に動くかは別問題。ワークフローYAMLが追加されただけでは不十分で、PRやIssueで実際にトリガーしてログを見るまでが動作確認
- `gh run rerun <ID> --failed`で、原因を直してから失敗したジョブだけを再実行できる（PRを作り直す必要はない）
- セキュリティ面：`@claude`は現状誰でもメンション可能な設定（Publicリポジトリのため）。悪用防止には、ワークフロー側で投稿者を権限者に絞る条件分岐や、`claude_args: '--max-turns 5'`のような暴走防止設定を追加する余地がある（未設定・今後の課題）

**補足①: なぜCI/CDはApp未インストールでも動いていたのか**

`ci.yml`/`deploy.yml`は5〜6章の時点からずっと問題なく動いていたのに、今回`claude-review`ジョブだけが401エラーで失敗した。理由は認証の仕組みが違うため。

```
┌──────────────────────────────────────────────────┐
│  GitHub Actions基盤（全リポジトリで最初から有効）       │
│                                                    │
│  ci.yml / deploy.yml                              │
│    └ GitHubが自動発行する GITHUB_TOKEN だけで動く    │
│      （このリポジトリの中で完結する操作のみ）           │
│      → 追加インストール不要。5〜6章の時点で             │
│        既に動いていた                                │
│                                                    │
│  claude.yml / claude-code-review.yml               │
│    └ "claude" という別アカウント（Botアプリ）として     │
│      コメント投稿・PRレビューをする必要がある            │
│      → GITHUB_TOKENだけでは権限が足りず、              │
│        別途「Claude」GitHub Appのインストールと         │
│        OAuthトークン交換が必須                        │
└──────────────────────────────────────────────────┘
```

| | ci.yml / deploy.yml | claude.yml / claude-code-review.yml |
|---|---|---|
| 動作に必要な認証 | GitHubが自動で発行する`GITHUB_TOKEN`（リポジトリ内で完結） | 「Claude」という外部Botアカウントとしての認証（`CLAUDE_CODE_OAUTH_TOKEN`＋GitHub App） |
| App導入の要否 | 不要（GitHub Actions自体は全リポジトリ標準機能） | 必要（`https://github.com/apps/claude`のインストール） |

**補足②: 「GitHub Actions」と「Claude Code GitHub Action」の違い**

似た名前だが階層が違う。「GitHub Actions」は土台（プラットフォーム）、「Claude Code GitHub Action」（`anthropics/claude-code-action`）はその上で動く1つの部品（既製アクション）。

```
┌───────────────────────────────────────────────────┐
│ GitHub Actions（GitHubの標準機能＝土台）                │
│  「何かが起きたら(push/PR/Issueコメント等)、             │
│    自動で処理を実行する」という仕組みそのもの              │
│  → リポジトリ作成時から誰でも使える。追加インストール不要   │
│                                                     │
│  この土台の上で「ワークフロー(.ymlファイル)」を書く。      │
│  ワークフローの中身は「ステップ」の積み重ねで、             │
│  各ステップは既製の部品（= アクション）を呼び出せる。       │
│                                                     │
│   ┌─────────────┐  ┌─────────────────────┐      │
│   │ 自作の処理      │  │ 既製の「アクション」部品   │      │
│   │ npm ci          │  │ actions/checkout@v4    │      │
│   │ npx eslint      │  │ anthropics/            │      │
│   │ npm test        │  │  claude-code-action@v1 │ ←ここ│
│   └─────────────┘  └─────────────────────┘      │
└───────────────────────────────────────────────────┘
```

「GitHub Actions」＝家全体の電気配線・コンセント（インフラ）、「Claude Code GitHub Action」＝そのコンセントに挿す特定の家電の1つ（Anthropicが作った既製品）。同じ「Action(s)」という単語が土台の名前にも部品の名前にも使われているのが紛らわしさの正体。

| 時期 | 追加したもの | 使った部品 | GitHub App必要？ |
|---|---|---|---|
| 5章 | `ci.yml`（ESLintチェック） | `actions/checkout` など汎用部品 | 不要（`GITHUB_TOKEN`で完結） |
| 6章 | `deploy.yml`（Pages自動公開） | `actions/deploy-pages` など汎用部品 | 不要（同上） |
| 14章 | `ci.yml`にtestジョブ追加 | 同上＋Jest | 不要（同上） |
| 15章（本章） | `claude.yml`/`claude-code-review.yml` | `anthropics/claude-code-action` | 必要（`github.com/apps/claude`） |

土台（GitHub Actions）自体は最初からずっと同じもので、変わっていない。変わったのは「そこにどんな部品を挿したか」。5〜14章までは自分たちのリポジトリの中だけで完結する汎用部品しか使っていなかったのに対し、今回は「`claude`という外部のBotアカウントとして振る舞う」特殊な部品を挿したため、その部品専用の許可（GitHub Appインストール）が別途必要になった。

**導入した目的（3つ目の自動化として）**:
- CI: コードが壊れていないか自動チェック
- CD: 公開まで自動化
- **Claude Code GitHub Action: 実装作業そのもの・レビューそのものを自動化**（Issueに`@claude`と書くだけで実装〜PR作成、PR作成時に自動レビュー）

これまでは「書いたコードのチェックと公開」を自動化していたが、今回は「コードを書く／レビューする」という工程自体を自動化する部品を、GitHub Actionsという同じ土台の上に追加した、という位置づけ。

**作成したPR/Issue**: https://github.com/yoyuta/web-system-gakushu/pull/37 、 https://github.com/yoyuta/web-system-gakushu/issues/38

## チェックポイント

- [x] `git status`/`git diff`で変更内容を確認してからコミットできる
- [x] GitHubアカウント作成〜`gh` CLIでの認証〜リモートリポジトリ作成ができる
- [x] ブランチを切って機能開発し、masterにマージできる
- [x] PRを作成し、レビューを経てマージ〜ブランチ削除まで一通り行える
- [x] GitHub Actionsで自動チェック（CI）が動く仕組みを作り、実際にpass/failを確認できる
- [x] GitHub Pagesで自動デプロイ（CD）が動く仕組みを作り、実機（スマホ）から公開URLにアクセスできる
- [x] CI/CDが揃った状態で、新機能追加→PR→マージ→自動反映のサイクルを繰り返し実行できる
- [x] ブランチ保護ルールを設定し、masterへの直接pushがGitHub側で拒否されることを確認できる
- [x] 意図的にマージコンフリクトを発生させ、コンフリクトマーカーを読んで手動で解消できる
- [x] Issueを起票し、PRに`closes #番号`を書いてマージ時に自動クローズされることを確認できる
- [x] GitHub FlowとGit Flowの違いを説明でき、自分のプロジェクトがどちらに向いているか判断できる
- [x] `gh release create`でタグ付きのGitHub Releaseを作成し、公開できる
- [x] CIにtestジョブを追加し、ブランチ保護の必須チェックにも組み込める（テストの書き方自体はStep9参照）
- [x] `/install-github-app`でClaude Code GitHub Actionを導入し、GitHub Appのインストールまで含めて`@claude`メンションへの自動応答・PRの自動レビューが動くことを確認できる
