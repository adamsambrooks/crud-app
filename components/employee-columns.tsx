'use client';

import { ColumnDef } from "@tanstack/react-table"
import { Employee } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

export function createEmployeeColumns(
  handleEdit: (id: number) => void,
  handleDelete: (id: number) => void
): ColumnDef<Employee>[] {
  return [
    {
      accessorKey: "id",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-200"
          >
            No.
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("id")}</div>,
    },
    {
      accessorKey: "firstName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-200"
          >
            First Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("firstName")}</div>,
      filterFn: "includesString",
    },
    {
      accessorKey: "lastName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-200"
          >
            Last Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("lastName")}</div>,
      filterFn: "includesString",
    },
    {
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-200"
          >
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
      filterFn: "includesString",
    },
    {
      accessorKey: "salary",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-200"
          >
            Salary
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = row.getValue("salary") as string
        return <div className="font-medium">${amount}</div>
      },
      sortingFn: (rowA, rowB) => {
        const a = parseFloat(rowA.getValue("salary"))
        const b = parseFloat(rowB.getValue("salary"))
        return a - b
      },
    },
    {
      accessorKey: "date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-200"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div>{row.getValue("date")}</div>,
      sortingFn: (rowA, rowB) => {
        const a = new Date(rowA.getValue("date")).getTime()
        const b = new Date(rowB.getValue("date")).getTime()
        return a - b
      },
    },
    {
      accessorKey: "payType",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-200"
          >
            Pay Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const payType = row.getValue("payType") as string
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {payType}
          </span>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "active",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-200"
          >
            Active
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const isActive = row.getValue("active") as boolean
        return isActive ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Active
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ✗ Inactive
          </span>
        )
      },
      filterFn: (row, id, value) => {
        if (value === "all") return true
        return row.getValue(id) === (value === "true")
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => {
        const employee = row.original

        return (
          <div className="flex gap-2 justify-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleEdit(employee.id)}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(employee.id)}
            >
              Delete
            </Button>
          </div>
        )
      },
      enableHiding: false,
    },
  ]
}
