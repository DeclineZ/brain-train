export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    if (max < min) {
      throw new Error(`Invalid range: min (${min}) > max (${max})`);
    }
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextIndex(max: number): number {
    return Math.floor(this.next() * max);
  }
}

export const createSeededRandom = (seed: number) => new SeededRandom(seed);

export const shuffleWithSeed = <T>(items: T[], rng: SeededRandom): T[] => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = rng.nextIndex(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};