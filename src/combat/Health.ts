/** Hit points with clamping. Pure. */
export class Health {
  private value: number;

  constructor(readonly max: number) {
    this.value = max;
  }

  get hp(): number {
    return this.value;
  }

  get dead(): boolean {
    return this.value <= 0;
  }

  get fraction(): number {
    return this.max > 0 ? this.value / this.max : 0;
  }

  /** Applies damage and returns the damage actually dealt. */
  damage(amount: number): number {
    const dealt = Math.min(Math.max(amount, 0), this.value);
    this.value -= dealt;
    return dealt;
  }

  heal(amount: number): void {
    this.value = Math.min(this.max, this.value + Math.max(amount, 0));
  }

  reset(): void {
    this.value = this.max;
  }
}
