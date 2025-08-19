"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, Database, Search, Filter, Download } from "lucide-react"
import type { RowData } from "@/app/api/upload/route"
import { useRouter } from "next/navigation"

interface DataState {
  data: RowData[]
  filteredData: RowData[]
  isLoading: boolean
  error: string | null
  selectedSilo: string
  searchTerm: string
}

export default function DataPage() {
    const router = useRouter()
  const [state, setState] = useState<DataState>({
    data: [],
    filteredData: [],
    isLoading: true,
    error: null,
    selectedSilo: "all",
    searchTerm: "",
  })

  const siloOptions = [
    { value: "all", label: "All Silos" },
    { value: "Silo 1", label: "Silo 1" },
    { value: "Silo 2", label: "Silo 2" },
    { value: "Silo 3", label: "Silo 3" },
    { value: "Silo 4", label: "Silo 4" },
    { value: "Silo 5", label: "Silo 5" },
    { value: "Silo 6", label: "Silo 6" },
    { value: "Silo 7", label: "Silo 7" },
    { value: "Silo 8", label: "Silo 8" },
    { value: "Silo 9", label: "Silo 9" },
    { value: "Silo 10", label: "Silo 10" },
    { value: "Silo 11", label: "Silo 11" },

  ]

  const fetchData = async (silo?: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const url = silo && silo !== "all" ? `/api/upload?silo=${encodeURIComponent(silo)}` : "/api/upload"
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }

      const data = await response.json()
      setState((prev) => ({
        ...prev,
        data: data.data,
        filteredData: data.data,
        isLoading: false,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to fetch data",
        isLoading: false,
      }))
    }
  }

  useEffect(() => {
    fetchData(state.selectedSilo)
    if (localStorage.getItem("admin_authenticated") !== "true") {
      router.push("/admin/login");
    }
  }, [state.selectedSilo])

  useEffect(() => {
    // Filter data based on search term
    const filtered = state.data.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(state.searchTerm.toLowerCase())),
    )
    setState((prev) => ({ ...prev, filteredData: filtered }))
  }, [state.searchTerm, state.data])

  const handleSiloChange = (value: string) => {
    setState((prev) => ({ ...prev, selectedSilo: value }))
  }

  const handleSearchChange = (value: string) => {
    setState((prev) => ({ ...prev, searchTerm: value }))
  }

  const exportToCSV = () => {
    if (state.filteredData.length === 0) return

    const headers = Object.keys(state.filteredData[0])
    const csvContent = [
      headers.join(","),
      ...state.filteredData.map((row) => headers.map((header) => `"${String(row[header] || "")}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `placement_data_${state.selectedSilo}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getTableHeaders = () => {
    if (state.filteredData.length === 0) return []
    return Object.keys(state.filteredData[0]).filter((key) => key !== "id")
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Placement Data</h1>
            <p className="text-muted-foreground">View and filter placement data by silo</p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Overview
              </CardTitle>
              <CardDescription>
                {state.isLoading
                  ? "Loading data..."
                  : `Showing ${state.filteredData.length} of ${state.data.length} records`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search data..."
                      value={state.searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={state.selectedSilo} onValueChange={handleSiloChange}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Select Silo" />
                    </SelectTrigger>
                    <SelectContent>
                      {siloOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={exportToCSV}
                    disabled={state.filteredData.length === 0}
                    className="whitespace-nowrap bg-transparent"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-primary/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{state.data.length}</div>
                  <div className="text-sm text-muted-foreground">Total Records</div>
                </div>
                <div className="bg-blue-500/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{state.filteredData.length}</div>
                  <div className="text-sm text-muted-foreground">Filtered Results</div>
                </div>
                <div className="bg-green-500/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {new Set(state.data.map((row) => row.silo)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Unique Silos</div>
                </div>
              </div>

              {/* Loading State */}
              {state.isLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading data...</span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {state.error && (
                <div className="text-center py-12">
                  <div className="text-red-500 mb-2">Error loading data</div>
                  <div className="text-sm text-muted-foreground">{state.error}</div>
                  <Button variant="outline" onClick={() => fetchData(state.selectedSilo)} className="mt-4">
                    Try Again
                  </Button>
                </div>
              )}

              {/* Data Table */}
              {!state.isLoading && !state.error && (
                <div className="border rounded-lg overflow-hidden">
                  {state.filteredData.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-muted-foreground mb-2">No data found</div>
                      <div className="text-sm text-muted-foreground">
                        {state.searchTerm ? "Try adjusting your search terms" : "Upload some data to get started"}
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {getTableHeaders().map((header) => (
                              <TableHead key={header} className="whitespace-nowrap">
                                {header === "silo" ? (
                                  <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Silo
                                  </div>
                                ) : (
                                  header.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                                )}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {state.filteredData.slice(0, 100).map((row, index) => (
                            <TableRow key={index}>
                              {getTableHeaders().map((header) => (
                                <TableCell key={header} className="whitespace-nowrap">
                                  {header === "silo" ? (
                                    <Badge variant="secondary">{String(row[header] || "")}</Badge>
                                  ) : (
                                    String(row[header] || "")
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {state.filteredData.length > 100 && (
                        <div className="p-4 text-center text-sm text-muted-foreground border-t">
                          Showing first 100 records of {state.filteredData.length} total results. Use search or export
                          to access all data.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
