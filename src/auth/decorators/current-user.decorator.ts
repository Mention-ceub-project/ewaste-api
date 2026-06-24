import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Atalho: me(@CurrentUser() user) {...}
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
