export const LIST_SEPARATOR = ' • '

export const sanitizeForCopy = (text) => {
    if (!text) return ''
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim()
}

export const joinList = (list) => (Array.isArray(list) ? list.join(LIST_SEPARATOR) : '')

export const splitList = (text) => (text || '')
    .split('•')
    .map(item => item.trim())
    .filter(Boolean)
