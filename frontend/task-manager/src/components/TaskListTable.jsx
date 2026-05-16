// ====================================================================
// TASKLISTTABLE COMPONENT'İNİZE KATEGORİ SÜTUNU EKLEMEK İÇİN
// components/TaskListTable.jsx veya components/TaskListTable.js
// ====================================================================
import React from "react";
// ... diğer importlar

const TaskListTable = ({ tableData }) => {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Name
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Status
            </th>
            {/* Kategori sütunu */}
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Category
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Priority
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody>
          {tableData && tableData.length > 0 ? (
            tableData.map((task) => (
              <tr key={task._id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm">
                  {task.title}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </td>
                
                {/* Kategori badge'i */}
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(task.category)}`}>
                    {task.category || 'Other'}
                  </span>
                </td>

                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {new Date(task.dueDate).toLocaleDateString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center py-8 text-gray-500">
                No tasks found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// Kategori renk fonksiyonu ekleyin (component'in dışında)
const getCategoryColor = (category) => {
  switch (category) {
    case 'Work':
      return 'bg-blue-100 text-blue-700';
    case 'School':
      return 'bg-green-100 text-green-700';
    case 'Personal':
      return 'bg-amber-100 text-amber-700';
    case 'Other':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

// Mevcut fonksiyonlarınız
const getStatusColor = (status) => {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'In Progress':
      return 'bg-blue-100 text-blue-700';
    case 'Completed':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'Low':
      return 'bg-green-100 text-green-700';
    case 'Medium':
      return 'bg-orange-100 text-orange-700';
    case 'High':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export default TaskListTable;