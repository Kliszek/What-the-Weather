import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserIP = createParamDecorator(
  (_data: any, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const userIp = req.header('x-forwarded-for') || req.socket.remoteAddress;
    return userIp;
  },
);
