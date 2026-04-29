import axios from 'axios'

const mainUrl = '/node'

const throwErrorMessage = (error) => {
    const message = error?.response?.data?.error || error?.message || 'Request failed'
    throw new Error(message)
}

export const fetchUrl = async (url) => {
    const apiUrl = mainUrl + `/fetch?url=${encodeURIComponent(url)}`
    return axios.get(apiUrl)
        .then(response => response.data.data)
        .catch(throwErrorMessage)
}

export const fetchBatch = async (urls) => {
    const apiUrl = mainUrl + `/fetch/batch`
    return axios.post(apiUrl, { urls })
        .then(response => response.data.data)
        .catch(throwErrorMessage)
}

export const aiRun = async (message, withAudio = false) => {
    const apiUrl = mainUrl + `/ai/agent`
    return axios.post(apiUrl, { message, withAudio })
        .then(response => response.data.data)
        .catch(throwErrorMessage)
}
