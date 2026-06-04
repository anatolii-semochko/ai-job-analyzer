import douParser from './sources/dou'
import linkedinParser from './sources/linkedin'
import djinniParser from './sources/djinni'
import workuaParser from './sources/workua'
import jobrightParser from './sources/jobright'
import jobgetherParser from './sources/jobgether'

export const parsers = {
    linkedin: linkedinParser,
    dou: douParser,
    djinni: djinniParser,
    workua: workuaParser,
    jobright: jobrightParser,
    jobgether: jobgetherParser,
}

export const getParsersList = () => {
    return Object.values(parsers).map(p => ({
        name: p.name,
        label: p.label,
    }))
}

export const parse = async (parserName, data) => {
    const parser = parsers[parserName]

    if (!parser) {
        throw new Error(`Parser "${parserName}" not found. Available: ${Object.keys(parsers).join(', ')}`)
    }

    if (!data) {
        return []
    }

    try {
        return await parser.parse(data)
    } catch (e) {
        console.error(`Parser "${parserName}" error:`, e)
        throw new Error(`Failed to parse data with "${parserName}": ${e.message}`)
    }
}

export const autoParse = (data) => {
    for (const [name, parser] of Object.entries(parsers)) {
        if (parser.validate && parser.validate(data)) {
            return {
                parser: name,
                jobs: parser.parse(data),
            }
        }
    }
    return null
}

export const extractJobUrls = (parserName, html) => {
    const parser = parsers[parserName]
    if (parser && parser.extractJobUrls) {
        return parser.extractJobUrls(html)
    }
    return []
}

export const parseDetail = (parserName, html, url) => {
    const parser = parsers[parserName]
    if (parser && parser.parseDetail) {
        return parser.parseDetail(html, url)
    }
    return null
}

export const supportsDetailPages = (parserName) => {
    const parser = parsers[parserName]
    return !!(parser && parser.extractJobUrls && parser.parseDetail)
}

export default {
    parsers,
    getParsersList,
    parse,
    autoParse,
    extractJobUrls,
    parseDetail,
    supportsDetailPages,
}
