'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Briefcase, MapPin, Calendar, DollarSign, Clock, Building2,
  CheckCircle, ArrowLeft, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import API_URL from '@/lib/apiBase';

interface Job {
  _id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary_range?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: string[];
  application_deadline?: string;
  company_name: string;
  created_at: string;
}

interface FormField {
  field_id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface ApplicationForm {
  _id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export default function PublicJobPage() {
  const params = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [applicationForm, setApplicationForm] = useState<ApplicationForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchJob();
  }, [params]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const { companyName, positionIndex } = params;
      const response = await fetch(
        `${API_URL}/api/jobs/public/${companyName}/${positionIndex}`
      );
      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        // Fetch application form
        fetchApplicationForm(data.data._id);
      } else {
        setError(data.message);
      }
    } catch (err) {
      console.error('Error fetching job:', err);
      setError('Failed to load job posting');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationForm = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/application-forms/job/${jobId}`);
      const data = await response.json();
      if (data.success) {
        setApplicationForm(data.data);
      }
    } catch (err) {
      console.error('Error fetching form:', err);
    }
  };

  const handleSubmitApplication = async () => {
    if (!job || !applicationForm) return;

    // Validate required fields
    const missingFields = applicationForm.fields
      .filter(field => field.required && !formData[field.field_id])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/job-applications/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job._id,
          form_id: applicationForm._id,
          applicant_name: formData.full_name || formData.name || 'Unknown',
          applicant_email: formData.email,
          applicant_phone: formData.phone,
          answers: (applicationForm.fields || []).map((field) => ({
            field_id: field.field_id,
            label: field.label,
            value: formData[field.field_id] ?? null,
          })),
          resume_url: formData.resume_url,
          cover_letter: formData.cover_letter,
          source: new URLSearchParams(window.location.search).get('source') || 'direct',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        toast({
          title: 'Application Submitted!',
          description: 'We have received your application. A confirmation email has been sent.',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: err instanceof Error ? err.message : 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error || 'This job posting is no longer available'}
            </p>
            <Button onClick={() => window.location.href = '/'}>
              <ArrowLeft size={16} className="mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatSalary = (range: typeof job.salary_range) => {
    if (!range) return null;
    return `${range.currency} ${range.min.toLocaleString()} - ${range.max.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Building2 size={16} />
            <span className="font-semibold">{job.company_name}</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin size={18} />
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase size={18} />
              {job.employment_type}
            </span>
            {job.salary_range && (
              <span className="flex items-center gap-1">
                <DollarSign size={18} />
                {formatSalary(job.salary_range)}
              </span>
            )}
            {job.application_deadline && (
              <span className="flex items-center gap-1">
                <Clock size={18} />
                Apply by {new Date(job.application_deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
              </CardContent>
            </Card>

            {job.responsibilities && job.responsibilities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Responsibilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {job.requirements && job.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {job.benefits && job.benefits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.benefits.map((benefit, idx) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Apply for this position</CardTitle>
                <CardDescription>Join our team at {job.company_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" size="lg">
                      Apply Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto backdrop-blur-sm">
                    <DialogHeader>
                      <DialogTitle>
                        {submitted ? 'Application Submitted!' : applicationForm?.title || 'Application Form'}
                      </DialogTitle>
                      <DialogDescription>
                        {submitted 
                          ? 'Thank you for your application. We will review it and get back to you soon.'
                          : applicationForm?.description || `Apply for ${job.title}`
                        }
                      </DialogDescription>
                    </DialogHeader>

                    {!submitted ? (
                      <div className="space-y-4 py-4">
                        {applicationForm?.fields.map((field) => (
                          <div key={field.field_id}>
                            <Label>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            
                            {field.type === 'textarea' ? (
                              <Textarea
                                placeholder={field.placeholder}
                                value={formData[field.field_id] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.field_id]: e.target.value })}
                                rows={4}
                              />
                            ) : field.type === 'select' ? (
                              <Select
                                value={formData[field.field_id] || ''}
                                onValueChange={(value) => setFormData({ ...formData, [field.field_id]: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={field.placeholder || 'Select...'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options?.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.type === 'checkbox' ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Checkbox
                                  checked={formData[field.field_id] || false}
                                  onCheckedChange={(checked) => setFormData({ ...formData, [field.field_id]: checked })}
                                />
                                <span className="text-sm">{field.placeholder}</span>
                              </div>
                            ) : field.type === 'file' ? (
                              <Input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // In production, upload to cloud storage and store URL
                                    setFormData({ ...formData, [field.field_id]: file.name });
                                  }
                                }}
                              />
                            ) : (
                              <Input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={formData[field.field_id] || ''}
                                onChange={(e) => setFormData({ ...formData, [field.field_id]: e.target.value })}
                              />
                            )}
                          </div>
                        ))}

                        <div className="flex gap-2 justify-end pt-4">
                          <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSubmitApplication} disabled={submitting}>
                            <Send size={16} className="mr-2" />
                            {submitting ? 'Submitting...' : 'Submit Application'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                        <p className="text-gray-600 mb-6">
                          A confirmation email has been sent to {formData.email}
                        </p>
                        <Button onClick={() => setIsApplyDialogOpen(false)}>
                          Close
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <p className="text-sm text-gray-600 text-center">
                  By applying, you agree to our terms and conditions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600">Department</p>
                  <p className="font-semibold">{job.department}</p>
                </div>
                <div>
                  <p className="text-gray-600">Employment Type</p>
                  <p className="font-semibold capitalize">{job.employment_type}</p>
                </div>
                <div>
                  <p className="text-gray-600">Location</p>
                  <p className="font-semibold">{job.location}</p>
                </div>
                <div>
                  <p className="text-gray-600">Posted</p>
                  <p className="font-semibold">
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
