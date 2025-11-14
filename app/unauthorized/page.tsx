import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signOut } from '@/app/(auth)/auth';
import { BackButton } from '@/components/back-button';

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Access Denied</CardTitle>
                    <CardDescription>
                        You don&apos;t have permission to access this page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center">
                        <p className="text-muted-foreground">
                            Please contact your administrator if you believe this is an error.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <BackButton />
                        <form action={async () => {
                            'use server';
                            await signOut();
                        }}>
                            <Button type="submit" variant="outline" className="flex-1">
                                Sign Out
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
