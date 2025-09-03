// /backend/invitation/src/bootstrap/warnings.ts

/**
 * Loggt Node.js "warning" Events inkl. Stacktrace,
 * damit du die Quelle von TimeoutNegativeWarning & Co. findest.
 */
export function registerWarningTrace(): void {
  process.on("warning", (warning) => {
    // eslint-disable-next-line no-console
    console.warn(
      "[NodeWarning]",
      warning.name,
      warning.message,
      "\n",
      warning.stack ?? "(no stack)",
    );
  });
}
