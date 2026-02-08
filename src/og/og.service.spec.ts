import { Test, TestingModule } from '@nestjs/testing';
import { OgService } from './og.service';

describe('OgService', () => {
  let service: OgService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OgService],
    }).compile();

    service = module.get<OgService>(OgService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
