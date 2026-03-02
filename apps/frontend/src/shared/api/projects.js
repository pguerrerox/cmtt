import { apiClient } from './client.js'

function normalizeProject(order, projectCore) {
  return {
    ...projectCore,
    order_id: order.id,
    order_number: order.order_number,
    customer_name: order.snapshot_customer_name,
    manager_name: order.snapshot_project_manager_name
  }
}

async function listProjectsForOrders(orders) {
  const groupedProjects = await Promise.all(
    orders.map(async (order) => {
      const response = await apiClient.get(`/api/projects-core/order/${order.id}`)
      const rows = response?.data ?? []
      return rows.map((projectCore) => normalizeProject(order, projectCore))
    })
  )

  return groupedProjects.flat()
}

async function findProjectByNumber(projectNumber) {
  const ordersResponse = await apiClient.get('/api/orders')
  const orders = ordersResponse?.data ?? []

  for (const order of orders) {
    const projectsResponse = await apiClient.get(`/api/projects-core/order/${order.id}`)
    const projectCore = (projectsResponse?.data ?? []).find(
      (item) => String(item.project_number) === String(projectNumber)
    )

    if (projectCore) {
      return normalizeProject(order, projectCore)
    }
  }

  return null
}

export function getOrders() {
  return apiClient.get('/api/orders')
}

export async function getProjects() {
  const ordersResponse = await getOrders()
  const orders = ordersResponse?.data ?? []
  const projects = await listProjectsForOrders(orders)
  return { ok: true, data: projects }
}

export async function getProjectsByManager(managerId) {
  const ordersResponse = await getOrders()
  const orders = (ordersResponse?.data ?? []).filter(
    (order) => String(order.project_manager_id) === String(managerId)
  )
  const projects = await listProjectsForOrders(orders)
  return { ok: true, data: projects }
}

export async function getProjectByNumber(projectNumber) {
  const project = await findProjectByNumber(projectNumber)
  if (!project?.id) {
    throw new Error('project not found')
  }

  const [projectResponse, milestonesResponse] = await Promise.all([
    apiClient.get(`/api/projects-core/${project.id}`),
    apiClient.get(`/api/projects-core/${project.id}/milestones`)
  ])

  return {
    ok: true,
    data: {
      ...project,
      ...projectResponse?.data,
      milestones: milestonesResponse?.data ?? []
    }
  }
}

export function createProject(payload) {
  return apiClient.post('/api/projects-core', payload)
}

export function modifyProject(projectId, payload) {
  return apiClient.patch(`/api/projects-core/${projectId}`, payload)
}

export function updateProjectMilestone(milestoneId, payload) {
  return apiClient.patch(`/api/project-milestones/${milestoneId}`, payload)
}
