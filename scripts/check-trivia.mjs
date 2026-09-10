import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const questions = JSON.parse(await readFile(new URL('../src/data/trivia-cr.json', import.meta.url), 'utf8'));
assert.ok(questions.length >= 10);
for (const item of questions) {
  assert.equal(item.options.length, 4);
  assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length);
  assert.ok(item.question && item.fact && item.category);
}
console.log(`Trivia CR validada: ${questions.length} preguntas.`);
