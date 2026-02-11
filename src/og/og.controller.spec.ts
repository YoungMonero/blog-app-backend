import { Test, TestingModule } from '@nestjs/testing';
import { OgController } from './og.controller';

describe('OgController', () => {
  let controller: OgController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OgController],
    }).compile();

    controller = module.get<OgController>(OgController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
