// ====================================================================
// TASKLISTTABLE COMPONENT'İNİZE KATEGORİ SÜTUNU EKLEMEK İÇİN
// components/TaskListTable.jsx veya components/TaskListTable.js
// ====================================================================

// Mevcut dosyanızı bulun ve aşağıdaki değişiklikleri yapın:

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
            {/* ✅ YENİ SÜTUN: Kategori */}
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
                
                {/* ✅ YENİ: Kategori badge'i */}
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

// ✅ YENİ: Kategori renk fonksiyonu ekleyin (component'in dışında)
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

// ====================================================================
// ÖZET: 3 ADIM
// ====================================================================
// 1. Thead'e yeni <th> ekleyin: Category
// 2. Tbody'ye yeni <td> ekleyin: task.category badge'i
// 3. getCategoryColor fonksiyonunu ekleyin
// 4. "No tasks found" kısmındaki colSpan'ı 4'ten 5'e çıkarın


// import React from "react";
// import moment from "moment";

// const TaskListTable = ({tableData}) => {
//   const getStatusBadgeColor = (status) => {
//     switch (status) {
//       case "Completed":
//         return "bg-green-100 text-green-500 border border-green-200";
//       case "Pending":
//         return "bg-purple-100 text-purple-500 border border-purple-200";
//         case "In Progress":
//         return "bg-cyan-100 text-cyan-500 border border-cyan-200";
      
//       default:
//         return "bg-gray-100 text-gray-500 border border-gray-200";
//     }
// };

// const getPriorityBadgeColor = (priority) => {
//     switch (priority) {
//       case "High":
//         return "bg-red-100 text-red-500 border border-red-200";
//       case "Medium":
//         return "bg-orange-100 text-orange-500 border border-orange-200";
//       case "Low":
//         return "bg-green-100 text-green-500 border border-green-200";
//       default:
//         return "bg-gray-100 text-gray-500 border border-gray-200";
//     }
// };

//     return (
//         <div className="overflow-x-auto p-0 rounded-lg mt-3">
//             <table className="min-w-full">
//                 <thead>
//                     <tr className="text-left">
//                         <th className="py-3 py-4 text-gray-800 font-medium text-[13px]">Name</th>
//                         <th className="py-3 py-4 text-gray-800 font-medium text-[13px]">Status</th>
//                         <th className="py-3 py-4 text-gray-800 font-medium text-[13px]">Priority</th>
//                         <th className="py-3 py-4 text-gray-800 font-medium text-[13px] hidden md: table-cell">Created On</th>
//                         </tr>
//                 </thead>
//                 <tbody>
//                     {tableData.map((task) => (
//                         <tr key={task._id} task={task} className="border-t border-gray-200">
//                             <td className="my-3 mx-4 text-gray-700 text-[13px] line-clamp-1 overflow-hidden">{task.title}</td>
//                             <td className="py-4 px-4">
//                                 <span className={`px-2 py-1 text-xs rounded inline-block ${getStatusBadgeColor(task.status)}`}>{task.status}</span>
//                             </td>
//                             <td className="py-4 px-4">
//                                 <span className={`px-2 py-1 text-xs rounded inline-block ${getPriorityBadgeColor(task.priority)}`}>{task.priority}</span>
//                             </td>
//                             <td className="py-4 px-4 text-gray-700 text-[13px] text-nowrap hidden md:table-cell">{task.createdAt ? moment(task.createdAt).format("Do MMM, YYYY") : "N/A"}</td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//     );
// };

// export default TaskListTable;