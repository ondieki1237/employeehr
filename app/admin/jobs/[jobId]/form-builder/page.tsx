'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';
import API_URL from '@/lib/apiBase';

interface FormField {
  field_id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  order: number;
}

export default function FormBuilderPage({ params }: { params: { jobId: string } }) {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch job details and existing form if any
    fetchJobAndForm();
  }, [params.jobId]);

  const fetchJobAndForm = async () => {
    try {
      // Fetch job
      const jobRes = await fetch(`${API_URL}/api/jobs/${params.jobId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const jobData = await jobRes.json();
      if (jobData.success) {
        setJobTitle(jobData.data.title);
        setFormTitle(`${jobData.data.title} Application Form`);
      }

      // Try to fetch existing form
      const formRes = await fetch(`${API_URL}/api/application-forms/job/${params.jobId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const formData = await formRes.json();
      if (formData.success) {
        setFormTitle(formData.data.title);
        setFormDescription(formData.data.description || '');
        setFields(formData.data.fields || []);
      } else {
        // Add default fields
        setFields([
          { field_id: 'full_name', label: 'Full Name', type: 'text', required: true, order: 0 },
          { field_id: 'email', label: 'Email Address', type: 'email', required: true, order: 1 },
          { field_id: 'phone', label: 'Phone Number', type: 'phone', required: true, order: 2 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const addField = () => {
    const newField: FormField = {
      field_id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      order: fields.length,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;
    
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    // Update order
    newFields.forEach((field, i) => {
      field.order = i;
    });
    
    setFields(newFields);
  };

  const saveForm = async () => {
    if (!formTitle.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Form title is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/application-forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          job_id: params.jobId,
          title: formTitle,
          description: formDescription,
          fields: fields.map((f, i) => ({ ...f, order: i })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Application form saved successfully',
        });
        router.push('/admin/jobs');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save form',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Application Form Builder</h1>
          <p className="text-gray-600 mt-2">Job: {jobTitle}</p>
        </div>
        <Button onClick={saveForm} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Form'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Form Settings</CardTitle>
            <CardDescription>Configure your application form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Form Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Software Engineer Application"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Instructions for applicants..."
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Form Fields</h3>
                <Button size="sm" onClick={addField}>
                  <Plus size={16} className="mr-1" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <Card key={field.field_id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-1 mt-2">
                          <Button size="sm" variant="ghost" onClick={() => moveField(index, 'up')} disabled={index === 0}>
                            ↑
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1}>
                            ↓
                          </Button>
                        </div>
                        <div className="flex-1 space-y-2">
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="Field label"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={field.type}
                              onValueChange={(value) => updateField(index, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="phone">Phone</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="select">Select</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="file">File Upload</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={field.placeholder || ''}
                              onChange={(e) => updateField(index, { placeholder: e.target.value })}
                              placeholder="Placeholder..."
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: !!checked })}
                              />
                              <Label className="text-sm">Required</Label>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeField(index)}
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Form Preview</CardTitle>
            <CardDescription>How applicants will see the form</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{formTitle || 'Form Title'}</h3>
              {formDescription && <p className="text-sm text-gray-600 mt-1">{formDescription}</p>}
            </div>
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.field_id}>
                  <Label>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.type === 'textarea' ? (
                    <Textarea placeholder={field.placeholder} disabled />
                  ) : field.type === 'select' ? (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || 'Select...'} />
                      </SelectTrigger>
                    </Select>
                  ) : field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Checkbox disabled />
                      <span className="text-sm">{field.placeholder || 'Option'}</span>
                    </div>
                  ) : (
                    <Input type={field.type} placeholder={field.placeholder} disabled />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
