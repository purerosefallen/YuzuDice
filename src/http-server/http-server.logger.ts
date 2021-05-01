import { Injectable, Scope, Logger } from '@nestjs/common';

@Injectable()
export class HttpServerLogger extends Logger {}
