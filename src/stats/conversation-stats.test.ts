import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseConversation,
  computeStats,
  analyzeConversation,
} from './conversation-stats.js';

// The conversation-stats core is the no-LLM data path the whole feature rests
// on: the conversation is never stored, so these golden tests pin the parser +
// aggregation against representative export formats.

const ANDROID = [
  '1/1/24, 10:00 - Alice: Hey, how are you doing today?',
  '1/1/24, 10:01 - Bob: I am great thanks! How about you?',
  '1/1/24, 10:05 - Alice: Doing well! Did you watch the game last night?',
  '1/1/24, 10:06 - Bob: <Media omitted>',
  '2/1/24, 09:00 - Alice: Morning! Ready for today?',
].join('\n');

test('parses Android dash format and drops media placeholders', () => {
  const msgs = parseConversation(ANDROID);
  assert.equal(msgs.length, 4); // the <Media omitted> line is dropped
  assert.equal(msgs[0].sender, 'Alice');
  assert.equal(msgs[1].sender, 'Bob');
  assert.ok(msgs[0].date instanceof Date);
});

test('multi-line messages fold into the previous message', () => {
  const text = [
    '1/1/24, 10:00 - Alice: First line',
    'continuation line',
    '1/1/24, 10:01 - Bob: Reply',
  ].join('\n');
  const msgs = parseConversation(text);
  assert.equal(msgs.length, 2);
  assert.match(msgs[0].content, /continuation line/);
});

test('parses iOS bracketed format and skips system notices', () => {
  const text = [
    '[1/1/24, 10:00:00] Messages are end-to-end encrypted.',
    '[1/1/24, 10:00:05] Alice: Hello there',
    '[1/1/24, 10:01:00] Bob: Hi back',
  ].join('\n');
  const msgs = parseConversation(text);
  assert.equal(msgs.length, 2); // the encryption notice has no "Sender: "
  assert.equal(msgs[0].sender, 'Alice');
});

test('day-first vs month-first is resolved from a decisive component', () => {
  // "25/01" — 25 can only be a day, so the whole file is read day-first.
  const text = '25/01/2024, 10:00 - Alice: hi\n26/01/2024, 10:00 - Bob: yo';
  const msgs = parseConversation(text);
  assert.equal(msgs[0].date!.getUTCMonth(), 0); // January
  assert.equal(msgs[0].date!.getUTCDate(), 25);
});

test('computeStats produces per-participant counts, top words, and date range', () => {
  const stats = analyzeConversation(ANDROID);
  assert.equal(stats.totalMessages, 4);
  assert.equal(stats.participantCount, 2);
  const alice = stats.participants.find((p) => p.name === 'Alice')!;
  assert.equal(alice.messageCount, 3);
  assert.ok(alice.topWords.length > 0);
  assert.ok(stats.dateRange);
});

test('average response time is measured across speaker turns', () => {
  const stats = analyzeConversation(ANDROID);
  const bob = stats.participants.find((p) => p.name === 'Bob')!;
  // Bob replies to Alice once at 10:01 (1 min after 10:00).
  assert.equal(bob.avgResponseMinutes, 1);
});

test('messagesPerMonth buckets by calendar month per participant', () => {
  const stats = analyzeConversation(ANDROID);
  assert.deepEqual(stats.messagesPerMonth.months, ['January 2024']);
  assert.equal(stats.messagesPerMonth.series.length, 2);
});

test('red flags: one-sided + ghosting fire on lopsided, gappy chats', () => {
  const text = [
    '1/1/24, 10:00 - Alice: one',
    '1/1/24, 10:01 - Alice: two',
    '1/1/24, 10:02 - Alice: three',
    '1/1/24, 10:03 - Alice: four',
    '1/1/24, 10:04 - Alice: five',
    '3/1/24, 10:00 - Bob: finally',
  ].join('\n');
  const stats = analyzeConversation(text);
  assert.ok(stats.redFlags.some((f) => /row without a reply/.test(f)));
  assert.ok(stats.redFlags.some((f) => /One-sided/.test(f)));
  assert.ok(stats.redFlags.some((f) => /quiet for 24h/.test(f)));
});

test('empty input yields an empty, non-crashing result', () => {
  const stats = computeStats(parseConversation(''));
  assert.equal(stats.totalMessages, 0);
  assert.equal(stats.participantCount, 0);
  assert.equal(stats.dateRange, null);
});
