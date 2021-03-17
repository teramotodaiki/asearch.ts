# Asearch.ts

[![Test and Publish](https://github.com/teramotodaiki/asearch.ts/actions/workflows/test-and-publish.yml/badge.svg)](https://github.com/teramotodaiki/asearch.ts/actions/workflows/test-and-publish.yml)

このライブラリは [asearch-ruby](https://github.com/masui/asearch-ruby) と [node-asearch](https://github.com/shokai/node-asearch) を元に書かれた TypeScript 実装です。

ただし、筆者の意図により幾つか実装上の差異があります。


# Usage

```typescript
import { Asearch, MatchMode } from 'asearch.ts';

// "hello" と "helo" を比較する
const a = new Asearch("hello");
console.log(a.match("helo")); // false. デフォルトでは曖昧度 0
console.log(a.match("helo", 1)); // true. 曖昧度 1 で許容される
console.log(a.match("helo", 2)); // true. 曖昧度 2 でも許容される

// "猫である" が文中に含まれるか調べる
const b = new Asearch("猫である", MatchMode.Include);
console.log(b.match("吾輩は猫である。")); // true
```

`new Asearch(pattern: stirng, mode?: MatchMode): Asearch`

- インスタンスを生成する。

- pattern
  - パターン文字列
- mode
  - どのように比較を行うか
  - デフォルトは `MatchMode.Exact` の完全一致
  - `MatchMode.Include` にすると部分一致（クエリの中にパターンが含まれていれば良い）になる
  - `MatchMode.WildcardSpace` にするとパターン文字列の半角スペースがワイルドカードとして扱われる

`asearch.match(query: string, ambig?: number): boolean`

- クエリ文字列と一致しているか判定する。曖昧度を[レーベンシュタイン距離](https://ja.wikipedia.org/wiki/%E3%83%AC%E3%83%BC%E3%83%99%E3%83%B3%E3%82%B7%E3%83%A5%E3%82%BF%E3%82%A4%E3%83%B3%E8%B7%9D%E9%9B%A2)で指定できる。
- 言い換えれば、何文字まで間違えて良いかを指定できる。
- 与えられた曖昧度の中で一致していれば `true`、そうでなければ `false` を返す

- query
  - 比較対象となるクエリ文字列
- ambig
  - 曖昧度
  - 0 以上の整数でなければならない。デフォルトは 0

# オリジナルとの差異

## ワイルドカード文字をデフォルトで無効にしている

オリジナルのライブラリではパターン文字列中の半角スペース(` `)を「ワイルドカード」として扱っている。

> 検索パタン中の空白文字(0x20)はワイルドカードとなる。 (0文字以上のあらゆる文字の並びにマッチする。正規表現の".*"と同様。)
> http://www.pitecan.com/Index/asearch.html

この機能はデフォルトでオフになっているので、利用する場合は `MatchMode.WildcardSpace` を指定する。

部分一致をしたい場合は `MatchMode.Include` を使えば良い。

## 絵文字に対応している👌✨

文字列を `Array.from()` を使って分割することで絵文字に対応している。

## パターン文字列の文頭に余分な文字が挿入されている場合の挙動

`node-asearch` ではパターン文字列の先頭に余計な文字が挿入されている場合（言い換えれば、クエリ文字列の先頭が削除されている場合）に**曖昧度が通常よりも +1 される**。このライブラリでは先頭であっても同じように扱う。

サンプルコードを見る方が早い。

```javascript
const Asearch = require('asearch'); // node-asearch

const a = new Asearch("asearch");
console.log(1, a.match("search", 1)); // ここが false になる
console.log(2, a.match("search", 2)); // これは true になる
```
[sandbox](https://codesandbox.io/s/silly-mclaren-xguoi?file=/src/index.js)

これは状態遷移機械の初期状態から空文字(ε)で遷移できるノードに遷移する前に 1 文字目の比較をしているからだと思う。

このライブラリでは状態遷移機械の初期化時に空文字の遷移を行うことにした。

```typescript
import { Asearch } from 'asearch.ts'; // asearch.ts

const a = new Asearch("asearch");
console.log(1, a.match("search", 1)); // true
console.log(2, a.match("search", 2)); // true
```

## named export にしている

TypeScript だとその方が使いやすいのでそうしている。
