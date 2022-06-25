import { CanActivate, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(): boolean | Promise<boolean> | Observable<boolean> {
    return process.env.STAGE === 'dev';
  }
}
