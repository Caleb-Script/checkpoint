import { headers } from 'next/headers';

export async function getCookies() {
  const header = await headers();
  const cookieHeader = header.get('cookie') ?? '';
  return cookieHeader;
}
