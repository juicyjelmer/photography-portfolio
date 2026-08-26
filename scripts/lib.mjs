export const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

// When both "name.jpg" and "name-min.jpg" exist, keep only the smaller "-min" one
export function dedupeMinVariants(files) {
  const minOriginals = new Set(
    files
      .filter(f => /-min(\.[^.]+)$/i.test(f))
      .map(f => f.replace(/-min(\.[^.]+)$/i, '$1'))
  )
  return files.filter(f => !minOriginals.has(f))
}
