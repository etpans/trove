const cardColors = [
  '#F8E36D',
  '#B7D1F6',
  '#F5AAA6',
  '#A7F3D0',
  '#FFD166',
  '#C7D2FE',
  '#F9C6D3',
  '#BDE0FE',
];

export function getCardColor(index: number, color?: string) {
  return color || cardColors[index % cardColors.length];
}
