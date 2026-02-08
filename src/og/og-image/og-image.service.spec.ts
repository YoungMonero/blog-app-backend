import { Test, TestingModule } from '@nestjs/testing';
import { OgImageService } from './og-image.service';

describe('OgImageService', () => {
  let service: OgImageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OgImageService],
    }).compile();

    service = module.get<OgImageService>(OgImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
