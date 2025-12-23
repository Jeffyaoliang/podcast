/**
 * 去除HTML标签，只保留纯文本
 */
export const stripHTML = (html) => {
  if (!html) return ''
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

