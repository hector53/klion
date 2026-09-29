import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current user from the request
 * Use with JwtAuthGuard to get the authenticated user
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific property is requested, return that property
    if (data) {
      return user?.[data];
    }

    return user;
  },
);
