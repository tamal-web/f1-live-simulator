import { Card } from '@/components/ui/card'

export default function LoadingState() {
  return (
    <Card className="bg-secondary/50 p-6 backdrop-blur">
      <div className="space-y-4">
        <div className="h-6 w-24 rounded bg-border animate-pulse" />
        <div className="h-32 w-full rounded bg-border animate-pulse" />
      </div>
    </Card>
  )
}
