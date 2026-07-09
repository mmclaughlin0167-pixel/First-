const LB_PER_KG = 2.2046226218
const IN_PER_CM = 0.3937007874

export function toKg(value: number, unit: 'lb' | 'kg'): number {
  return unit === 'kg' ? value : value / LB_PER_KG
}

export function toCm(value: number, unit: 'in' | 'cm'): number {
  return unit === 'cm' ? value : value / IN_PER_CM
}

export function toIn(value: number, unit: 'in' | 'cm'): number {
  return unit === 'in' ? value : value * IN_PER_CM
}
