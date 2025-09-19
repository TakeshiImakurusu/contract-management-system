# KENTEM 契約管理UI ワイヤーフレーム

React + Vite + Tailwind の簡易モックです。KENTEM ID → 製品ファミリ（デキスパート/INNOSiTE/クラウド）→ 契約詳細の3階層で閲覧できます。

## セットアップ

```bash
npm i
npm run dev
```

- http://localhost:5173 を開いてください。
- モックデータは `src/App.jsx` の `seedOrders` / `seedContracts` / `seedExtras` を編集してください。

## 主な画面

- **顧客(KENTEM ID)** タブ: KENTEM ID 一覧（契約数、ファミリ内訳、最短満了）→ 右ペインに KENTEM ID 詳細（ファミリ別の契約一覧）。
- **注文(受信) / 処理 / 確定**: 出荷日↑（同日は受信時刻↑）で並び替え。右ペインでワークフロー操作の疑似ボタンあり。
- 契約行の「詳細」: 契約詳細モーダル（明細・出力ボタン）。さらに「詳細情報」で請求/連絡先/SLA/添付/メモの拡張情報。

## 注意

- 本コードは UI ワイヤーフレーム目的のスタブです。API や DB 連携はダミーです。
- Tailwind は `index.css` に適用済みです。必要に応じてテーマやコンポーネントを拡張してください。
