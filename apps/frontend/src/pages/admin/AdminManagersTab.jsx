import { useEffect, useState } from 'react'
import {
  createManager,
  deleteManager,
  getManagersAdmin,
  updateManager
} from '../../shared/api/managers.js'
import { parseBooleanFlag, parseCsvRows } from '../../shared/batchCsv.js'

const MANAGER_ROLE_OPTIONS = [
  'Team Leader',
  'Senior Project Manager',
  'Project Manager',
  'Guest'
]

const initialForm = {
  name: '',
  fullname: '',
  email: '',
  role: 'Project Manager',
  isActive: 1,
  isAdmin: 0
}

const BATCH_HELP = 'CSV order: username, fullname, email, role, isActive, isAdmin. Allowed role values: Team Leader | Senior Project Manager | Project Manager | Guest. Use 1/0, true/false, yes/no for flags.'

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.14 12.94a7.74 7.74 0 0 0 .05-.94 7.74 7.74 0 0 0-.05-.94l2.03-1.58a.48.48 0 0 0 .12-.62l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.22 7.22 0 0 0-1.63-.94l-.36-2.54a.48.48 0 0 0-.48-.4h-3.84a.48.48 0 0 0-.48.4l-.36 2.54a7.22 7.22 0 0 0-1.63.94l-2.39-.96a.49.49 0 0 0-.59.22L2.7 8.86a.48.48 0 0 0 .12.62l2.03 1.58a7.74 7.74 0 0 0-.05.94 7.74 7.74 0 0 0 .05.94L2.82 14.52a.48.48 0 0 0-.12.62l1.92 3.32a.49.49 0 0 0 .59.22l2.39-.96c.5.39 1.05.71 1.63.94l.36 2.54a.48.48 0 0 0 .48.4h3.84a.48.48 0 0 0 .48-.4l.36-2.54c.58-.23 1.13-.55 1.63-.94l2.39.96a.49.49 0 0 0 .59-.22l1.92-3.32a.48.48 0 0 0-.12-.62zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1l-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7H4V5h4V4a1 1 0 0 1 1-1zm1 2v0h4V5h-4zM8 7l1 13h6l1-13H8zm2 2h2v9h-2V9zm4 0h2v9h-2V9z" />
    </svg>
  )
}

export default function AdminManagersTab() {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingManagerId, setEditingManagerId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showBatch, setShowBatch] = useState(false)
  const [showBatchHelp, setShowBatchHelp] = useState(false)
  const [batchInput, setBatchInput] = useState('')
  const [batchStatus, setBatchStatus] = useState('')
  const [batchError, setBatchError] = useState('')
  const [batchErrors, setBatchErrors] = useState([])

  async function loadManagers() {
    try {
      setLoading(true)
      setError('')
      const data = await getManagersAdmin()
      setManagers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadManagers()
  }, [])

  async function onSubmit(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    try {
      if (editingManagerId) {
        await updateManager(editingManagerId, form)
        setStatus('Manager updated successfully.')
      } else {
        await createManager(form)
        setStatus('Manager created successfully.')
      }

      setForm(initialForm)
      setEditingManagerId(null)
      setShowForm(false)
      await loadManagers()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onBatchImport() {
    setStatus('')
    setError('')
    setBatchStatus('')
    setBatchError('')
    setBatchErrors([])

    const rows = parseCsvRows(batchInput)
    if (rows.length === 0) {
      setBatchError('Paste at least one CSV row.')
      return
    }

    let created = 0
    const failedRows = []

    for (const row of rows) {
      const [name, fullname, email, role, isActive, isAdmin] = row.values
      if (!name || !fullname || !email || !role) {
        failedRows.push(`Row ${row.rowNumber}: username, fullname, email and role are required.`)
        continue
      }

      if (!MANAGER_ROLE_OPTIONS.includes(role)) {
        failedRows.push(`Row ${row.rowNumber}: invalid role '${role}'.`)
        continue
      }

      try {
        await createManager({
          name,
          fullname,
          email,
          role,
          isActive: parseBooleanFlag(isActive, 1),
          isAdmin: parseBooleanFlag(isAdmin, 0)
        })
        created += 1
      } catch (err) {
        failedRows.push(`Row ${row.rowNumber}: ${err.message}`)
      }
    }

    await loadManagers()

    if (failedRows.length > 0) {
      setBatchError(`Imported ${created} row(s), ${failedRows.length} failed.`)
      setBatchErrors(failedRows)
      return
    }

    setBatchStatus(`Imported ${created} manager(s) successfully.`)
    setBatchInput('')
  }

  function onEdit(manager) {
    setStatus('')
    setError('')
    setEditingManagerId(manager.id)
    setForm({
      name: manager.name ?? '',
      fullname: manager.fullname ?? '',
      email: manager.email ?? '',
      role: manager.role ?? initialForm.role,
      isActive: manager.isActive ? 1 : 0,
      isAdmin: manager.isAdmin ? 1 : 0
    })
    setShowForm(true)
  }

  async function onDelete(manager) {
    const confirmed = window.confirm(`Delete manager ${manager.fullname}?`)
    if (!confirmed) return

    setStatus('')
    setError('')

    try {
      await deleteManager(manager.id)
      setStatus('Manager deleted successfully.')
      if (editingManagerId === manager.id) {
        setForm(initialForm)
        setEditingManagerId(null)
        setShowForm(false)
      }
      await loadManagers()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack gap-lg">
      <div className="panel-header">
        <h3>Managers</h3>
        <div className="batch-actions">
          <button type="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Hide Form' : 'Add Manager'}
          </button>
          <button type="button" className="ghost" onClick={() => setShowBatch((prev) => !prev)}>
            {showBatch ? 'Hide Batch Insert' : 'Batch Insert'}
          </button>
          <button type="button" className="ghost" onClick={() => setShowBatchHelp((prev) => !prev)}>
            Help
          </button>
        </div>
      </div>

      {showBatchHelp && <p className="help-box">{BATCH_HELP}</p>}

      {showBatch && (
        <div className="panel batch-panel stack gap-md">
          <label>
            Paste CSV rows
            <textarea
              className="batch-textarea"
              value={batchInput}
              onChange={(event) => setBatchInput(event.target.value)}
              placeholder="pmike,Paul Mike,pmike@example.com,Project Manager,1,0"
            />
          </label>
          <button type="button" onClick={onBatchImport}>Import Batch</button>
          {batchStatus && <p className="success">{batchStatus}</p>}
          {batchError && <p className="error">{batchError}</p>}
          {batchErrors.length > 0 && (
            <ul className="entity-list">
              {batchErrors.map((rowError) => <li key={rowError} className="entity-row">{rowError}</li>)}
            </ul>
          )}
        </div>
      )}

      {showForm && (
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Username
            <input
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            Full Name
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
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <fieldset className="role-group">
            <legend>Role</legend>
            <div className="role-options">
              {MANAGER_ROLE_OPTIONS.map((role) => (
                <label key={role} className="radio-option">
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={form.role === role}
                    onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  />
                  {role}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked ? 1 : 0 }))}
            />
            Active
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(form.isAdmin)}
              onChange={(event) => setForm((prev) => ({ ...prev, isAdmin: event.target.checked ? 1 : 0 }))}
            />
            Admin
          </label>

          <button type="submit">{editingManagerId ? 'Update Manager' : 'Save Manager'}</button>
          {editingManagerId && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setEditingManagerId(null)
                setForm(initialForm)
                setShowForm(false)
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>
      )}

      {status && <p className="success">{status}</p>}
      {error && <p className="error">{error}</p>}

      <div className="panel-header">
        <h3>Managers List</h3>
        <button type="button" className="ghost" onClick={loadManagers}>
          Refresh
        </button>
      </div>

      {loading && <p>Loading managers...</p>}

      {!loading && (
        <ul className="manager-list">
          <li className="manager-list-header">
            <strong>Name</strong>
            <strong>Username</strong>
            <strong>Role</strong>
            <strong className="manager-actions-header">Actions</strong>
          </li>
          {managers.map((manager) => (
            <li
              key={manager.id}
              className={`manager-row${manager.isActive ? '' : ' manager-row-inactive'}`}
            >
              <strong>{manager.fullname}</strong>
              <span>@{manager.name}</span>
              <span>{manager.role}</span>
              <div className="manager-actions" aria-label={`Actions for ${manager.fullname}`}>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onEdit(manager)}
                  aria-label={`Edit ${manager.fullname}`}
                >
                  <GearIcon />
                </button>
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => onDelete(manager)}
                  aria-label={`Delete ${manager.fullname}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
