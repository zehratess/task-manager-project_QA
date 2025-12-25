import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import CustomTooltip from "./CustomTooltip";
import CustomLegend from "./CustomLegend";

const CustomPieChart = ({ data, colors, nameKey = "status" }) => { // ✅ nameKey prop eklendi, default "status"
  return (
    <ResponsiveContainer width="100%" height={325}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey={nameKey} // ✅ Dinamik nameKey
          cx="50%"
          cy="50%"
          outerRadius={130}
          innerRadius={100}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default CustomPieChart;




// import React from "react";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   Tooltip,
//   ResponsiveContainer,
//   Legend,
// } from "recharts";
// import CustomTooltip from "./CustomTooltip";
// import CustomLegend from "./CustomLegend";

// const CustomPieChart = ({ data, colors }) => {
//   return (
//     <ResponsiveContainer width="100%" height={325}>
//       <PieChart>
//         <Pie
//           data={data}
//           dataKey="count"
//           nameKey="status"
//           cx="50%"
//           cy="50%"
//           outerRadius={130}
//           innerRadius={100}
//           labelLine={false}
//         >
//           {data.map((entry, index) => (
//             <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
//           ))}
//         </Pie>
//         <Tooltip content={<CustomTooltip />} />
//         <Legend content={<CustomLegend />} />
//       </PieChart>
//     </ResponsiveContainer>
//   )
// }

// export default CustomPieChart;