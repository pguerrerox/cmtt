import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCustomerById, updateCustomer } from '../shared/api/customers.js'
import { createFacility, deleteFacility, getFacilities, updateFacility } from '../shared/api/facilities.js'
import { getManagersPublic } from '../shared/api/managers.js'
import { getProjectEngineers } from '../shared/api/projectEngineers.js'
import { getSalesManagers } from '../shared/api/salesManagers.js'

const initialFacilityForm = {
  name: '',
  address: '',
  contacts: ''
}

function toNullableId(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function AdminCustomerDetailsPage() {
  const { customerId } = useParams()
  const [customer, setCustomer] = useState(null)
  const [projectManagers, setProjectManagers] = useState([])
  const [salesManagers, setSalesManagers] = useState([])
  const [projectEngineers, setProjectEngineers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [customerForm, setCustomerForm] = useState({
    name: '',
    headquarters_address: '',
    headquarter_contacts: '',
    project_manager_id: '',
    sales_manager_id: '',
    project_engineer_id: ''
  })
  const [facilityForm, setFacilityForm] = useState(initialFacilityForm)
  const [editingFacilityId, setEditingFacilityId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const numericCustomerId = useMemo(() => Number(customerId), [customerId])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const [customerResponse, facilitiesResponse, managersResponse, salesResponse, engineersResponse] = await Promise.all([
        getCustomerById(customerId),
        getFacilities(),
        getManagersPublic(),
        getSalesManagers(),
        getProjectEngineers()
      ])

      const customerData = customerResponse?.data
      setCustomer(customerData)
      setCustomerForm({
        name: customerData?.name ?? '',
        headquarters_address: customerData?.headquarters_address ?? '',
        headquarter_contacts: customerData?.headquarter_contacts ?? '',
        project_manager_id: customerData?.project_manager_id ? String(customerData.project_manager_id) : '',
        sales_manager_id: customerData?.sales_manager_id ? String(customerData.sales_manager_id) : '',
        project_engineer_id: customerData?.project_engineer_id ? String(customerData.project_engineer_id) : ''
      })
      setProjectManagers(managersResponse ?? [])
      setSalesManagers(salesResponse?.data ?? [])
      setProjectEngineers(engineersResponse?.data ?? [])

      const allFacilities = facilitiesResponse?.data ?? []
      setFacilities(allFacilities.filter((item) => Number(item.customer_id) === numericCustomerId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [customerId])

  async function onSaveCustomer(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    try {
      await updateCustomer(customerId, {
        name: customerForm.name,
        headquarters_address: customerForm.headquarters_address,
        headquarter_contacts: customerForm.headquarter_contacts,
        project_manager_id: toNullableId(customerForm.project_manager_id),
        sales_manager_id: toNullableId(customerForm.sales_manager_id),
        project_engineer_id: toNullableId(customerForm.project_engineer_id)
      })
      setStatus('Customer updated successfully.')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function onSaveFacility(event) {
    event.preventDefault()
    setStatus('')
    setError('')

    const payload = {
      name: facilityForm.name,
      address: facilityForm.address,
      contacts: facilityForm.contacts,
      customer_id: numericCustomerId
    }

    try {
      if (editingFacilityId) {
        await updateFacility(editingFacilityId, payload)
        setStatus('Facility updated successfully.')
      } else {
        await createFacility(payload)
        setStatus('Facility created successfully.')
      }
      setEditingFacilityId(null)
      setFacilityForm(initialFacilityForm)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  function onEditFacility(facility) {
    setEditingFacilityId(facility.id)
    setFacilityForm({
      name: facility.name ?? '',
      address: facility.address ?? '',
      contacts: facility.contacts ?? ''
    })
  }

  async function onDeleteFacility(facility) {
    if (!window.confirm(`Delete facility ${facility.name}?`)) return
    setStatus('')
    setError('')
    try {
      await deleteFacility(facility.id)
      setStatus('Facility deleted successfully.')
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="stack gap-lg">
      <div className="panel hero compact">
        <p className="eyebrow">Customer Details</p>
        <h2>{customer?.name || `Customer #${customerId}`}</h2>
        <p>Manage customer information and facilities.</p>
      </div>

      <div className="panel-header">
        <Link to="/admin/customers" className="ghost as-link">Back to Customers</Link>
      </div>

      {loading && <p>Loading customer...</p>}
      {!loading && error && <p className="error">{error}</p>}
      {!loading && status && <p className="success">{status}</p>}

      {!loading && customer && (
        <form className="panel form-grid" onSubmit={onSaveCustomer}>
          <h3>Customer Information</h3>

          <label>
            Name
            <input
              required
              value={customerForm.name}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            Headquarters Address
            <input
              required
              value={customerForm.headquarters_address}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, headquarters_address: event.target.value }))}
            />
          </label>

          <label>
            Headquarters Contacts
            <textarea
              required
              value={customerForm.headquarter_contacts}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, headquarter_contacts: event.target.value }))}
            />
          </label>

          <label>
            Project Manager
            <select
              required
              value={customerForm.project_manager_id}
              onChange={(event) =>
                setCustomerForm((prev) => ({ ...prev, project_manager_id: event.target.value }))
              }
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
              value={customerForm.sales_manager_id}
              onChange={(event) =>
                setCustomerForm((prev) => ({ ...prev, sales_manager_id: event.target.value }))
              }
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
              value={customerForm.project_engineer_id}
              onChange={(event) =>
                setCustomerForm((prev) => ({ ...prev, project_engineer_id: event.target.value }))
              }
            >
              <option value="">Select project engineer...</option>
              {projectEngineers.map((item) => (
                <option key={item.id} value={item.id}>{item.fullname}</option>
              ))}
            </select>
          </label>

          <button type="submit">Update Customer</button>
        </form>
      )}

      {!loading && customer && (
        <>
          <form className="panel form-grid" onSubmit={onSaveFacility}>
            <h3>{editingFacilityId ? 'Edit Facility' : 'Add Facility'}</h3>

            <label>
              Facility Name
              <input
                required
                value={facilityForm.name}
                onChange={(event) => setFacilityForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label>
              Address
              <textarea
                value={facilityForm.address}
                onChange={(event) =>
                  setFacilityForm((prev) => ({ ...prev, address: event.target.value }))
                }
              />
            </label>

            <label>
              Contacts
              <textarea
                value={facilityForm.contacts}
                onChange={(event) =>
                  setFacilityForm((prev) => ({ ...prev, contacts: event.target.value }))
                }
              />
            </label>

            <button type="submit">{editingFacilityId ? 'Update Facility' : 'Save Facility'}</button>
            {editingFacilityId && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditingFacilityId(null)
                  setFacilityForm(initialFacilityForm)
                }}
              >
                Cancel Edit
              </button>
            )}
          </form>

          <div className="panel">
            <div className="panel-header">
              <h3>Facilities</h3>
              <button type="button" className="ghost" onClick={loadData}>Refresh</button>
            </div>

            <ul className="entity-list">
              {facilities.length === 0 && <li className="entity-row empty">No facilities for this customer yet.</li>}
              {facilities.map((facility) => (
                <li key={facility.id} className="entity-row">
                  <div>
                    <strong>{facility.name}</strong>
                    <p>{facility.address || '-'}</p>
                  </div>
                  <span>{facility.contacts || '-'}</span>
                  <span />
                  <div className="entity-actions">
                    <button type="button" className="ghost" onClick={() => onEditFacility(facility)}>Edit</button>
                    <button
                      type="button"
                      className="ghost danger-text"
                      onClick={() => onDeleteFacility(facility)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
