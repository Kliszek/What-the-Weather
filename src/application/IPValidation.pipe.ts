import {
  Injectable,
  InternalServerErrorException,
  PipeTransform,
} from '@nestjs/common';

/**
 * Regex for an IPv4 address
 */
const IPV4_REGEX = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/;

@Injectable()
export class IPValidationPipe implements PipeTransform {
  transform(value: string): string {
    if (!IPV4_REGEX.test(value)) {
      throw new InternalServerErrorException('Wrong IP');
    }
    return value;
  }
}
