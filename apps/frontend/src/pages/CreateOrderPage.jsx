import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getCustomers } from '../shared/api/customers.js'
import { getFacilities } from '../shared/api/facilities.js'
import { getProjectEngineers } from '../shared/api/projectEngineers.js'
import { createProject } from '../shared/api/projects.js'
import { getSalesManagers } from '../shared/api/salesManagers.js'
import { createOrder } from '../shared/api/orders.js'
import { useSelectedManager } from '../state/selectedManager.context.jsx'

function createEmptyLine() {
  return {
    lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    project_number: '',
    project_description: '',
    type: '1'
  }
}

const initialOrderForm = {
  type: '0',
  order_number: '',
  order_received_date: '',
  project_manager_id: '',
  sales_manager_id: '',
  project_engineer_id: '',
  customer_id: '',
  ship_to_facility_id: '',
  quote_ref: '',
  po_ref: '',
  payment_terms: '',
  delivery_terms: '',
  penalty: 0,
  penalty_notes: ''
}

export default function CreateOrderPage() {
  const { selectedManager } = useSelectedManager()
  const [orderForm, setOrderForm] = useState(initialOrderForm)
  const [projectLines, setProjectLines] = useState([createEmptyLine()])
  const [customers, setCustomers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [salesManagers, setSalesManagers] = useState([])
  const [projectEngineers, setProjectEngineers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedManager?.id) return

    async function loadDependencies() {
      try {
        setLoading(true)
        setError('')

        const [customersResponse, facilitiesResponse, salesResponse, engineersResponse] = await Promise.all([
          getCustomers(),
          getFacilities(),
          getSalesManagers(),
          getProjectEngineers()
        ])

        setCustomers(customersResponse?.data ?? [])
        setFacilities(facilitiesResponse?.data ?? [])
        setSalesManagers(salesResponse?.data ?? [])
        setProjectEngineers(engineersResponse?.data ?? [])

        setOrderForm((prev) => ({
          ...prev,
          project_manager_id: String(selectedManager.id)
        }))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadDependencies()
  }, [selectedManager])

  const visibleFacilities = useMemo(() => {
    if (!orderForm.customer_id) return []
    return facilities.filter((facility) => String(facility.customer_id) === String(orderForm.customer_id))
  }, [facilities, orderForm.customer_id])

  if (!selectedManager?.id) {
    return <Navigate to="/login" replace />
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

  function validateBeforeSubmit() {
    if (projectLines.length === 0) return 'At least one project line is required.'
    if (!/^([A-Za-z]{2}\d{2}-\d{6})$/.test(orderForm.order_number)) {
      return 'Order number must match format AA00-000000.'
    }

    const seenProjectNumbers = new Set()
    for (const line of projectLines) {
      if (!/^\d{6}$/.test(line.project_number)) return 'Each project number must be exactly 6 digits.'
      if (!line.project_description.trim()) return 'Each project line requires a description.'
      if (seenProjectNumbers.has(line.project_number)) {
        return `Duplicate project number in lines: ${line.project_number}`
      }
      seenProjectNumbers.add(line.project_number)
    }

    return ''
  }

  async function onSubmit(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    const validationError = validateBeforeSubmit()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSubmitting(true)

      const orderResult = await createOrder({
        type: Number(orderForm.type),
        order_number: orderForm.order_number,
        order_received_date: Date.parse(orderForm.order_received_date),
        project_manager_id: Number(orderForm.project_manager_id),
        sales_manager_id: Number(orderForm.sales_manager_id),
        project_engineer_id: Number(orderForm.project_engineer_id),
        ship_to_facility_id: Number(orderForm.ship_to_facility_id),
        customer_id: Number(orderForm.customer_id),
        quote_ref: orderForm.quote_ref,
        po_ref: orderForm.po_ref || null,
        payment_terms: orderForm.payment_terms,
        delivery_terms: orderForm.delivery_terms,
        penalty: Number(orderForm.penalty),
        penalty_notes: orderForm.penalty ? orderForm.penalty_notes : null
      })

      const createdOrderId = orderResult?.id
      const lineResults = await Promise.all(
        projectLines.map(async (line) => {
          try {
            await createProject({
              order_id: createdOrderId,
              project_number: line.project_number,
              project_description: line.project_description,
              type: Number(line.type)
            })
            return { lineId: line.lineId, ok: true }
          } catch (lineError) {
            return { lineId: line.lineId, ok: false, error: lineError.message, project_number: line.project_number }
          }
        })
      )

      const failedLines = lineResults.filter((item) => !item.ok)
      if (failedLines.length === 0) {
        setStatus(`Order ${orderForm.order_number} created with ${projectLines.length} project line(s).`)
        setOrderForm({
          ...initialOrderForm,
          project_manager_id: String(selectedManager.id)
        })
        setProjectLines([createEmptyLine()])
        return
      }

      const successCount = lineResults.length - failedLines.length
      const failedText = failedLines
        .map((line) => `${line.project_number || 'line'} (${line.error})`)
        .join('; ')
      setStatus(`Order ${orderForm.order_number} created. ${successCount} line(s) created, ${failedLines.length} failed.`)
      setError(`Failed line(s): ${failedText}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="stack gap-lg">
      <div className="panel hero compact">
        <p className="eyebrow">Order Intake</p>
        <h2>Create Order</h2>
        <p>Create one order and add multiple project lines to it.</p>
      </div>

      <form className="panel form-grid create-order-grid" onSubmit={onSubmit}>
        <div className="panel-header">
          <h3>Order Header</h3>
          <Link to="/manager" className="ghost as-link">Back</Link>
        </div>

        <label>
          Order Type
          <select
            required
            value={orderForm.type}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, type: event.target.value }))}
          >
            <option value="0">Normal</option>
            <option value="1">Internal</option>
          </select>
        </label>

        <label>
          Order Number
          <input
            required
            placeholder="US01-123456"
            value={orderForm.order_number}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, order_number: event.target.value }))}
          />
        </label>

        <label>
          Received Date
          <input
            required
            type="date"
            value={orderForm.order_received_date}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, order_received_date: event.target.value }))}
          />
        </label>

        <label>
          Project Manager
          <input value={selectedManager.fullname} disabled />
        </label>

        <label>
          Sales Manager
          <select
            required
            value={orderForm.sales_manager_id}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, sales_manager_id: event.target.value }))}
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
            value={orderForm.project_engineer_id}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, project_engineer_id: event.target.value }))}
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
            required
            value={orderForm.customer_id}
            onChange={(event) =>
              setOrderForm((prev) => ({
                ...prev,
                customer_id: event.target.value,
                ship_to_facility_id: ''
              }))
            }
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
            required
            value={orderForm.ship_to_facility_id}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, ship_to_facility_id: event.target.value }))}
          >
            <option value="">Select facility...</option>
            {visibleFacilities.map((item) => (
              <option key={item.id} value={item.id}>{item.plant_name}</option>
            ))}
          </select>
        </label>

        <label>
          Quote No.
          <input
            required
            value={orderForm.quote_ref}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, quote_ref: event.target.value }))}
          />
        </label>

        <label>
          Purchace Order No.
          <input
            value={orderForm.po_ref}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, po_ref: event.target.value }))}
          />
        </label>

        <label>
          Payment Terms
          <input
            required
            value={orderForm.payment_terms}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, payment_terms: event.target.value }))}
          />
        </label>

        <label>
          Delivery Terms
          <input
            required
            value={orderForm.delivery_terms}
            onChange={(event) => setOrderForm((prev) => ({ ...prev, delivery_terms: event.target.value }))}
          />
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={Boolean(orderForm.penalty)}
            onChange={(event) =>
              setOrderForm((prev) => ({
                ...prev,
                penalty: event.target.checked ? 1 : 0,
                penalty_notes: event.target.checked ? prev.penalty_notes : ''
              }))
            }
          />
          Penalties
        </label>

        {Boolean(orderForm.penalty) && (
          <label>
            Penalties Notes
            <textarea
              value={orderForm.penalty_notes}
              onChange={(event) => setOrderForm((prev) => ({ ...prev, penalty_notes: event.target.value }))}
            />
          </label>
        )}
        
        <div className='project-line-wrap'>
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
                  <th>Project #</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {projectLines.map((line) => (
                  <tr key={line.lineId}>
                    <td>
                      <input
                        required
                        placeholder="123456"
                        value={line.project_number}
                        onChange={(event) =>
                          updateLine(line.lineId, { project_number: event.target.value.replace(/\D/g, '').slice(0, 6) })
                        }
                      />
                    </td>
                    <td>
                      <input
                        required
                        value={line.project_description}
                        onChange={(event) =>
                          updateLine(line.lineId, { project_description: event.target.value })
                        }
                      />
                    </td>
                    <td>
                      <select
                        required
                        value={line.type}
                        onChange={(event) => updateLine(line.lineId, { type: event.target.value })}
                      >
                        <option value="1">Machine</option>
                        <option value="2">Auxiliary</option>
                        <option value="3">Mold</option>
                      </select>
                    </td>
                    <td>
                      <button type="button" className="ghost" onClick={() => removeLine(line.lineId)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button type="submit" disabled={loading || submitting || !orderForm.project_manager_id}>
          {submitting ? 'Saving...' : 'Create Order and Lines'}
        </button>

        {loading && <p>Loading dependencies...</p>}
        {status && <p className="success">{status}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  )
}
