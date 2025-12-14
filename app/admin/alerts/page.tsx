'use client';

import React, { useState, useEffect } from 'react';
import { Search, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';

interface Alert {
  _id: string;
  employee_id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  related_data: any;
  created_at: string;
  read_at?: string;
  employee_name?: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/alerts`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      const alertsArray = Array.isArray(data) ? data : (data.data || []);
      setAlerts(Array.isArray(alertsArray) ? alertsArray : []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch alerts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete alert');

      toast({
        title: 'Success',
        description: 'Alert deleted',
      });
      fetchAlerts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete alert',
        variant: 'destructive',
      });
    }
  };

  const filteredAlerts = Array.isArray(alerts) ? alerts.filter((alert) => {
    const matchesSearch =
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || alert.alert_type === filterType;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    return matchesSearch && matchesType && matchesSeverity;
  }) : [];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'contract_expiry':
        return '📋';
      case 'incomplete_pdp':
        return '📝';
      case 'task_overload':
        return '📚';
      case 'attendance_anomaly':
        return '⏰';
      case 'performance_low':
        return '📊';
      case 'leave_balance_low':
        return '🏖️';
      case 'project_deadline':
        return '🎯';
      case 'feedback_pending':
        return '💬';
      default:
        return '🔔';
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: { [key: string]: string } = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      contract_expiry: 'bg-purple-100 text-purple-800',
      incomplete_pdp: 'bg-blue-100 text-blue-800',
      task_overload: 'bg-red-100 text-red-800',
      attendance_anomaly: 'bg-orange-100 text-orange-800',
      performance_low: 'bg-yellow-100 text-yellow-800',
      leave_balance_low: 'bg-green-100 text-green-800',
      project_deadline: 'bg-pink-100 text-pink-800',
      feedback_pending: 'bg-indigo-100 text-indigo-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts Management</h1>
        <p className="text-gray-600 mt-2">Monitor all organization alerts and notifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{alerts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter((a) => a.severity === 'critical').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {alerts.filter((a) => !a.read_at).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {new Set(alerts.map((a) => a.alert_type)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Alerts</CardTitle>
          <CardDescription>System-wide alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Search size={20} className="text-gray-400" />
              <Input
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Types</option>
              <option value="contract_expiry">Contract Expiry</option>
              <option value="incomplete_pdp">Incomplete PDP</option>
              <option value="task_overload">Task Overload</option>
              <option value="attendance_anomaly">Attendance Anomaly</option>
              <option value="performance_low">Low Performance</option>
              <option value="leave_balance_low">Low Leave Balance</option>
              <option value="project_deadline">Project Deadline</option>
              <option value="feedback_pending">Pending Feedback</option>
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredAlerts.map((alert) => (
              <div
                key={alert._id}
                className={`p-4 border rounded-lg hover:bg-gray-50 ${
                  !alert.read_at ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{getAlertIcon(alert.alert_type)}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold">{alert.title}</h3>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center mt-3">
                      <Badge className={getTypeColor(alert.alert_type)}>
                        {alert.alert_type.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      {!alert.read_at && <Badge variant="outline">Unread</Badge>}
                      <span className="text-xs text-gray-500">
                        For: {alert.employee_name || 'System'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAlert(alert._id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
