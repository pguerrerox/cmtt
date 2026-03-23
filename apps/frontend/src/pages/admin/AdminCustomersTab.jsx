import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer
} from '../../shared/api/customers.js'
import { createFacility } from '../../shared/api/facilities.js'
import { getManagersPublic } from '../../shared/api/managers.js'
import { getProjectEngineers } from '../../shared/api/projectEngineers.js'
import { getSalesManagers } from '../../shared/api/salesManagers.js'
import { parseCsvRows } from '../../shared/batchCsv.js'

const initialForm = {
  name: '',
  headquarters_address: '',
  headquarter_contacts: '',
  project_manager_id: '',
  sales_manager_id: '',
  project_engineer_id: ''
}

const CUSTOMER_BATCH_HELP = 'CSV order: customer_name, headquarters_address, headquarter_contacts, project_manager_username, sales_manager_email, project_engineer_email, site_name, site_address, site_contacts. One row = one site.'

function toNullableId(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function AdminCustomersTab() {
  const [rows, setRows] = useState([])
  const [projectManagers, setProjectManagers] = useState([])
  const [salesManagers, setSalesManagers] = useState([])
  const [projectEngineers, setProjectEngineers] = useState([])
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

  async function loadDependencies() {
    const [managerResponse, salesResponse, engineerResponse] = await Promise.all([
      getManagersPublic(),
      getSalesManagers(),
      getProjectEngineers()
    ])
    setProjectManagers(managerResponse ?? [])
    setSalesManagers(salesResponse?.data ?? [])
    setProjectEngineers(engineerResponse?.data ?? [])
  }

  async function loadRows() {
    try {
      setLoading(true)
      setError('')
      const response = await getCustomers()
      setRows(response?.data ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      await Promise.all([loadRows(), loadDependencies()])
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function onSubmit(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    const payload = {
      name: form.name,
      headquarters_address: form.headquarters_address,
      headquarter_contacts: form.headquarter_contacts,
      project_manager_id: toNullableId(form.project_manager_id),
      sales_manager_id: toNullableId(form.sales_manager_id),
      project_engineer_id: toNullableId(form.project_engineer_id)
    }

    try {
      if (editingId) {
        await updateCustomer(editingId, payload)
        setStatus('Customer updated successfully.')
      } else {
        await createCustomer(payload)
        setStatus('Customer created successfully.')
      }
      setEditingId(null)
      setForm(initialForm)
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

    const parsedRows = parseCsvRows(batchInput)
    if (parsedRows.length === 0) {
      setBatchError('Paste at least one CSV row.')
      return
    }

    const managerByUsername = new Map(
      projectManagers
        .map((item) => [String(item.username ?? item.name ?? '').trim().toLowerCase(), item.id])
        .filter(([key]) => Boolean(key))
    )
    const salesByEmail = new Map(
      salesManagers
        .map((item) => [String(item.email ?? '').trim().toLowerCase(), item.id])
        .filter(([key]) => Boolean(key))
    )
    const engineersByEmail = new Map(
      projectEngineers
        .map((item) => [String(item.email ?? '').trim().toLowerCase(), item.id])
        .filter(([key]) => Boolean(key))
    )

    const customerByName = new Map(
      rows
        .map((item) => [String(item.name ?? '').trim().toLowerCase(), item.id])
        .filter(([key]) => Boolean(key))
    )

    let customersCreated = 0
    let sitesCreated = 0
    const failedRows = []

    for (const row of parsedRows) {
      const [
        customerName,
        headquartersAddress,
        headquarterContacts,
        managerUsername,
        salesEmail,
        engineerEmail,
        siteName,
        siteAddress,
        siteContacts
      ] = row.values

      if (!customerName || !headquartersAddress || !headquarterContacts || !managerUsername || !salesEmail || !engineerEmail || !siteName || !siteAddress || !siteContacts) {
        failedRows.push(`Row ${row.rowNumber}: all 9 columns are required.`)
        continue
      }

      const managerId = managerByUsername.get(managerUsername.toLowerCase())
      const salesId = salesByEmail.get(salesEmail.toLowerCase())
      const engineerId = engineersByEmail.get(engineerEmail.toLowerCase())

      if (!managerId) {
        failedRows.push(`Row ${row.rowNumber}: manager username '${managerUsername}' not found.`)
        continue
      }

      if (!salesId) {
        failedRows.push(`Row ${row.rowNumber}: sales manager email '${salesEmail}' not found.`)
        continue
      }

      if (!engineerId) {
        failedRows.push(`Row ${row.rowNumber}: project engineer email '${engineerEmail}' not found.`)
        continue
      }

      const customerKey = customerName.toLowerCase()
      let customerId = customerByName.get(customerKey)

      if (!customerId) {
        try {
          await createCustomer({
            name: customerName,
            headquarters_address: headquartersAddress,
            headquarter_contacts: headquarterContacts,
            project_manager_id: managerId,
            sales_manager_id: salesId,
            project_engineer_id: engineerId
          })

          const refreshCustomers = await getCustomers()
          const inserted = (refreshCustomers?.data ?? []).find(
            (item) => String(item.name ?? '').trim().toLowerCase() === customerKey
          )

          if (!inserted?.id) {
            failedRows.push(`Row ${row.rowNumber}: customer '${customerName}' created but not found for site linkage.`)
            continue
          }

          customerId = inserted.id
          customerByName.set(customerKey, customerId)
          customersCreated += 1
        } catch (err) {
          failedRows.push(`Row ${row.rowNumber}: ${err.message}`)
          continue
        }
      }

      try {
        await createFacility({
          customer_id: customerId,
          name: siteName,
          address: siteAddress,
          contacts: siteContacts
        })
        sitesCreated += 1
      } catch (err) {
        failedRows.push(`Row ${row.rowNumber}: ${err.message}`)
      }
    }

    await loadRows()

    if (failedRows.length > 0) {
      setBatchError(`Created ${customersCreated} customer(s), ${sitesCreated} site(s); ${failedRows.length} row(s) failed.`)
      setBatchErrors(failedRows)
      return
    }

    setBatchStatus(`Created ${customersCreated} customer(s) and ${sitesCreated} site(s).`)
    setBatchInput('')
  }

  function onEdit(row) {
    setEditingId(row.id)
    setShowForm(true)
    setStatus('')
    setError('')
    setForm({
      name: row.name ?? '',
      headquarters_address: row.headquarters_address ?? '',
      headquarter_contacts: row.headquarter_contacts ?? '',
      project_manager_id: row.project_manager_id ? String(row.project_manager_id) : '',
      sales_manager_id: row.sales_manager_id ? String(row.sales_manager_id) : '',
      project_engineer_id: row.project_engineer_id ? String(row.project_engineer_id) : ''
    })
  }

  async function onDelete(row) {
    if (!window.confirm(`Delete customer ${row.name}?`)) return
    setStatus('')
    setError('')
    try {
      await deleteCustomer(row.id)
      setStatus('Customer deleted successfully.')
      await loadRows()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="stack gap-lg">
      <div className="panel-header">
        <h3>Customers</h3>
        <div className="batch-actions">
          <button type="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Hide Form' : 'Add Customer'}
          </button>
          <button type="button" className="ghost" onClick={() => setShowBatch((prev) => !prev)}>
            {showBatch ? 'Hide Batch Insert' : 'Batch Insert'}
          </button>
          <button type="button" className="ghost" onClick={() => setShowBatchHelp((prev) => !prev)}>
            Help
          </button>
        </div>
      </div>

      {showBatchHelp && <p className="help-box">{CUSTOMER_BATCH_HELP}</p>}

      {showBatch && (
        <div className="panel batch-panel stack gap-md">
          <label>
            Paste CSV rows (customer + site)
            <textarea
              className="batch-textarea"
              value={batchInput}
              onChange={(event) => setBatchInput(event.target.value)}
              placeholder="ACME,USA HQ,ops@acme.com,pmike,sales@acme.com,eng@acme.com,Plant A,Address A,plant-a@acme.com"
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
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            Headquarters Address
            <input
              required
              value={form.headquarters_address}
              onChange={(event) => setForm((prev) => ({ ...prev, headquarters_address: event.target.value }))}
            />
          </label>

          <label>
            Headquarters Contacts
            <textarea
              required
              value={form.headquarter_contacts}
              onChange={(event) => setForm((prev) => ({ ...prev, headquarter_contacts: event.target.value }))}
            />
          </label>

          <label>
            Project Manager
            <select
              required
              value={form.project_manager_id}
              onChange={(event) => setForm((prev) => ({ ...prev, project_manager_id: event.target.value }))}
            >
              <option value="">Select project manager...</option>
              {projectManagers.map((item) => (
                <option key={item.id} value={item.id}>{item.fullname}</option>
              ))}
            </select>
          </label>

          <label>
            Sales Manager
            <select
              required
              value={form.sales_manager_id}
              onChange={(event) => setForm((prev) => ({ ...prev, sales_manager_id: event.target.value }))}
            >
              <option value="">Select sales manager...</option>
              {salesManagers.map((item) => (
                <option key={item.id} value={item.id}>{item.fullname}</option>
              ))}
            </select>
          </label>

          <label>
            Project Engineer
            <select
              required
              value={form.project_engineer_id}
              onChange={(event) => setForm((prev) => ({ ...prev, project_engineer_id: event.target.value }))}
            >
              <option value="">Select project engineer...</option>
              {projectEngineers.map((item) => (
                <option key={item.id} value={item.id}>{item.fullname}</option>
              ))}
            </select>
          </label>

          <button type="submit">{editingId ? 'Update Customer' : 'Save Customer'}</button>
        </form>
      )}

      {status && <p className="success">{status}</p>}
      {error && <p className="error">{error}</p>}

      <div className="panel-header">
        <h3>Customers List</h3>
        <button type="button" className="ghost" onClick={loadRows}>Refresh</button>
      </div>

      {loading && <p>Loading customers...</p>}

      {!loading && (
        <ul className="entity-list">
          {rows.length === 0 && <li className="entity-row empty">No customers yet.</li>}
          {rows.map((row) => (
            <li key={row.id} className="entity-row">
              <Link to={`/admin/customers/${row.id}`} className="entity-link">
                <strong>{row.name}</strong>
                <p>{row.headquarters_address || '-'}</p>
              </Link>
              <span>{row.sales_manager_name || '-'}</span>
              <span>{row.project_engineer_name || '-'}</span>
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
