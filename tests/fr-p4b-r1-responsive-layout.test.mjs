import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

async function read(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

function rule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, 'm'));
  assert.ok(match, `Missing CSS rule: ${selector}`);
  return match[1];
}

function between(value, startMarker, endMarker) {
  const start = value.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing marker: ${startMarker}`);
  const end = value.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing marker: ${endMarker}`);
  return value.slice(start, end);
}

test('P4B-R1 constrains the science hero grid and media intrinsic size', async () => {
  const css = await read('assets/science-companion.css');
  const hero = rule(css, '.science-atlas-hero');
  const media = rule(css, '.science-atlas-hero-media');
  const image = rule(css, '.science-atlas-hero-media img');

  assert.match(hero, /grid-template-columns:\s*minmax\(0,\s*20rem\)\s+minmax\(0,\s*1fr\)/);
  assert.match(hero, /width:\s*100%/);
  assert.match(hero, /min-width:\s*0/);

  assert.match(media, /width:\s*100%/);
  assert.match(media, /max-width:\s*20rem/);
  assert.match(media, /min-width:\s*0/);
  assert.match(media, /min-height:\s*0/);
  assert.match(media, /padding:\s*0/);
  assert.doesNotMatch(media, /min-height:\s*16rem/);

  assert.match(image, /max-height:\s*none/);
  assert.match(image, /min-width:\s*0/);
});

test('P4B-R1 switches to one column before the former collision interval', async () => {
  const css = await read('assets/science-companion.css');
  const compact = between(css, '@media (max-width: 68rem) {', '@media (max-width: 680px) {');
  assert.match(compact, /\.science-atlas-hero[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(compact, /\.science-atlas-hero-media[\s\S]*justify-self:\s*center/);

  assert.doesNotMatch(css, /@media\s*\(max-height:\s*480px\)\s*,/);
  assert.match(css, /@media\s*\(min-width:\s*68\.0625rem\)\s+and\s+\(max-height:\s*480px\)/);
});

test('P4B-R1 protects long science copy, tags and actions from widening the grid', async () => {
  const css = await read('assets/science-companion.css');
  assert.match(css, /\.science-atlas-hero-copy\s*>\s*\*[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.science-atlas-actions\s*>\s*\*[\s\S]*max-width:\s*100%/);
  assert.match(css, /\.science-atlas-tags\s+li[\s\S]*max-width:\s*100%/);
  assert.match(css, /\.science-atlas-hero-media\.thumbnail-missing\s+\.cover-fallback/);
});

test('P4B-R1 publishes a new stylesheet cache identity', async () => {
  const html = await read('index.html');
  assert.match(html, /science-companion\.css\?v=fr-p4b-r1-20260723/);
  assert.equal((html.match(/science-companion\.css/g) ?? []).length, 1);
});
