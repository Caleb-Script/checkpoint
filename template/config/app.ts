import { existsSync, readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import path from 'node:path';

// im Docker-Image gibt es kein Unterverzeichnis "src"

export const BASEDIR = existsSync('src') ? 'src' : 'dist';

export const RESOURCES_DIR = path.resolve(BASEDIR, 'config', 'resources');

const configFile = path.resolve(RESOURCES_DIR, 'app.yml');
export const config = load(readFileSync(configFile, 'utf8')) as Record<
  string,
  any
>;
