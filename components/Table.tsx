'use client';

import { Employee } from '@/lib/types';

interface TableProps {
  employees: Employee[];
  handleEdit: (id: number) => void;
  handleDelete: (id: number) => void;
}

export default function Table({ employees, handleEdit, handleDelete }: TableProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">No.</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">First Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Last Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Salary</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.length > 0 ? (
              employees.map((employee, index) => (
                <tr key={employee.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-700">{index + 1}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{employee.firstName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{employee.lastName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{employee.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">${employee.salary}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{employee.date}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(employee.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-4 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-4 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No employees found. Add your first employee to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
