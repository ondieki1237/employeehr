'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';

interface ResourceBooking {
  _id: string;
  employee_id: string;
  resource_type: string;
  status: string;
  booking_date: string;
  employee_name?: string;
  approval_date?: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { toast } = useToast();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/bookings`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      setBookings(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bookings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to approve booking');

      toast({
        title: 'Success',
        description: 'Booking approved',
      });
      fetchBookings();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve booking',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (bookingId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to reject booking');

      toast({
        title: 'Success',
        description: 'Booking rejected',
      });
      fetchBookings();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject booking',
        variant: 'destructive',
      });
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.resource_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getResourceColor = (type: string) => {
    const colors: { [key: string]: string } = {
      desk: 'bg-purple-100 text-purple-800',
      car: 'bg-blue-100 text-blue-800',
      'meeting-room': 'bg-green-100 text-green-800',
      parking: 'bg-orange-100 text-orange-800',
      equipment: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resource Bookings</h1>
        <p className="text-gray-600 mt-2">Review and manage resource booking requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Requests</CardTitle>
          <CardDescription>Total: {filteredBookings.length} bookings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Employee</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Resource</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{booking.employee_name || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <Badge className={getResourceColor(booking.resource_type)}>
                        {booking.resource_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {booking.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(booking._id)}
                          >
                            <Check size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(booking._id)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      )}
                      {booking.status !== 'pending' && (
                        <Badge variant="outline">{booking.status.toUpperCase()}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
