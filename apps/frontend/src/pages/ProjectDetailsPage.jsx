import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getProjectByNumber, modifyProject, updateProjectMilestone } from '../shared/api/projects.js'
import { dateInputToEpoch, epochToDateInput, formatEpochDate } from '../shared/date.js'

const PROJECT_STATUS_OPTIONS = ['New', 'Ordered', 'Internal', 'Kicked', 'Packed', 'Shipped', 'Cancelled']
const MILESTONE_STATUS_OPTIONS = ['pending', 'ready', 'in_progress', 'done', 'blocked', 'cancelled']

function buildMilestoneForm(milestones) {
  return Object.fromEntries(
    milestones.map((milestone) => [
      String(milestone.id),
      {
        actual_at: epochToDateInput(milestone.actual_at),
        milestone_status: milestone.milestone_status ?? 'pending',
        notes: milestone.notes ?? ''
      }
    ])
  )
}

export default function ProjectDetailsPage() {
  const { projectNumber } = useParams()
  const [project, setProject] = useState(null)
  const [projectForm, setProjectForm] = useState({ status: 'New', project_notes: '' })
  const [milestoneForm, setMilestoneForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const titleProjectNumber = useMemo(() => project?.project_number ?? projectNumber, [project, projectNumber])

  async function loadProject() {
    try {
      setLoading(true)
      setError('')
      const response = await getProjectByNumber(projectNumber)
      const projectData = response?.data
      const milestones = projectData?.milestones ?? []

      setProject(projectData)
      setProjectForm({
        status: projectData?.status ?? 'New',
        project_notes: projectData?.project_notes ?? ''
      })
      setMilestoneForm(buildMilestoneForm(milestones))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProject()
  }, [projectNumber])

  async function onSubmit(event) {
    event.preventDefault()
    if (!project?.id) return

    try {
      setSaving(true)
      setStatus('')
      setError('')

      await modifyProject(project.id, {
        status: projectForm.status,
        project_notes: projectForm.project_notes
      })

      const milestoneUpdates = (project.milestones ?? []).map((milestone) => {
        const formValues = milestoneForm[String(milestone.id)]
        if (!formValues) return null

        return updateProjectMilestone(milestone.id, {
          actual_at: dateInputToEpoch(formValues.actual_at),
          milestone_status: formValues.milestone_status,
          notes: formValues.notes
        })
      }).filter(Boolean)

      await Promise.all(milestoneUpdates)

      setStatus('Project updated successfully.')
      await loadProject()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="stack gap-lg">
      <div className="panel hero compact">
        <p className="eyebrow">Project Details</p>
        <h2>{titleProjectNumber}</h2>
        <p>Review project core fields and update milestone progress.</p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Project Overview</h3>
          <Link to="/manager" className="ghost as-link">
            Back
          </Link>
        </div>

        {loading && <p>Loading project...</p>}
        {!loading && error && <p className="error">{error}</p>}

        {!loading && !error && project && (
          <div className="project-meta-grid">
            <p>
              <strong>Project Number:</strong> {project.project_number}
            </p>
            <p>
              <strong>Order Number:</strong> {project.order_number || '-'}
            </p>
            <p>
              <strong>Customer:</strong> {project.customer_name || '-'}
            </p>
            <p>
              <strong>Manager:</strong> {project.manager_name || '-'}
            </p>
            <p>
              <strong>Description:</strong> {project.project_description || '-'}
            </p>
            <p>
              <strong>Type:</strong> {project.type || '-'}
            </p>
          </div>
        )}
      </div>

      {!loading && !error && project && (
        <form className="panel project-details-form" onSubmit={onSubmit}>
          <h3>Project Core</h3>

          <label>
            Status
            <select
              value={projectForm.status}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              {PROJECT_STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Project Notes
            <textarea
              value={projectForm.project_notes}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, project_notes: event.target.value }))}
            />
          </label>

          <h3>Milestones</h3>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Planned</th>
                  <th>Actual</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(project.milestones ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">No milestones found for this project.</td>
                  </tr>
                )}
                {(project.milestones ?? []).map((milestone) => {
                  const formValues = milestoneForm[String(milestone.id)] ?? {
                    actual_at: '',
                    milestone_status: 'pending',
                    notes: ''
                  }

                  return (
                    <tr key={milestone.id}>
                      <td>{milestone.milestone_code}</td>
                      <td>{formatEpochDate(milestone.planned_at)}</td>
                      <td>
                        <input
                          type="date"
                          value={formValues.actual_at}
                          onChange={(event) =>
                            setMilestoneForm((prev) => ({
                              ...prev,
                              [milestone.id]: {
                                ...formValues,
                                actual_at: event.target.value
                              }
                            }))
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={formValues.milestone_status}
                          onChange={(event) =>
                            setMilestoneForm((prev) => ({
                              ...prev,
                              [milestone.id]: {
                                ...formValues,
                                milestone_status: event.target.value
                              }
                            }))
                          }
                        >
                          {MILESTONE_STATUS_OPTIONS.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={formValues.notes}
                          onChange={(event) =>
                            setMilestoneForm((prev) => ({
                              ...prev,
                              [milestone.id]: {
                                ...formValues,
                                notes: event.target.value
                              }
                            }))
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button type="submit" disabled={saving}>
            {saving ? 'Updating...' : 'Update Project'}
          </button>

          {status && <p className="success">{status}</p>}
          {error && <p className="error">{error}</p>}
        </form>
      )}
    </section>
  )
}
