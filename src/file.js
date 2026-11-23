// Single place that turns text into a file the user can keep.
// Web/desktop: a normal download. The Android build will branch here to Cache + Share.
export async function saveFile(name, text, mime = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
