import test from 'ava';
import { Asearch, MatchMode } from './index';

test.before(() => {
  process.env.ASEARCH_VERBOSE = '1';
});

test('pattern "abcde"', (t) => {
  const a = new Asearch('abcde');

  t.is(a.pattern, 'abcde', 'should have property "pattern"');

  t.true(a.match('abcde'), 'should match "abcde"');
  t.true(a.match('aBCDe'), 'should match "aBCDe"');
  t.true(a.match('abXcde', 1), 'should match ("abXcde",1)');
  t.true(a.match('ab?de', 1), 'should match ("ab?de",1)');
  t.true(a.match('abde', 1), 'should match ("abde",1)');
  t.true(a.match('abXXde', 2), 'should match (abXXde,2)');
  t.false(a.match('abXcde'), 'should not match "abXcde"');
  t.false(a.match('ab?de'), 'should not match "ab?de"');
  t.false(a.match('abde'), 'should not match "abde"');
  t.false(a.match('abXXde', 1), 'should not match ("abXXde",1)');

  t.true(a.match('abcde'), 'should match "abcde"');
  t.true(a.match('abcde', 1), 'should match ("abcde",1)');
  t.false(a.match('abcd'), 'should not match "abcd"');
  t.true(a.match('abcd', 1), 'should match ("abcd",1)');
});

test('pattern "ab de" with wildcard mode', (t) => {
  const a = new Asearch('ab de', MatchMode.WildcardSpace);

  t.true(a.match('abcde'), 'should match ("abcde")');
  t.true(a.match('abccde'), 'should match ("abccde")');
  t.true(a.match('abXXXXXXXde'), 'should match ("abXXXXXXXde")');
  t.true(a.match('abcccccxe', 1), 'should match ("abcccccxe",1)');
  t.false(a.match('abcccccxe'), 'should not match "abcccccxe"');
});

test('pattern "漢字文字列"', (t) => {
  const a = new Asearch('漢字文字列');
  t.true(a.match('漢字文字列'), 'should match "漢字文字列"');
  t.false(a.match('漢字の文字列'), 'should not match "漢字の文字列"');
  t.true(a.match('漢字の文字列', 1), 'should match "漢字の文字列"');
  t.false(a.match('漢字文字'), 'should not match "漢字文字"');
  t.true(a.match('漢字文字', 1), 'should match ("漢字文字",1)');
  t.false(a.match('漢字文字烈'), 'should not match "漢字文字烈"');
  t.true(a.match('漢字文字烈', 1), 'should match ("漢字文字烈",1)');
  t.false(a.match('漢和辞典', 1), 'should not match ("漢和辞典",1)');
  t.false(a.match('漢和辞典', 2), 'should not match ("漢和辞典",2)');
  t.true(a.match('漢文列', 2), 'should match ("漢文列",2)');
});

test('pattern "猫である" with include mode', (t) => {
  const a = new Asearch('猫である', MatchMode.Include);
  t.true(a.match('吾輩は猫である。'), 'should match "吾輩は猫である。"');
  t.false(a.match('吾輩は猫ではない'), 'should not match "吾輩は猫ではない"');
  t.false(a.match('吾輩は狸である'), 'should not match "吾輩は狸である"');
  t.true(a.match('吾輩は狸である', 1), 'should match ("吾輩は狸である", 1)');
  t.true(a.match('猫であるからして'), 'should match "猫であるからして"');
});

test('First character', (t) => {
  const a = new Asearch('asearch');
  t.true(a.match('search', 1), 'Should match ("search", 1)');
});
