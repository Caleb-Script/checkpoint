/**
 * Patcht iOS-Deployment-Target für ein Capacitor-Projekt.
 * - Podfile:   platform :ios, '15.5'
 * - pbxproj:   IPHONEOS_DEPLOYMENT_TARGET = 15.5;
 * - führt "pod install" aus (falls CocoaPods vorhanden)
 */

import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const IOS_DIR = 'ios';
const PODFILE = join(IOS_DIR, 'App', 'Podfile');
const PBXPROJ = join(IOS_DIR, 'App', 'App.xcodeproj', 'project.pbxproj');
const TARGET = '15.5';

function patchPodfile() {
  if (!existsSync(PODFILE)) {
    console.warn(`⚠️  Podfile nicht gefunden: ${PODFILE}`);
    return;
  }
  let content = readFileSync(PODFILE, 'utf8');

  // platform :ios, 'x.y'
  if (/platform\s*:ios\s*,\s*'[\d.]+'/.test(content)) {
    content = content.replace(
      /platform\s*:ios\s*,\s*'[\d.]+'/g,
      `platform :ios, '${TARGET}'`,
    );
  } else {
    const lines = content.split(/\r?\n/);
    lines.splice(0, 0, `platform :ios, '${TARGET}'`);
    content = lines.join('\n');
  }

  // post_install: erzwinge Target für alle Pods
  if (!/post_install do \|installer\|/m.test(content)) {
    content += `

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${TARGET}'
    end
  end
end
`;
  } else {
    content = content.replace(
      /config\.build_settings\['IPHONEOS_DEPLOYMENT_TARGET'\]\s*=\s*'[\d.]+'?/g,
      `config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${TARGET}'`,
    );
  }

  writeFileSync(PODFILE, content, 'utf8');
  console.log(`✅ Podfile → iOS Deployment Target ${TARGET}`);
}

function patchPbxproj() {
  if (!existsSync(PBXPROJ)) {
    console.warn(`⚠️  pbxproj nicht gefunden: ${PBXPROJ}`);
    return;
  }
  let content = readFileSync(PBXPROJ, 'utf8');
  const next = content.replace(
    /IPHONEOS_DEPLOYMENT_TARGET\s*=\s*[\d.]+;/g,
    `IPHONEOS_DEPLOYMENT_TARGET = ${TARGET};`,
  );
  if (next !== content) {
    writeFileSync(PBXPROJ, next, 'utf8');
    console.log(`✅ Xcode-Projekt → IPHONEOS_DEPLOYMENT_TARGET = ${TARGET}`);
  } else {
    console.log('ℹ️  pbxproj bereits korrekt oder keine Einträge gefunden.');
  }
}

function runPods() {
  if (!existsSync(IOS_DIR)) return;

  // Pod-Repo updaten (wichtig bei neuen MLKit-Versionen)
  spawnSync('pod', ['repo', 'update'], { cwd: IOS_DIR, stdio: 'inherit' });

  // sauberes Reinstall
  spawnSync('pod', ['deintegrate'], { cwd: IOS_DIR, stdio: 'inherit' });
  const res = spawnSync('pod', ['install'], { cwd: IOS_DIR, stdio: 'inherit' });

  if (res.status === 0) console.log('✅ CocoaPods installiert/aktualisiert.');
  else console.warn("⚠️  'pod install' meldete einen Fehler.");
}

function main() {
  patchPodfile();
  patchPbxproj();
  runPods();
}
main();
