/**
 *
 * Modul zur Konfiguration der MongoDB-Verbindung.
 *
 * DatabaseConfig
 *
 * Dieses Modul definiert die Konfigurationsparameter für die Verbindung mit einer MongoDB-Datenbank,
 * basierend auf den Umgebungsvariablen. Es unterstützt sowohl Produktions- als auch Testumgebungen
 * und validiert die erforderlichen Variablen.
 */

import { env } from './env.js';

// Extrahieren relevanter Umgebungsvariablen
// eslint-disable-next-line @stylistic/operator-linebreak
const {
  NODE_ENV,
  MONGO_DB_URI,
  MONGO_DB_DATABASE,
  TEST_MONGO_DB_URI,
  TEST_MONGO_DB_DATABASE,
} = env;

let mongoDatabaseUri: string | undefined;
let mongoDatabaseName: string | undefined;

/**
 * Hilfsfunktion zur Überprüfung, ob eine Umgebungsvariable definiert ist.
 *
 * @param {string | undefined} variable - Der Wert der Umgebungsvariable.
 * @param {string} variableName - Der Name der Umgebungsvariable.
 * @returns {string} Der gültige Wert der Umgebungsvariable.
 * @throws {Error} Wenn die Umgebungsvariable nicht definiert ist.
 *
 * @example
 * const uri = ensureEnvironmentVariableDefined(process.env.MONGO_DB_URI, 'MONGO_DB_URI');
 */
export function ensureEnvironmentVariableDefined(
  variable: string | undefined,
  variableName: string,
): string {
  if (variable === undefined) {
    throw new Error(
      `Die Umgebungsvariable ${variableName} ist nicht definiert. Bitte prüfe deine .env-Datei.`,
    );
  }
  return variable;
}

// Umgebungsabhängige Konfiguration
if (NODE_ENV === 'test') {
  // Für die Testumgebung
  mongoDatabaseUri = ensureEnvironmentVariableDefined(
    TEST_MONGO_DB_URI,
    'TEST_MONGO_DB_URI',
  );
  mongoDatabaseName = TEST_MONGO_DB_DATABASE;
  if (mongoDatabaseName === undefined) {
    throw new Error(
      'Die Umgebungsvariable TEST_MONGO_DB_DATABASE ist nicht definiert. Bitte prüfe deine .env-Datei.',
    );
  }
} else {
  // Für andere Umgebungen (z.B. Produktion)
  mongoDatabaseUri = ensureEnvironmentVariableDefined(
    MONGO_DB_URI,
    'MONGO_DB_URI',
  );
  mongoDatabaseName = ensureEnvironmentVariableDefined(
    MONGO_DB_DATABASE,
    'MONGO_DB_DATABASE',
  );
}

// Sicherstellen, dass die Variablen validiert sind
const validatedMongoDatabaseUri: string = mongoDatabaseUri;
const validatedMongoDatabaseName: string = mongoDatabaseName;

/**
 * @constant
 * @type {object}
 * @description
 * Die Konfiguration für die MongoDB-Datenbankverbindung.
 *
 * @property {string} databaseName - Der Name der Datenbank.
 * @property {string} databaseUri - Die Verbindungs-URI zur MongoDB-Datenbank.
 *
 * @example
 * console.log(database.databaseName); // Ausgabe des Datenbanknamens
 * console.log(database.databaseUri);  // Ausgabe der Verbindungs-URI
 */
export const database = {
  databaseName: validatedMongoDatabaseName,
  databaseUri: validatedMongoDatabaseUri,
} as const;
