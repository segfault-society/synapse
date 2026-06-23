import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  const params = await searchParams;

  // Map common error codes to user-friendly messages
  const getErrorMessage = (error?: string, description?: string) => {
    if (description) return description;
    
    switch (error) {
      case 'access_denied':
        return 'Access was denied. Please try signing in again.';
      case 'invalid_request':
        return 'The authentication request was invalid. Please try again.';
      case 'unauthorized_client':
        return 'The application is not authorized. Please contact support.';
      case 'server_error':
        return 'The authentication server encountered an error. Please try again later.';
      case 'temporarily_unavailable':
        return 'The authentication service is temporarily unavailable. Please try again later.';
      default:
        return error 
          ? `Authentication error: ${error}` 
          : 'An unexpected error occurred during authentication.';
    }
  };

  return (
    <p className="text-sm text-muted-foreground">
      {getErrorMessage(params?.error, params?.error_description)}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-2xl">
                Authentication Failed
              </CardTitle>
              <CardDescription>
                We couldn&apos;t complete the sign-in process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
              <div className="flex flex-col gap-2 pt-4">
                <Button asChild>
                  <Link href="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
