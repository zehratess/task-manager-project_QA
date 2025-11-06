import React from 'react'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white">
        <p className="">{payload[0].name}</p>
        <p className="">
          Count: <span className="">{payload[0].value}</span>
        </p>
      </div>
    );
  }

  return null;
};

export default CustomTooltip