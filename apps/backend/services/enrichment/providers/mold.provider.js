import { getOperationsPlan } from '../../../repositories/operations.repo.js'
import { enqueueProject } from '../../../repositories/operations-lookup-queue.repo.js'

export const moldProvider = {
    run(db, context) {
        const operationsResult = getOperationsPlan(db, {
            project_number: context.projectNumber,
            project_type: context.projectType,
            order_number: context.orderNumber
        })

        if (operationsResult.ok) {
            return { ok: true, lookup_status: 'enriched' }
        }

        if (operationsResult.error !== 'operations plan not found') {
            return { ok: false, error: operationsResult.error }
        }

        const queueResult = enqueueProject(db, context.projectNumber, {
            status: 'pending',
            order_number: context.orderNumber,
            project_type: context.projectType
        })
        if (!queueResult.ok) return { ok: false, error: queueResult.error }

        return { ok: true, lookup_status: 'queued' }
    }
}
