import { useEffect, useState } from 'react'
import {
  createSalesManager,
  deleteSalesManager,
  getSalesManagers,
  updateSalesManager
} from '../../shared/api/salesManagers.js'

const initialForm = {
  fullname: '',
  email: '',
  isActive: 1
}

export default function AdminSalesManagersTab() {
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
      const response = await getSalesManagers()
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
        await updateSalesManager(editingId, form)
        setStatus('Sales manager updated successfully.')
      } else {
        await createSalesManager(form)
        setStatus('Sales manager created successfully.')
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
    if (!window.confirm(`Delete sales manager ${row.fullname}?`)) return
    setStatus('')
    setError('')
    try {
      await deleteSalesManager(row.id)
      setStatus('Sales manager deleted successfully.')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack gap-lg">
      <div className="panel-header">
        <h3>Sales Managers</h3>
        <button type="button" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? 'Hide Form' : 'Add Sales Manager'}
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

          <button type="submit">{editingId ? 'Update Sales Manager' : 'Save Sales Manager'}</button>
        </form>
      )}

      {status && <p className="success">{status}</p>}
      {error && <p className="error">{error}</p>}

      <div className="panel-header">
        <h3>Sales Managers List</h3>
        <button type="button" className="ghost" onClick={loadRows}>Refresh</button>
      </div>

      {loading && <p>Loading sales managers...</p>}

      {!loading && (
        <ul className="entity-list">
          {rows.length === 0 && <li className="entity-row empty">No sales managers yet.</li>}
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
