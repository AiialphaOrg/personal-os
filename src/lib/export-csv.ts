import type { TimelineItem } from "@/lib/storage"

export function exportTransactionsToCsv(transactions: TimelineItem[], currency: string = "₦") {
  if (!transactions || transactions.length === 0) {
    throw new Error("No transactions available to export")
  }

  const headers = ["Date", "Title", "Type", "Category", "Amount", "Currency", "Detail/Note", "ID"]
  
  const rows = transactions.map((t) => {
    const amountVal = t.amount != null ? t.amount : 0
    const cleanDetail = (t.detail || "").replace(/"/g, '""')
    const cleanTitle = (t.title || "").replace(/"/g, '""')
    const cleanCategory = (t.category || "general").replace(/"/g, '""')
    const dateVal = (t as any).rawDate || (t as any).date || t.time || new Date().toISOString().split("T")[0]

    return [
      `"${dateVal}"`,
      `"${cleanTitle}"`,
      `"${t.type}"`,
      `"${cleanCategory}"`,
      amountVal,
      `"${currency}"`,
      `"${cleanDetail}"`,
      `"${t.id}"`,
    ].join(",")
  })

  const csvContent = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `personalos-statement-${new Date().toISOString().split("T")[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
