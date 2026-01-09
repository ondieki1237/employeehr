"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, AlertCircle, Download } from "lucide-react";
import { getToken } from "@/lib/auth";
import API_URL from "@/lib/apiBase";

interface Question {
  field_id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  order: number;
}

interface Response {
  _id: string;
  pool_id: string;
  responses: Record<string, any>;
  submitted_at: string;
}

interface Pool {
  _id: string;
  name: string;
  description?: string;
  survey_id: string;
  total_responses: number;
  status: string;
}

interface Survey {
  _id: string;
  name: string;
  form_config: {
    questions: Question[];
  };
}

export default function PoolResponsesPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params.surveyId as string;
  const poolId = params.poolId as string;

  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState<Pool | null>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, [poolId, surveyId]);

  const fetchData = async () => {
    try {
      const token = getToken();

      // Fetch survey details
      const surveyResponse = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (surveyResponse.ok) {
        const surveyData = await surveyResponse.json();
        setSurvey(surveyData.data?.survey || surveyData.survey);
      }

      // Fetch pool details
      const poolResponse = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}/pools/${poolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (poolResponse.ok) {
        const poolData = await poolResponse.json();
        setPool(poolData.data?.pool || poolData.pool);
      }

      // Fetch responses
      const responsesResponse = await fetch(`${API_URL}/api/feedback-surveys/${surveyId}/pools/${poolId}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (responsesResponse.ok) {
        const responsesData = await responsesResponse.json();
        setResponses(responsesData.data?.responses || responsesData.responses || []);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getQuestionLabel = (fieldId: string): string => {
    const question = survey?.form_config.questions.find((q) => q.field_id === fieldId);
    return question?.label || fieldId;
  };

  const formatResponseValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const exportToCSV = () => {
    if (!survey || responses.length === 0) return;

    const questions = survey.form_config.questions;
    const headers = ["Response #", "Submitted At", ...questions.map((q) => q.label)];

    const rows = responses.map((response, index) => {
      const row = [
        `Response ${index + 1}`,
        new Date(response.submitted_at).toLocaleString(),
      ];
      questions.forEach((q) => {
        const value = response.responses[q.field_id];
        row.push(formatResponseValue(value || "N/A"));
      });
      return row;
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${pool?.name || "pool"}_responses.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !pool || !survey) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Pool or survey not found"}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Survey
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/feedback-360/surveys/${surveyId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Survey
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{pool.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Survey: {survey.name}
            </p>
          </div>
        </div>
        {responses.length > 0 && (
          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>
        )}
      </div>

      {/* Pool Info */}
      <Card>
        <CardHeader>
          <CardTitle>Pool Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pool.description && <p className="text-sm">{pool.description}</p>}
          <div className="flex gap-4">
            <Badge variant={pool.status === "active" ? "default" : "secondary"}>
              {pool.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {responses.length} response(s) received
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Responses */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Responses</CardTitle>
          <CardDescription>
            All anonymous feedback submissions for this pool
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No responses submitted yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {responses.map((response, responseIndex) => (
                <Card key={response._id} className="border-l-4 border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Response #{responseIndex + 1}</h3>
                      <span className="text-sm text-muted-foreground">
                        {new Date(response.submitted_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {survey.form_config.questions
                        .sort((a, b) => a.order - b.order)
                        .map((question) => {
                          const value = response.responses[question.field_id];
                          return (
                            <div key={question.field_id} className="border-l-2 border-muted pl-4">
                              <p className="font-medium text-sm mb-1">{question.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {value ? formatResponseValue(value) : "No response"}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
