const generateHash = (str) => {
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i)
    }
    return Math.abs(hash).toString(36)
}

export const createJobHash = (data) => {
    if (data.itemId) {
        return generateHash(`${data.parser}|${data.itemId}`)
    }
    const hashSource = `${data.parser}|${data.company}|${data.title}`.toLowerCase()
    return generateHash(hashSource)
}

export const createFullHash = (data) => {
    const hashSource = JSON.stringify({
        parser: data.parser,
        datePublish: data.datePublish,
        company: data.company,
        country: data.country,
        title: data.title,
        description: data.description,
        salary: data.salary,
        isDeactivated: data.isDeactivated,
    })
    return generateHash(hashSource)
}

export const isJobChanged = (existingJob, newData) => {
    const newFullHash = createFullHash(newData)
    return existingJob.fullHash !== newFullHash
}

export const createJob = (data) => {
    const now = new Date().toISOString()
    const hash = data.hash || createJobHash(data)
    const fullHash = createFullHash(data)

    return {
        hash,
        fullHash,
        itemId: data.itemId || null,

        parser: data.parser || '',

        datePublish: data.datePublish || null,
        dateAdd: data.dateAdd || now,
        dateUpdate: data.dateUpdate || now,

        company: data.company || '',
        country: data.country || '',
        title: data.title || '',
        description: data.description || '',
        salary: data.salary || null,
        href: data.href || null,
        comments: data.comments || null,

        rateProfLevel: data.rateProfLevel || null,
        rateSkills: data.rateSkills || null,
        rateCompanyType: data.rateCompanyType || null,
        rateSalary: data.rateSalary || null,
        rateExpectations: data.rateExpectations || null,
        rateLocation: data.rateLocation || null,
        rate: data.rate || null,
        ratesExplain: data.ratesExplain || null,

        favorite: data.favorite ?? false,
        contacted: data.contacted ?? false,
        refused: data.refused ?? false,
        hidden: data.hidden ?? false,
        isDeactivated: data.isDeactivated ?? false,

        status: data.status || null,
        statusDate: data.statusDate || null,
    }
}

export const updateJob = (existingJob, newData) => {
    const now = new Date().toISOString()
    const fullHash = createFullHash(newData)

    return {
        ...existingJob,
        fullHash,
        dateUpdate: now,

        datePublish: newData.datePublish ?? existingJob.datePublish,
        company: newData.company || existingJob.company,
        country: newData.country || existingJob.country,
        title: newData.title || existingJob.title,
        description: newData.description || existingJob.description,
        salary: newData.salary ?? existingJob.salary,
        href: newData.href ?? existingJob.href,
        comments: newData.comments ?? existingJob.comments,

        rateProfLevel: newData.rateProfLevel ?? existingJob.rateProfLevel,
        rateSkills: newData.rateSkills ?? existingJob.rateSkills,
        rateCompanyType: newData.rateCompanyType ?? existingJob.rateCompanyType,
        rateSalary: newData.rateSalary ?? existingJob.rateSalary,
        rateExpectations: newData.rateExpectations ?? existingJob.rateExpectations,
        rateLocation: newData.rateLocation ?? existingJob.rateLocation,
        rate: newData.rate ?? existingJob.rate,
        ratesExplain: newData.ratesExplain ?? existingJob.ratesExplain,

        favorite: newData.favorite ?? existingJob.favorite ?? false,
        contacted: newData.contacted ?? existingJob.contacted ?? false,
        refused: newData.refused ?? existingJob.refused ?? false,
        hidden: newData.hidden ?? existingJob.hidden ?? false,
        isDeactivated: newData.isDeactivated ?? existingJob.isDeactivated ?? false,

        status: newData.status ?? existingJob.status,
        statusDate: newData.statusDate ?? existingJob.statusDate,
    }
}
