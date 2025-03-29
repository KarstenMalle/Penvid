// frontend/src/components/dashboard-skeleton.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      {/* Account Overview Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-20 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">
                      <Skeleton className="h-4 w-24" />
                    </th>
                    <th className="text-left p-4">
                      <Skeleton className="h-4 w-32" />
                    </th>
                    <th className="text-left p-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                    <th className="text-right p-4">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Goals Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
