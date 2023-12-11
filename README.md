# Asearch.ts

[![Test and Publish](https://github.com/teramotodaiki/asearch.ts/actions/workflows/test-and-publish.yml/badge.svg)](https://github.com/teramotodaiki/asearch.ts/actions/workflows/test-and-publish.yml)

[日本語で読む](README-ja.md)

This library is a TypeScript implementation based on [asearch-ruby](https://github.com/masui/asearch-ruby) and [node-asearch](https://github.com/shokai/node-asearch).

However, there are some implementation differences due to the author's intentions.

# Usage

```typescript
import { Asearch, MatchMode } from "asearch.ts";

// Compare "hello" and "helo"
const a = new Asearch("hello");
console.log(a.match("helo")); // false. By default, ambiguity is 0
console.log(a.match("helo", 1)); // true. Allowed with ambiguity of 1
console.log(a.match("helo", 2)); // true. Also allowed with ambiguity of 2

// Check if "cat" is contained in the text
const b = new Asearch("cat", MatchMode.Include);
console.log(b.match("I am a cat")); // true
```

`new Asearch(pattern: string, mode?: MatchMode): Asearch`

- Creates an instance.

- pattern
  - Pattern string
- mode
  - How the comparison is done
  - The default is `MatchMode.Exact` for an exact match
  - Setting it to `MatchMode.Include` changes it to a partial match (it's enough if the pattern is contained in the query)
  - Setting it to `MatchMode.WildcardSpace` treats spaces in the pattern string as wildcards

`asearch.match(query: string, ambig?: number): boolean`

- Determines if the query string matches. Ambiguity can be specified using [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance).
- In other words, it specifies how many characters can be incorrect.
- Returns `true` if it matches within the given ambiguity, otherwise `false`.

- query
  - Query string for comparison
- ambig
  - Degree of ambiguity
  - Must be an integer of 0 or higher. The default is 0

# Differences from the Original

## Disabling Wildcard Characters by Default

In the original library, spaces (` `) in the pattern string are treated as "wildcards."

> Space characters (0x20) in the search pattern become wildcards. (Matches any sequence of characters, similar to ".\*" in regular expressions.)
> http://www.pitecan.com/Index/asearch.html

This feature is turned off by default, so if you want to use it, specify `MatchMode.WildcardSpace`.

If you want partial matches, use `MatchMode.Include`.

## Support for Emojis 👌✨

The library supports emojis by splitting the string using `Array.from()`.

## Behavior When Extra Characters are Inserted at the Beginning of the Pattern String

In `node-asearch`, if extra characters are inserted at the beginning of the pattern string (in other words, if the beginning of the query string is deleted), **the ambiguity is increased by +1 than usual**. This library treats the beginning in the same way.

It's faster to look at the sample code.

```javascript
const Asearch = require("asearch"); // node-asearch

const a = new Asearch("asearch");
console.log(1, a.match("search", 1)); // This becomes false
console.log(2, a.match("search", 2)); // This is true
```

[sandbox](https://codesandbox.io/s/silly-mclaren-xguoi?file=/src/index.js)

This is because the state transition machine compares the first character before transitioning to a node that can transition from the initial state with an empty string (ε).

In this library, we decided to perform an empty string transition at the initialization of the state transition machine.

```typescript
import { Asearch } from "asearch.ts"; // asearch.ts

const a = new Asearch("asearch");
console.log(1, a.match("search", 1)); // true
console.log(2, a.match("search", 2)); // true
```

## Using named export

It's easier to use in TypeScript, so we've made it a named export.
