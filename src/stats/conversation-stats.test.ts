import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeConversation, computeStats, parseConversation } from './conversation-stats.js';

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

test('response time excludes multi-day inter-session gaps (no absurd means)', () => {
  // Alice replies once within seconds, then again 14 days later. Only the
  // in-session reply should count — the 14-day gap is a new session, not a reply.
  const text = [
    '1/1/24, 10:00 - Bob: hello',
    '1/1/24, 10:02 - Alice: hi there',
    '15/1/24, 10:00 - Bob: you around?',
    '29/1/24, 10:00 - Alice: back now',
  ].join('\n');
  const stats = analyzeConversation(text);
  const alice = stats.participants.find((p) => p.name === 'Alice')!;
  // 2 min reply counted; the 14-day gap excluded → mean stays small, not ~20000.
  assert.equal(alice.avgResponseMinutes, 2);
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

test('messagesPerMonth is chronological even when the export is out of order', () => {
  // March appears before January in the file; the chart must still be ordered.
  const text = [
    '2/3/24, 10:00 - Alice: march message',
    '5/1/24, 10:00 - Bob: january message',
  ].join('\n');
  const stats = analyzeConversation(text);
  assert.deepEqual(stats.messagesPerMonth.months, ['January 2024', 'March 2024']);
});

test('calendar-invalid dates are rejected, not rolled over (Feb 31 != Mar 2)', () => {
  const text = ['31/2/24, 10:00 - Alice: impossible date', '1/3/24, 10:00 - Bob: real date'].join(
    '\n',
  );
  const stats = analyzeConversation(text);
  // Both messages count, but only Bob's parseable date drives the time stats.
  assert.equal(stats.totalMessages, 2);
  assert.equal(stats.datedMessages, 1);
  assert.deepEqual(stats.messagesPerMonth.months, ['March 2024']);
});

test('media placeholders drop only when they are the whole message', () => {
  const text = [
    '1/1/24, 10:00 - Alice: <Media omitted>',
    '1/1/24, 10:01 - Bob: look at this <Media omitted> reference inline',
    '1/1/24, 10:02 - Alice: ‎image omitted',
  ].join('\n');
  const msgs = parseConversation(text);
  // Alice's two standalone placeholders drop; Bob's inline mention survives.
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].sender, 'Bob');
});

test('empty input yields an empty, non-crashing result', () => {
  const stats = computeStats(parseConversation(''));
  assert.equal(stats.totalMessages, 0);
  assert.equal(stats.participantCount, 0);
  assert.equal(stats.dateRange, null);
});

// ---------------------------------------------------------------------------
// Adapter selection tests
// ---------------------------------------------------------------------------

test('adapter selection: WhatsApp text blob routes to whatsapp adapter', () => {
  // The Android ANDROID fixture above is a valid WhatsApp blob. parseConversation
  // must still produce the same result — adapter routing must not regress.
  const msgs = parseConversation(ANDROID);
  assert.equal(msgs.length, 4);
  assert.equal(msgs[0].sender, 'Alice');
});

test('adapter selection: unrecognized input returns []', () => {
  const msgs = parseConversation('completely random garbage that matches no format');
  assert.deepEqual(msgs, []);
});

test('adapter selection: valid JSON without messages array returns []', () => {
  const msgs = parseConversation(JSON.stringify({ hello: 'world' }));
  assert.deepEqual(msgs, []);
});

// ---------------------------------------------------------------------------
// Telegram Desktop JSON adapter tests
// ---------------------------------------------------------------------------

const TELEGRAM_JSON = JSON.stringify({
  name: 'Test Chat',
  type: 'personal_chat',
  messages: [
    {
      id: 1,
      type: 'message',
      date: '2024-01-12T10:00:00',
      from: 'Alice',
      from_id: 'user123',
      text: 'Hello from Telegram',
    },
    {
      id: 2,
      type: 'message',
      date: '2024-01-12T10:01:00',
      from: 'Bob',
      from_id: 'user456',
      text: 'Hi there!',
    },
    {
      id: 3,
      type: 'message',
      date: '2024-01-12T10:02:00',
      from: 'Alice',
      from_id: 'user123',
      text: 'How are you doing today?',
    },
    {
      id: 4,
      type: 'service',
      date: '2024-01-12T10:03:00',
      from: 'Alice',
      from_id: 'user123',
      text: 'Alice pinned a message',
      action: 'pin_message',
    },
    {
      id: 5,
      type: 'message',
      date: '2024-01-12T10:04:00',
      from: 'Bob',
      from_id: 'user456',
      // Entity array: mixed strings and entity objects
      text: ['Check out ', { type: 'bold', text: 'this link' }, ' for more info'],
    },
  ],
});

test('adapter selection: Telegram JSON blob routes to telegram-json adapter', () => {
  const msgs = parseConversation(TELEGRAM_JSON);
  // 5 raw entries: 3 messages from Alice/Bob, 1 service (skipped), 1 entity-array message
  assert.equal(msgs.length, 4);
});

test('Telegram JSON: per-sender message counts are correct', () => {
  const msgs = parseConversation(TELEGRAM_JSON);
  const aliceMsgs = msgs.filter((m) => m.sender === 'Alice');
  const bobMsgs = msgs.filter((m) => m.sender === 'Bob');
  assert.equal(aliceMsgs.length, 2);
  assert.equal(bobMsgs.length, 2);
});

test('Telegram JSON: service entries are skipped', () => {
  const msgs = parseConversation(TELEGRAM_JSON);
  // The "service" type pin message must not appear
  assert.ok(msgs.every((m) => m.content !== 'Alice pinned a message'));
});

test('Telegram JSON: entity-array text is flattened to a single string', () => {
  const msgs = parseConversation(TELEGRAM_JSON);
  const bobEntityMsg = msgs.find((m) => m.sender === 'Bob' && m.content.includes('this link'));
  assert.ok(bobEntityMsg, 'Entity-array message should be present');
  assert.equal(bobEntityMsg!.content, 'Check out this link for more info');
});

test('Telegram JSON: dates are parsed from ISO strings', () => {
  const msgs = parseConversation(TELEGRAM_JSON);
  assert.ok(msgs[0].date instanceof Date);
  // The Telegram date string '2024-01-12T10:00:00' has no timezone offset, so
  // JS parses it as local time. We verify the date is valid and represents
  // 2024-01-12 without assuming the server's UTC offset.
  const d = msgs[0].date!;
  assert.equal(d.getFullYear(), 2024);
  assert.equal(d.getMonth(), 0); // January
  assert.equal(d.getDate(), 12);
  assert.equal(d.getHours(), 10);
});

test('Telegram JSON: unparseable date yields null, message still counts', () => {
  const badDate = JSON.stringify({
    messages: [{ id: 1, type: 'message', date: 'not-a-date', from: 'Alice', text: 'hello' }],
  });
  const msgs = parseConversation(badDate);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].date, null);
  assert.equal(msgs[0].sender, 'Alice');
});

test('Telegram JSON: analyzeConversation produces correct stats', () => {
  const stats = analyzeConversation(TELEGRAM_JSON);
  assert.equal(stats.totalMessages, 4);
  assert.equal(stats.participantCount, 2);
  const alice = stats.participants.find((p) => p.name === 'Alice')!;
  assert.equal(alice.messageCount, 2);
  const bob = stats.participants.find((p) => p.name === 'Bob')!;
  assert.equal(bob.messageCount, 2);
});
