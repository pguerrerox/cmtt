function scoreProject(project, draft) {
    let score = 0
    const reasons = []

    if (Number(project.customer_id) === Number(draft.order.customer_id)) {
        score += 50
        reasons.push('same customer')
    }

    if (Number(project.ship_to_facility_id) === Number(draft.order.ship_to_facility_id)) {
        score += 25
        reasons.push('same ship-to facility')
    }

    const draftTypes = new Set((draft.projects ?? []).map((line) => Number(line.type)))
    if (draftTypes.has(Number(project.type))) {
        score += 15
        reasons.push('matching project type')
    }

    const ageDays = Math.max(0, (Date.now() - Number(project.updated_at ?? 0)) / (1000 * 60 * 60 * 24))
    const recencyBoost = Math.max(0, 10 - Math.floor(ageDays / 30))
    if (recencyBoost > 0) {
        score += recencyBoost
        reasons.push('recent activity')
    }

    return { score, reasons }
}

export function getRelatedProjectRecommendations(db, draft, limit = 5) {
    const rows = db.prepare(`
        SELECT
            projects_core.id,
            projects_core.project_number,
            projects_core.project_description,
            projects_core.type,
            projects_core.updated_at,
            orders.id AS order_id,
            orders.order_number,
            orders.customer_id,
            orders.ship_to_facility_id
        FROM projects_core
        JOIN orders ON projects_core.order_id = orders.id
        ORDER BY projects_core.updated_at DESC, projects_core.id DESC
        LIMIT 250
    `).all()

    const scored = rows
        .map((row) => {
            const { score, reasons } = scoreProject(row, draft)
            return {
                project_id: row.id,
                project_number: row.project_number,
                project_description: row.project_description,
                order_id: row.order_id,
                order_number: row.order_number,
                score,
                reasons
            }
        })
        .filter((row) => row.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

    return scored
}
