/** Hit points with clamping. Pure. */
export class Health {
  private value: number;
  private maxValue: number;

  constructor(max: number) {
    this.maxValue = max;
    this.value = max;
  }

  get max(): number {
    return this.maxValue;
  }

  /** Raise (or lower) the maximum; health grows by the same amount (a relic's gift is filled in). */
  setMax(max: number): void {
    const gain = max - this.maxValue;
    this.maxValue = max;
    this.value = Math.max(0, Math.min(max, this.value + Math.max(0, gain)));
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
