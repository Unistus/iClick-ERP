
import DashboardLayout from "@/components/layout/dashboard-layout"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  Search, 
  Download, 
  ArrowUpDown, 
  Filter,
  Package,
  AlertTriangle,
  RefreshCw
} from "lucide-react"

const stockItems = [
  { sku: "MED-001", name: "Panadol Extra", category: "OTC", stock: 120, reorder: 50, status: "Good" },
  { sku: "MED-002", name: "Amoxil Forte", category: "Prescription", stock: 12, reorder: 25, status: "Critical" },
  { sku: "MED-003", name: "Piriton Syrup", category: "OTC", stock: 45, reorder: 40, status: "Warning" },
  { sku: "MED-004", name: "Zinc Tablets", category: "Supplements", stock: 200, reorder: 100, status: "Good" },
  { sku: "MED-005", name: "Surgical Spirit", category: "First Aid", stock: 8, reorder: 15, status: "Critical" },
]

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Stock Vault</h1>
            <p className="text-muted-foreground">Manage your product variants and tracking.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="gap-2">
              <Download className="size-4" /> Export
            </Button>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20">
              <Plus className="size-4" /> Add Product
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Package className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total SKUs</p>
                  <p className="text-2xl font-bold">1,402</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold">42</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <RefreshCw className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
                  <p className="text-2xl font-bold">18</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-none ring-1 ring-border/50 shadow-xl">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search inventory..." className="pl-10 h-10 bg-secondary/20 border-none ring-1 ring-border focus-visible:ring-primary" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="size-4" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="size-4" /> Sort
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Re-order Point</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.map((item) => (
                    <TableRow key={item.sku} className="hover:bg-secondary/20 transition-colors">
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="font-bold">{item.stock}</TableCell>
                      <TableCell className="text-muted-foreground">{item.reorder}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.status === 'Good' ? 'secondary' : item.status === 'Critical' ? 'destructive' : 'default'}
                          className={`
                            ${item.status === 'Good' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                            ${item.status === 'Warning' ? 'bg-amber-500/10 text-amber-500' : ''}
                            hover:bg-opacity-20
                          `}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
