import { useEffect, useState } from 'react'
import {
  createProjectEngineer,
  deleteProjectEngineer,
  getProjectEngineers,
  updateProjectEngineer
} from '../../shared/api/projectEngineers.js'

const initialForm = {
  fullname: '',
  email: '',
  isActive: 1
}

export default function AdminProjectEngineersTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function loadRows() {
    try {
      setLoading(true)
      setError('')
      const response = await getProjectEngineers()
      setRows(response?.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [])

  async function onSubmit(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    try {
      if (editingId) {
        await updateProjectEngineer(editingId, form)
        setStatus('Project engineer updated successfully.')
      } else {
        await createProjectEngineer(form)
        setStatus('Project engineer created successfully.')
      }
      setForm(initialForm)
      setEditingId(null)
      setShowForm(false)
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  function onEdit(row) {
    setEditingId(row.id)
    setShowForm(true)
    setForm({
      fullname: row.fullname ?? '',
      email: row.email ?? '',
      isActive: row.isActive ? 1 : 0
    })
  }

  async function onDelete(row) {
    if (!window.confirm(`Delete project engineer ${row.fullname}?`)) return
    setStatus('')
    setError('')
    try {
      await deleteProjectEngineer(row.id)
      setStatus('Project engineer deleted successfully.')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack gap-lg">
      <div className="panel-header">
        <h3>Project Engineers</h3>
        <button type="button" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? 'Hide Form' : 'Add Project Engineer'}
        </button>
      </div>

      {showForm && (
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Name
            <input
              required
              value={form.fullname}
              onChange={(event) => setForm((prev) => ({ ...prev, fullname: event.target.value }))}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked ? 1 : 0 }))}
            />
            Active
          </label>

          <button type="submit">{editingId ? 'Update Project Engineer' : 'Save Project Engineer'}</button>
        </form>
      )}

      {status && <p className="success">{status}</p>}
      {error && <p className="error">{error}</p>}

      <div className="panel-header">
        <h3>Project Engineers List</h3>
        <button type="button" className="ghost" onClick={loadRows}>Refresh</button>
      </div>

      {loading && <p>Loading project engineers...</p>}

      {!loading && (
        <ul className="entity-list">
          {rows.length === 0 && <li className="entity-row empty">No project engineers yet.</li>}
          {rows.map((row) => (
            <li key={row.id} className="entity-row">
              <div>
                <strong>{row.fullname}</strong>
                <p>{row.email || '-'}</p>
              </div>
              <span>{row.isActive ? 'Active' : 'Inactive'}</span>
              <span />
              <div className="entity-actions">
                <button type="button" className="ghost" onClick={() => onEdit(row)}>Edit</button>
                <button type="button" className="ghost danger-text" onClick={() => onDelete(row)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
