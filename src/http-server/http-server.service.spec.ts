import { Test, TestingModule } from '@nestjs/testing';
import { HttpServerService } from './http-server.service';

describe('HttpServerService', () => {
  let service: HttpServerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpServerService],
    }).compile();

    service = module.get<HttpServerService>(HttpServerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
