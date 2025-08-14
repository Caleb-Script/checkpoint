import { load } from 'js-yaml';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const BASEDIR = existsSync('src') ? 'src' : 'dist';

export const RESOURCES_DIR = resolve(BASEDIR, 'config', 'resources');

export const VOLUMES_DIR = resolve(BASEDIR, '..', '..', '.volumes');

export const KEYS_DIR = resolve(BASEDIR, '..', '..', 'keys');

const configFile = resolve(RESOURCES_DIR, 'app.yml');
export const config = load(readFileSync(configFile, 'utf8')) as Record<
  string,
  any
>;
