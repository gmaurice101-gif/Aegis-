import { type Config } from '@vladmandic/human';

export const humanConfig: Partial<Config> = {
  modelBasePath: 'https://vladmandic.github.io/human-models/models/',
  face: {
    enabled: true,
    detector: { return: true, rotation: true },
    mesh: { enabled: true },
    iris: { enabled: true },
    description: { enabled: true },
    emotion: { enabled: true },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
};
