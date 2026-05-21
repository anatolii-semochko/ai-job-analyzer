export const getDaysAgo = (dateStr) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    return diff
}