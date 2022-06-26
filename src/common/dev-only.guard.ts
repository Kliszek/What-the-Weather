import { CanActivate, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Makes the specified route to be available only in the dev stage
 */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(): boolean | Promise<boolean> | Observable<boolean> {
    return process.env.STAGE === 'dev';
  }
}
