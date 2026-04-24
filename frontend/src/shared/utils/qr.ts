export function generateRandomCode(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ITM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

export function downloadQrByCanvasId(canvasId: string, fileName: string): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
  if (!canvas) return
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `${fileName || 'item'}.png`
  link.click()
}

/** Gera uma cor HSL consistente a partir de uma string (nome do funcionário, etc.) */
export function stringToHslColor(str: string, saturation = 65, lightness = 52): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}
