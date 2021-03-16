export enum MatchMode {
  /**
   * クエリ文字列がパターン文字列に完全一致する状態を「曖昧度0で一致」とする
   * デフォルトの設定
   */
  Exact = 0,
  /**
   * クエリ文字列の一部にパターン文字列が含まれている状態を「曖昧度0で一致」とする
   */
  Include,
  /**
   * 半角スペースをワイルドカードとして扱う
   * オリジナルの asearch の挙動
   */
  WildcardSpace,
}

export class Asearch {
  /**
   * Asearch で扱えるパターン文字列の最大長
   * << と >>> が扱える最大のビット長 - 1
   * (受理状態を表すために 1 小さくしている)
   */
  static MAXLENGTH = 31;
  /**
   * どのように比較するかを表すモード
   * 再設定はできないので変更したい場合はインスタンスを作る
   */
  readonly matchMode: MatchMode;
  /**
   * 検索したい文字列（パターン）
   * 再設定はできないのでパターンごとにインスタンスを作る
   */
  readonly pattern: string;
  /**
   * 受理状態のビットマスク
   */
  private acceptPattern: number;
  /**
   * 状態遷移機械の初期状態を表す数値
   * 最も左のビットが 1 で他は 0 の Unsigned int
   */
  private initPattern: number;
  /**
   * 状態遷移機械をループさせるためのビットマスク。
   * MatchMode.Include では、
   * 最初の一文字目で常にループさせつつ、
   * 一度受理状態になったらそれをループさせる。
   * MatchMode.Wildcard では、
   * ワイルドカードの位置でループさせる。
   */
  private loopMask = 0;
  /**
   * パターン文字列の出現位置を表すビットマスク
   */
  masks: { [char: string]: number } = {};

  constructor(pattern: string, mode = MatchMode.Exact) {
    // パターン文字列が長すぎる場合は例外を投げる
    if (pattern.length > Asearch.MAXLENGTH) {
      const len = Asearch.MAXLENGTH + 1;
      const mes = `Pattern must be shorter than ${len} chars. But given ${pattern}`;
      throw new Error(mes);
    }

    this.matchMode = mode;
    this.pattern = pattern;
    const splitted = Array.from(pattern); // 絵文字に対応した文字列分割
    const leftBit = 1 << Asearch.MAXLENGTH; // 1000...000
    this.initPattern = leftBit >>> 0; // >>> 0 で Unsigned int として扱う
    this.acceptPattern = leftBit >>> splitted.length; // 受理状態を表すビットマスク

    if (mode === MatchMode.Include) {
      // 部分一致の場合は最初と最後のノードをループさせる
      this.loopMask = this.initPattern | this.acceptPattern;
    }

    /**
     * パターン文字列の文字の出現位置を表すビットマスクを作る
     * e.g. pattern === "hello"
     * {
     *    "h": 10000000...0000,
     *    "e": 01000000...0000,
     *    "l": 00110000...0000,
     *    "o": 00001000...0000,
     * }
     */
    let mask = 0;
    for (const c of splitted) {
      // 半角スペースを特別にワイルドカードとして扱う
      if (mode === MatchMode.WildcardSpace && c === ' ') {
        this.loopMask |= leftBit >>> mask; // この位置でノードをループさせる
        this.acceptPattern <<= 1; // 受理状態がひとつ前のノードに移る
        // ワイルドカードは空文字(ε)でも次に遷移するので、ここではノードを作らない
        continue;
      }

      // そのまま、小文字、大文字の最大 3 パターンを同じ文字として扱う
      for (const key of [c, c.toLocaleLowerCase(), c.toUpperCase()]) {
        this.masks[key] ??= 0; // 初期化
        this.masks[key] |= leftBit >>> mask;
      }
      mask++;
    }
  }

  /**
   * 任意のクエリ文字列とパターン文字列を比較する。曖昧度を指定できる
   * @param query 検索文字列
   * @param ambig 曖昧度 := パターン文字列とのレーベンシュタイン距離
   */
  match(query: string, ambig = 0) {
    /**
     * 状態遷移機械を初期化する
     * 初期状態から ε で進める状態に進んでおく
     * e.g. ambig=2
     * 2: 0010...
     * 1: 0100...
     * 0: 1000...
     */
    const states = Array.from({ length: ambig + 1 }).map((_, index) => {
      return this.initPattern >>> index;
    });
    this.verbose(states);

    for (const char of query) {
      const mask = this.masks[char] ?? 0; // 検索文字列がパターン文字列のどこに含まれているかのマスク
      for (let index = states.length - 1; index > 0; index--) {
        states[index] =
          (states[index] & this.loopMask) | // ループする(状態を保持する)
          ((states[index] & mask) >>> 1) | // 入力文字と一致→(右に進む)
          (states[index - 1] >>> 1) | // 間違えた文字を許容↗︎*(右上に進む)
          states[index - 1]; // 余計な文字を許容↑*(上に進む)
      }
      states[0] = ((states[0] & mask) >>> 1) | (states[0] & this.loopMask); // 曖昧度 0 の状態機械の文字一致→(右に進む)とループ
      for (let index = 1; index < states.length; index++) {
        states[index] |= states[index - 1] >>> 1; // 足りない文字を許容↗︎ε(右上に進む)
      }
      this.verbose(states, char);
    }

    // 曖昧度=ambig で一致しているか判定
    return Boolean(states[ambig] & this.acceptPattern);
  }

  private verbose(states: number[], target?: string) {
    if (process.env.ASEARCH_VERBOSE) {
      const chars = Array.from(this.pattern).map((s) =>
        s.charCodeAt(0) > 0xff ? s : s + ' '
      );
      console.log(target);

      console.log(`ambi  ${chars.join(' ')}`);
      for (let index = states.length - 1; index >= 0; index--) {
        const state = states[index];
        const bins = (state >>> 1)
          .toString(2)
          .padStart(32, '0')
          .slice(1, chars.length + 1)
          .split('');
        console.log(`   ${index}  ${bins.join('  ')}`);
      }
      console.log('');
    }
  }
}
