'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { Employee } from '@/lib/types';
import { DataTable } from '@/components/data-table';
import { createEmployeeColumns } from '@/components/employee-columns';
import AddEmployee from '@/components/AddEmployee';
import EditEmployee from '@/components/EditEmployee';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesTablePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    const employee = employees.find((e) => e.id === id);
    if (employee) {
      setSelectedEmployee(employee);
      setIsEditing(true);
    }
  };

  const handleDelete = async (id: number) => {
    const employee = employees.find((e) => e.id === id);
    if (!employee) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/employees/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `${employee.firstName} ${employee.lastName}'s data has been deleted.`,
            showConfirmButton: false,
            timer: 1500,
          });
          fetchEmployees();
        }
      } catch (error) {
        await Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to delete employee.',
          showConfirmButton: true,
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const columns = createEmployeeColumns(handleEdit, handleDelete);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto">
        {!isAdding && !isEditing && (
          <>
            {/* Header */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Advanced Employee Management
                  </h1>
                  <p className="text-gray-600">
                    Powerful data table with filtering, sorting, and search
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href="/dashboard">
                    <Button variant="outline">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Classic View
                    </Button>
                  </Link>
                  <Button onClick={() => setIsAdding(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Employee
                  </Button>
                  <Button variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <DataTable columns={columns} data={employees} />
          </>
        )}
        {isAdding && (
          <AddEmployee
            setIsAdding={setIsAdding}
            onSuccess={fetchEmployees}
          />
        )}
        {isEditing && selectedEmployee && (
          <EditEmployee
            employee={selectedEmployee}
            setIsEditing={setIsEditing}
            onSuccess={fetchEmployees}
          />
        )}
      </div>
    </div>
  );
}
