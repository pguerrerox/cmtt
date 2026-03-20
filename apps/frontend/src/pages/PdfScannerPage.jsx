import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getManagersPublic } from '../shared/api/managers.js'
import { getSalesManagers } from '../shared/api/salesManagers.js'
import { getProjectEngineers } from '../shared/api/projectEngineers.js'
import { getCustomers } from '../shared/api/customers.js'
import { getFacilities } from '../shared/api/facilities.js'
import { commitPdfDraft, scanPdfFile } from '../shared/api/pdfScanner.js'
import { useSelectedManager } from '../state/selectedManager.context.jsx'

function epochToDateInput(epoch) {
  const value = Number(epoch)
  if (!Number.isFinite(value) || value <= 0) return ''
  const iso = new Date(value).toISOString()
  return iso.slice(0, 10)
}

function dateInputToEpoch(value) {
  if (!value) return Date.now()
  return Date.parse(`${value}T00:00:00Z`)
}

function createEmptyLine() {
  return {
    lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    accepted: true,
    project_number: '',
    project_description: '',
    type: 1,
    sales_price: ''
  }
}

function withLineIds(lines) {
  return (lines ?? []).map((line) => ({
    lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    accepted: line.accepted !== false,
    project_number: line.project_number ?? '',
    project_description: line.project_description ?? '',
    type: Number(line.type ?? 1),
    sales_price: Number.isInteger(line.sales_price) ? String(line.sales_price) : ''
  }))
}

export default function PdfScannerPage() {
  const { selectedManager } = useSelectedManager()
  const [managers, setManagers] = useState([])
  const [salesManagers, setSalesManagers] = useState([])
  const [projectEngineers, setProjectEngineers] = useState([])
  const [customers, setCustomers] = useState([])
  const [facilities, setFacilities] = useState([])

  const [pdfFile, setPdfFile] = useState(null)
  const [scanJobId, setScanJobId] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [warnings, setWarnings] = useState([])
  const [errors, setErrors] = useState([])
  const [draft, setDraft] = useState(null)
  const [projectLines, setProjectLines] = useState([createEmptyLine()])

  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedManager?.id) return

    async function loadDependencies() {
      try {
        setLoading(true)
        setError('')

        const [
          managersResponse,
          salesResponse,
          engineersResponse,
          customersResponse,
          facilitiesResponse
        ] = await Promise.all([
          getManagersPublic(),
          getSalesManagers(),
          getProjectEngineers(),
          getCustomers(),
          getFacilities()
        ])

        setManagers(managersResponse ?? [])
        setSalesManagers(salesResponse?.data ?? [])
        setProjectEngineers(engineersResponse?.data ?? [])
        setCustomers(customersResponse?.data ?? [])
        setFacilities(facilitiesResponse?.data ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadDependencies()
  }, [selectedManager])

  const visibleFacilities = useMemo(() => {
    if (!draft?.order?.customer_id) return []
    return facilities.filter((item) => String(item.customer_id) === String(draft.order.customer_id))
  }, [facilities, draft?.order?.customer_id])

  if (!selectedManager?.id) {
    return <Navigate to="/login" replace />
  }

  function updateOrderField(field, value) {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        order: {
          ...prev.order,
          [field]: value
        }
      }
    })
  }

  function updateLine(lineId, patch) {
    setProjectLines((prev) => prev.map((line) => (line.lineId === lineId ? { ...line, ...patch } : line)))
  }

  function removeLine(lineId) {
    setProjectLines((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((line) => line.lineId !== lineId)
    })
  }

  function buildCommitDraft() {
    if (!draft) return null
    return {
      ...draft,
      order: {
        ...draft.order,
        type: Number(draft.order.type),
        order_received_date: Number(draft.order.order_received_date),
        project_manager_id: Number(draft.order.project_manager_id),
        sales_manager_id: Number(draft.order.sales_manager_id),
        project_engineer_id: Number(draft.order.project_engineer_id),
        ship_to_facility_id: Number(draft.order.ship_to_facility_id),
        customer_id: Number(draft.order.customer_id),
        penalty: Number(draft.order.penalty)
      },
      projects: projectLines.map((line) => ({
        project_number: String(line.project_number || '').trim(),
        project_description: String(line.project_description || '').trim(),
        type: Number(line.type),
        sales_price: line.sales_price === '' ? null : Number.parseInt(String(line.sales_price), 10),
        accepted: Boolean(line.accepted)
      }))
    }
  }

  async function onScanSubmit(event) {
    event.preventDefault()
    if (!pdfFile) {
      setError('Please choose a PDF file first.')
      return
    }

    try {
      setScanning(true)
      setStatus('')
      setError('')

      const result = await scanPdfFile(pdfFile, selectedManager.username)
      const nextDraft = {
        ...result.draft,
        order: {
          ...result.draft.order,
          project_manager_id: Number(result.draft.order.project_manager_id) || Number(selectedManager.id)
        }
      }

      setScanJobId(result.scan_job_id)
      setDraft(nextDraft)
      setProjectLines(withLineIds(nextDraft.projects).length > 0 ? withLineIds(nextDraft.projects) : [createEmptyLine()])
      setRecommendations(result.recommendations ?? [])
      setWarnings(result.warnings ?? [])
      setErrors(result.errors ?? [])
      setStatus(`PDF scanned. Job #${result.scan_job_id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  async function onCommitSubmit(event) {
    event.preventDefault()
    if (!draft) return

    try {
      setCommitting(true)
      setStatus('')
      setError('')

      const commitDraft = buildCommitDraft()
      const result = await commitPdfDraft({
        scan_job_id: scanJobId,
        draft: commitDraft,
        committed_by: selectedManager.username
      })

      setStatus(
        result.idempotent_reuse
          ? `Order already existed. Reused order #${result.order_id}.`
          : `Order created successfully (#${result.order_id}) with ${result.project_ids.length} project line(s).`
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <section className="stack gap-lg">
      <div className="panel hero compact">
        <p className="eyebrow">PDF Scanner</p>
        <h2>Upload Order PDF</h2>
        <p>Scan a standardized order PDF, review extracted data, edit it, and commit to create order lines.</p>
      </div>

      <form className="panel form-grid" onSubmit={onScanSubmit}>
        <div className="panel-header">
          <h3>Scan</h3>
          <Link to="/manager" className="ghost as-link">Back</Link>
        </div>
        <label>
          PDF File (PDF)
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={loading || scanning}>
          {scanning ? 'Scanning...' : 'Scan Order'}
        </button>
      </form>

      {draft && (
        <form className="panel form-grid create-order-grid" onSubmit={onCommitSubmit}>
          <div className="panel-header">
            <h3>Editable Draft</h3>
            <span>Job #{scanJobId}</span>
          </div>

          <label>
            Order Type
            <select
              value={String(draft.order.type)}
              onChange={(event) => updateOrderField('type', Number(event.target.value))}
            >
              <option value="0">Normal</option>
              <option value="1">Internal</option>
            </select>
          </label>

          <label>
            Order Number
            <input
              value={draft.order.order_number}
              onChange={(event) => updateOrderField('order_number', event.target.value)}
            />
          </label>

          <label>
            Received Date
            <input
              type="date"
              value={epochToDateInput(draft.order.order_received_date)}
              onChange={(event) => updateOrderField('order_received_date', dateInputToEpoch(event.target.value))}
            />
          </label>

          <label>
            Project Manager
            <select
              value={String(draft.order.project_manager_id || '')}
              onChange={(event) => updateOrderField('project_manager_id', Number(event.target.value))}
            >
              <option value="">Select manager...</option>
              {managers.map((item) => (
                <option key={item.id} value={item.id}>{item.fullname}</option>
              ))}
            </select>
          </label>

          <label>
            Sales Manager
            <select
              value={String(draft.order.sales_manager_id || '')}
              onChange={(event) => updateOrderField('sales_manager_id', Number(event.target.value))}
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
              value={String(draft.order.project_engineer_id || '')}
              onChange={(event) => updateOrderField('project_engineer_id', Number(event.target.value))}
            >
              <option value="">Select project engineer...</option>
              {projectEngineers.map((item) => (
                <option key={item.id} value={item.id}>{item.fullname}</option>
              ))}
            </select>
          </label>

          <label>
            Customer
            <select
              value={String(draft.order.customer_id || '')}
              onChange={(event) => {
                updateOrderField('customer_id', Number(event.target.value))
                updateOrderField('ship_to_facility_id', 0)
              }}
            >
              <option value="">Select customer...</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label>
            Ship-to Facility
            <select
              value={String(draft.order.ship_to_facility_id || '')}
              onChange={(event) => updateOrderField('ship_to_facility_id', Number(event.target.value))}
            >
              <option value="">Select facility...</option>
              {visibleFacilities.map((item) => (
                <option key={item.id} value={item.id}>{item.plant_name}</option>
              ))}
            </select>
          </label>

          <label>
            Quote Ref
            <input
              value={draft.order.quote_ref || ''}
              onChange={(event) => updateOrderField('quote_ref', event.target.value)}
            />
          </label>

          <label>
            PO Ref
            <input
              value={draft.order.po_ref || ''}
              onChange={(event) => updateOrderField('po_ref', event.target.value || null)}
            />
          </label>

          <label>
            Payment Terms
            <input
              value={draft.order.payment_terms || ''}
              onChange={(event) => updateOrderField('payment_terms', event.target.value)}
            />
          </label>

          <label>
            Delivery Terms
            <input
              value={draft.order.delivery_terms || ''}
              onChange={(event) => updateOrderField('delivery_terms', event.target.value)}
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(draft.order.penalty)}
              onChange={(event) => updateOrderField('penalty', event.target.checked ? 1 : 0)}
            />
            Penalties
          </label>

          <div className="project-line-wrap">
            <div className="panel-header">
              <h3>Project Lines</h3>
              <button type="button" className="ghost" onClick={() => setProjectLines((prev) => [...prev, createEmptyLine()])}>
                Add Line
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Accept</th>
                    <th>Project #</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Sales Price (cents)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {projectLines.map((line) => (
                    <tr key={line.lineId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(line.accepted)}
                          onChange={(event) => updateLine(line.lineId, { accepted: event.target.checked })}
                        />
                      </td>
                      <td>
                        <input
                          value={line.project_number}
                          onChange={(event) => updateLine(line.lineId, { project_number: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                        />
                      </td>
                      <td>
                        <input
                          value={line.project_description}
                          onChange={(event) => updateLine(line.lineId, { project_description: event.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          value={String(line.type)}
                          onChange={(event) => updateLine(line.lineId, { type: Number(event.target.value) })}
                        >
                          <option value="1">Machine</option>
                          <option value="2">Auxiliary</option>
                          <option value="3">Mold</option>
                        </select>
                      </td>
                      <td>
                        <input
                          inputMode="numeric"
                          value={line.sales_price}
                          onChange={(event) => updateLine(line.lineId, { sales_price: event.target.value.replace(/\D/g, '') })}
                        />
                      </td>
                      <td>
                        <button type="button" className="ghost" onClick={() => removeLine(line.lineId)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button type="submit" disabled={committing}>
            {committing ? 'Committing...' : 'Confirm and Create Order'}
          </button>
        </form>
      )}

      {warnings.length > 0 && (
        <div className="panel">
          <h3>Warnings</h3>
          <ul>
            {warnings.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      {errors.length > 0 && (
        <div className="panel">
          <h3>Scan Errors</h3>
          <ul>
            {errors.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="panel">
          <h3>Related Projects</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project #</th>
                  <th>Description</th>
                  <th>Order #</th>
                  <th>Score</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((item) => (
                  <tr key={item.project_id}>
                    <td>{item.project_number}</td>
                    <td>{item.project_description}</td>
                    <td>{item.order_number}</td>
                    <td>{item.score}</td>
                    <td>{(item.reasons ?? []).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <p>Loading dependencies...</p>}
      {status && <p className="success">{status}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
