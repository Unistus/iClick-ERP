
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
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-headline font-bold">Stock Vault</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Download className="size-4" /> Export
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2 h-9">
              <Plus className="size-4" /> Add Product
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="size-8 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Package className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Total SKUs</p>
                  <p className="text-lg font-bold">1,402</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="size-8 rounded bg-accent/10 text-accent flex items-center justify-center">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Out of Stock</p>
                  <p className="text-lg font-bold">42</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-none ring-1 ring-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-4">
                <div className="size-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                  <RefreshCw className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Pending Orders</p>
                  <p className="text-lg font-bold">18</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-none ring-1 ring-border/50 shadow-lg">
          <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4 py-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search inventory..." className="pl-9 h-9 bg-secondary/20 border-none text-xs" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                <Filter className="size-3.5" /> Filter
              </Button>
              <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                <ArrowUpDown className="size-3.5" /> Sort
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">SKU</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Product Name</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Category</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Stock</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Re-order</TableHead>
                  <TableHead className="h-9 text-[10px] uppercase font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((item) => (
                  <TableRow key={item.sku} className="hover:bg-secondary/10 h-10">
                    <TableCell className="font-mono text-[10px]">{item.sku}</TableCell>
                    <TableCell className="text-sm font-medium">{item.name}</TableCell>
                    <TableCell className="text-xs">{item.category}</TableCell>
                    <TableCell className="text-xs font-bold">{item.stock}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.reorder}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.status === 'Good' ? 'secondary' : item.status === 'Critical' ? 'destructive' : 'default'}
                        className={`text-[9px] h-4 px-1.5
                          ${item.status === 'Good' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                          ${item.status === 'Warning' ? 'bg-amber-500/10 text-amber-500' : ''}
                        `}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
