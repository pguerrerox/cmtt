import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getProjects, getProjectsByManager } from '../shared/api/projects.js'
import { formatEpochDate } from '../shared/date.js'
import { useSelectedManager } from '../state/selectedManager.context.jsx'

const SORT_OPTIONS = {
  PROJECT_ASC: 'project_asc',
  PROJECT_DESC: 'project_desc',
  DELIVERY_NEW: 'delivery_new',
  DELIVERY_OLD: 'delivery_old'
}

function compareProjectNumber(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, {
    numeric: true,
    sensitivity: 'base'
  })
}

function compareDeliveryDate(a, b) {
  const aTime = Number(a)
  const bTime = Number(b)
  const aValid = Number.isFinite(aTime)
  const bValid = Number.isFinite(bTime)

  if (!aValid && !bValid) return 0
  if (!aValid) return 1
  if (!bValid) return -1
  return aTime - bTime
}

export default function ManagerProjectsPage() {
  const { selectedManager } = useSelectedManager()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.DELIVERY_NEW)

  useEffect(() => {
    if (!selectedManager?.id) {
      return
    }

    async function loadProjects() {
      try {
        setLoading(true)
        setError('')

        const response = selectedManager.role === 'Team Leader'
          ? await getProjects()
          : await getProjectsByManager(selectedManager.id)

        setProjects(response?.data ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [selectedManager])

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchInput.trim().toLowerCase())
    }, 300)

    return () => {
      clearTimeout(handle)
    }
  }, [searchInput])

  const visibleProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      if (!searchTerm) return true

      const projectNumber = String(project.project_number || '').toLowerCase()
      const customer = String(project.customer_name || '').toLowerCase()
      const description = String(project.project_description || '').toLowerCase()

      return (
        projectNumber.includes(searchTerm) ||
        customer.includes(searchTerm) ||
        description.includes(searchTerm)
      )
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (sortBy === SORT_OPTIONS.PROJECT_ASC) {
        return compareProjectNumber(a.project_number, b.project_number)
      }

      if (sortBy === SORT_OPTIONS.PROJECT_DESC) {
        return compareProjectNumber(b.project_number, a.project_number)
      }

      const dateSort = compareDeliveryDate(a.updated_at, b.updated_at)
      return sortBy === SORT_OPTIONS.DELIVERY_OLD ? dateSort : -dateSort
    })

    return sorted
  }, [projects, searchTerm, sortBy])

  if (!selectedManager?.id) {
    return <Navigate to="/login" replace />
  }

  return (
    <section className="stack gap-lg">
      <div className="panel hero compact">
        <p className="eyebrow">Manager Projects</p>
        <h2>{selectedManager.fullname}</h2>
        <p>
          {selectedManager.role === 'Team Leader'
            ? 'Team Leader access: showing all projects.'
            : `${selectedManager.role}: showing assigned projects only.`}
        </p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>{selectedManager.role === 'Team Leader' ? 'All Projects' : 'My Projects'}</h3>
        </div>

        <div className="manager-project-actions" aria-label="Project actions">
          <Link to="/orders/new" className="admin-tab-link">
            Create Order
          </Link>
          <Link to="/projects/new" className="admin-tab-link">
            Create Project
          </Link>
        </div>

        <div className="inline-controls project-list-controls">
          <label>
            Search
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Project #, customer, description"
            />
          </label>

          <label>
            Sort
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value={SORT_OPTIONS.PROJECT_ASC}>Project Number (Asc)</option>
              <option value={SORT_OPTIONS.PROJECT_DESC}>Project Number (Desc)</option>
               <option value={SORT_OPTIONS.DELIVERY_NEW}>Last Updated (New)</option>
               <option value={SORT_OPTIONS.DELIVERY_OLD}>Last Updated (Old)</option>
            </select>
          </label>
        </div>

        {!loading && !error && (
          <p className="results-note">Showing {visibleProjects.length} of {projects.length} projects</p>
        )}

        {loading && <p>Loading projects...</p>}
        {!loading && error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project #</th>
                  <th>Description</th>
                  <th>Customer</th>
                   <th>Order #</th>
                   <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {visibleProjects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      {projects.length === 0 ? 'No projects found.' : 'No projects match your search.'}
                    </td>
                  </tr>
                )}

                {visibleProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link to={`/projects/${project.project_number}`} className="project-link">
                        {project.project_number}
                      </Link>
                    </td>
                    <td>{project.project_description || '-'}</td>
                    <td>{project.customer_name || '-'}</td>
                     <td>{project.order_number || '-'}</td>
                     <td>{formatEpochDate(project.updated_at)}</td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
