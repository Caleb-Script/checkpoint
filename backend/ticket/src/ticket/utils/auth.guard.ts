import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

function parseRolesFromToken(payload: JWTPayload): string[] {
    // Keycloak: realm_access.roles oder resource_access
    const roles: string[] = [];
    const realm = (payload as any)?.realm_access?.roles ?? [];
    if (Array.isArray(realm)) roles.push(...realm);
    return roles;
}

@Injectable()
export class AuthGuard implements CanActivate {
    private disabled = process.env.DISABLE_AUTH === 'true';
    private requiredRoles = (process.env.REQUIRED_ROLES ?? 'admin,security')
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (this.disabled) return true;

        const req = context.switchToHttp().getRequest();
        const auth = (req.headers['authorization'] as string) ?? '';
        if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing Bearer token');

        const token = auth.slice('Bearer '.length);

        const jwksUrl = process.env.KEYCLOAK_JWKS_URL;
        if (!jwksUrl) {
            throw new UnauthorizedException('KEYCLOAK_JWKS_URL not configured');
        }
        const JWKS = createRemoteJWKSet(new URL(jwksUrl));
        const { payload } = await jwtVerify(token, JWKS);

        const roles = parseRolesFromToken(payload);
        const ok = this.requiredRoles.some((r) => roles.includes(r));
        if (!ok) throw new ForbiddenException('Insufficient role');
        (req as any).user = payload;
        return true;
    }
}
