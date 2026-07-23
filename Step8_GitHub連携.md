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
│  ⑨ ブランチ保護ルールで直接pushを禁止              │
│  ⑩ マージコンフリクトの解消                       │
│  ⑪ Issueによるタスク管理（closes連携）             │
│  ⑫ ブランチ戦略（GitHub Flow / Git Flow）           │
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
