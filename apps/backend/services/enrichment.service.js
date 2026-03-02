import { machineProvider } from './enrichment/providers/machine.provider.js'
import { auxProvider } from './enrichment/providers/aux.provider.js'
import { moldProvider } from './enrichment/providers/mold.provider.js'

const providersByType = {
    1: machineProvider,
    2: auxProvider,
    3: moldProvider
}

export const runProjectEnrichment = (db, context) => {
    const provider = providersByType[context.projectType]
    if (!provider) return { ok: true, lookup_status: 'not_applicable' }
    return provider.run(db, context)
}
