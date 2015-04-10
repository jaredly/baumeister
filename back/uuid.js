
export default function uuid(size) {
  const at = parseInt(Math.random() * 1000)
  const t = Date.now() + ':'
  size = size || 20
  return t + Math.random().toString(35)
              .slice(at, at + size)
}

