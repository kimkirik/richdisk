import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('frontend and fallback use identical watch rules',()=>assert.equal(readFileSync(new URL('../frontend/lib/watch-target.ts',import.meta.url),'utf8'),readFileSync(new URL('../lib/watch-target.ts',import.meta.url),'utf8')));
