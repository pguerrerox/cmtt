import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { createProject, getOrders } from '../shared/api/projects.js'
import { useSelectedManager } from '../state/selectedManager.context.jsx'

const initialForm = {
  order_id: '',
  project_number: '',
  project_description: '',
  type: '1'
}

export default function CreateProjectPage() {
  const navigate = useNavigate()
  const { selectedManager } = useSelectedManager()

  const [orders, setOrders] = useState([])
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true)
        setError('')
        const response = await getOrders()
        setOrders(response?.data ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  const visibleOrders = useMemo(() => {
    if (!selectedManager) return []
    if (selectedManager.role === 'Team Leader') return orders
    return orders.filter((order) => String(order.project_manager_id) === String(selectedManager.id))
  }, [orders, selectedManager])

  if (!selectedManager?.id) {
    return <Navigate to="/login" replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    setStatus('')

    try {
      const result = await createProject({
        order_id: Number(form.order_id),
        project_number: form.project_number,
        project_description: form.project_description,
        type: Number(form.type)
      })
      setStatus(`Project created (${result.lookup_status}). Redirecting to Manager view...`)
      setForm(initialForm)
      setTimeout(() => navigate('/manager'), 1000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="stack gap-lg">
      <div className="panel hero compact">
        <p className="eyebrow">Project Intake</p>
        <h2>Create Project</h2>
        <p>Pick an order and create the project core record. Planned operations are enriched by backend workers.</p>
      </div>

      <form className="panel form-grid" onSubmit={onSubmit}>
        <div className="panel-header">
          <h3>New Project</h3>
          <Link to="/manager" className="ghost as-link">
            Back
          </Link>
        </div>

        <label>
          Order
          <select
            required
            value={form.order_id}
            onChange={(event) => setForm((prev) => ({ ...prev, order_id: event.target.value }))}
          >
            <option value="">Select order...</option>
            {visibleOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.order_number} - {order.snapshot_customer_name || 'No customer'}
              </option>
            ))}
          </select>
        </label>

        <label>
          Project Number
          <input
            required
            value={form.project_number}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, project_number: event.target.value.trim() }))
            }
          />
        </label>

        <label>
          Project Type
          <select
            required
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          >
            <option value="1">Machine</option>
            <option value="2">Auxiliary</option>
            <option value="3">Mold</option>
          </select>
        </label>

        <label>
          Project Description
          <textarea
            required
            value={form.project_description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, project_description: event.target.value }))
            }
          />
        </label>

        <button type="submit" disabled={loading || visibleOrders.length === 0}>
          Create Project
        </button>

        {loading && <p>Loading orders...</p>}
        {!loading && visibleOrders.length === 0 && (
          <p className="error">No available orders for this manager. Create an order first.</p>
        )}
        {status && <p className="success">{status}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  )
}
