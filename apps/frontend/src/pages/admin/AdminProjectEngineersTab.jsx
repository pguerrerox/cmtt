import { useEffect, useState } from 'react'
import {
  createProjectEngineer,
  deleteProjectEngineer,
  getProjectEngineers,
  updateProjectEngineer
} from '../../shared/api/projectEngineers.js'
import { parseBooleanFlag, parseCsvRows } from '../../shared/batchCsv.js'

const initialForm = {
  fullname: '',
  email: '',
  isActive: 1
}

const BATCH_HELP = 'CSV order: fullname, email, isActive. isActive accepts 1/0, true/false, yes/no.'

export default function AdminProjectEngineersTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [showBatch, setShowBatch] = useState(false)
  const [showBatchHelp, setShowBatchHelp] = useState(false)
  const [batchInput, setBatchInput] = useState('')
  const [batchStatus, setBatchStatus] = useState('')
  const [batchError, setBatchError] = useState('')
  const [batchErrors, setBatchErrors] = useState([])

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
      const [fullname, email, isActive] = row.values
      if (!fullname) {
        failedRows.push(`Row ${row.rowNumber}: fullname is required.`)
        continue
      }

      try {
        await createProjectEngineer({
          fullname,
          email,
          isActive: parseBooleanFlag(isActive, 1)
        })
        created += 1
      } catch (err) {
        failedRows.push(`Row ${row.rowNumber}: ${err.message}`)
      }
    }

    await loadRows()

    if (failedRows.length > 0) {
      setBatchError(`Imported ${created} row(s), ${failedRows.length} failed.`)
      setBatchErrors(failedRows)
      return
    }

    setBatchStatus(`Imported ${created} project engineer(s) successfully.`)
    setBatchInput('')
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
        <div className="batch-actions">
          <button type="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Hide Form' : 'Add Project Engineer'}
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
              placeholder="John Doe,john.doe@example.com,1"
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
