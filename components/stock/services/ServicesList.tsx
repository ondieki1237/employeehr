'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Edit, Plus } from 'lucide-react'
import CreateServiceDialog from './CreateServiceDialog'
import EditServiceDialog from './EditServiceDialog'

interface Service {
  _id: string
  name: string
  category: string
  sellingPrice: number
  isRecurring: boolean
  intervalDays: number
  isActive: boolean
}

export default function ServicesList() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/stock/services')
      const data = await res.json()
      if (data.success) setServices(data.data)
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (service: Service) => {
    setSelectedService(service)
    setIsEditOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    try {
      const res = await fetch(`/api/stock/services/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setServices(services.filter(s => s._id !== id))
      }
    } catch (error) {
      console.error('Failed to delete service:', error)
    }
  }

  const filteredServices = services.filter(s =>
    (search === '' || s.name.toLowerCase().includes(search.toLowerCase())) &&
    (category === 'all' || s.category === category)
  )

  const categories = [...new Set(services.map(s => s.category))]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Services Management</CardTitle>
          <CardDescription>Create and manage services for your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Service
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map(service => (
                  <TableRow key={service._id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>KES {service.sellingPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      {service.isRecurring ? `Every ${service.intervalDays} days` : 'No'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateServiceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          fetchServices()
          setIsCreateOpen(false)
        }}
      />

      {selectedService && (
        <EditServiceDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          service={selectedService}
          onSuccess={() => {
            fetchServices()
            setIsEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
