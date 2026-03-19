import { useEffect, useMemo, useState } from 'react'
import { getProjects } from '../shared/api/projects.js'
import { formatEpochDate } from '../shared/date.js'

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

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.DELIVERY_NEW)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError('')
        const projectsResponse = await getProjects()
        setProjects(projectsResponse?.data ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

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

  return (
    <section className="stack gap-lg">
      <div className="panel hero">
        <div>
          <p className="eyebrow">Project Management</p>
          <h1>Commitment Manager OS</h1>
          <p>Track all order and projects. Monitor kickoff and delivery milestones.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
           <h2>All Projects</h2>
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

          <button type="button" className="ghost" onClick={() => window.location.reload()}>
            Refresh
          </button>
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
                  <th>Project Description</th>
                  <th>Customer</th>
                  <th>Manager</th>
                   <th>Order #</th>
                   <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {visibleProjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {projects.length === 0 ? 'No projects yet.' : 'No projects match your search.'}
                    </td>
                  </tr>
                )}
                {visibleProjects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.project_number}</td>
                    <td>{project.project_description || '-'}</td>
                    <td>{project.customer_name || '-'}</td>
                    <td>{project.manager_name || '-'}</td>
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
