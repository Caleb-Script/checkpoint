/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Handlebars from 'handlebars';

export class NotificationRenderer {
  render(
    template: { title: string; body: string },
    vars: Record<string, unknown>,
  ) {
    const t1 = Handlebars.compile(template.title, { noEscape: true });
    const t2 = Handlebars.compile(template.body, { noEscape: false });
    return {
      title: t1(vars),
      body: t2(vars),
    };
  }

  validate(expected: string[], vars: Record<string, unknown>) {
    for (const name of expected ?? []) {
      if (!(name in vars)) throw new Error(`Missing variable: ${name}`);
    }
  }
}
