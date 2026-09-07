import test from 'node:test';
import assert from 'node:assert/strict';
import { pushPlatform } from '../source/lib/push-platform.ts';

test('iPhone requires Home Screen launch and gives Apple permission instructions', () => {
  const browser = pushPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X)', 5, false);
  assert.equal(browser.needsHomeScreen, true);
  assert.match(browser.installHelp, /iOS 16.4/);
  assert.match(browser.permissionHelp, /집중 모드/);
  assert.equal(pushPlatform('iPhone', 5, true).needsHomeScreen, false);
});
test('desktop UA on iPad is recognized; Mac and Android are not treated as iPhone', () => {
  assert.equal(pushPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5).isIOS, true);
  assert.equal(pushPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0).isIOS, false);
  assert.equal(pushPlatform('Mozilla/5.0 (Linux; Android 14)', 5).needsHomeScreen, false);
  assert.match(pushPlatform().installHelp, /안드로이드 Chrome/);
});
