import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { UsersService } from "../../users/users.service";

/**
 * Accepts either a JWT (browser sessions, CLI/MCP after `klion login`) or an
 * `X-Service-Key` header for headless callers such as Akela.
 *
 * Service keys are read from the SERVICE_API_KEYS env var as comma-separated
 * `name:key:email` triples (email optional). A valid key resolves to the user
 * with that email — so the key acts AS a specific user, not "whoever is first".
 * This matters once the app is multi-user (e.g. Streakboard). If a key has no
 * email, it falls back to the first user (single-user shortcut).
 */
@Injectable()
export class JwtOrServiceKeyGuard extends AuthGuard("jwt") {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers["x-service-key"];
    const providedKey = Array.isArray(header) ? header[0] : header;

    if (!providedKey) {
      return (await super.canActivate(context)) as boolean;
    }

    const entry = this.resolveServiceEntry(providedKey);
    if (!entry) {
      throw new UnauthorizedException("Service key inválida");
    }

    request.user = await this.resolveServiceUser(entry);
    return true;
  }

  private resolveServiceEntry(
    providedKey: string,
  ): { name: string; email: string | null } | null {
    const configured = this.configService.get<string>("SERVICE_API_KEYS", "");

    for (const rawEntry of configured.split(",")) {
      // Formato: `name:key` o `name:key:email`. La key (hex) y el email no
      // contienen ":", así que split simple es seguro.
      const parts = rawEntry.split(":").map((part) => part.trim());
      const [name, key, email] = parts;
      if (name && key && this.safeEqual(key, providedKey)) {
        return { name, email: email || null };
      }
    }

    return null;
  }

  private safeEqual(expected: string, provided: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    if (expectedBuffer.length !== providedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, providedBuffer);
  }

  private async resolveServiceUser(entry: { name: string; email: string | null }) {
    // Con email → ese usuario específico (correcto en multi-usuario). Sin email
    // → el primer usuario (atajo single-user, retrocompatible).
    const user = entry.email
      ? await this.usersService.findByEmail(entry.email)
      : (await this.usersService.findAll())[0];

    if (!user) {
      throw new UnauthorizedException(
        entry.email
          ? `No hay ningún usuario con el email ${entry.email}`
          : "No hay usuarios en el sistema",
      );
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      service: entry.name,
    };
  }
}
