'use client';

interface HeaderProps {
  setIsAdding: (value: boolean) => void;
  onLogout: () => void;
}

export default function Header({ setIsAdding, onLogout }: HeaderProps) {
  return (
    <header className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Employee Management Software
      </h1>
      <div className="flex gap-3">
        <button
          onClick={() => setIsAdding(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition"
        >
          Add Employee
        </button>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-md transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
