import React from 'react';

// Generic skeleton loader component
export const SkeletonLoader = ({ height = '20px', width = '100%', className = '' }) => (
  <div
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={{ height, width }}
  />
);

// Card skeleton for appointment/doctor cards
export const CardSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow p-6 space-y-4">
        <SkeletonLoader height="20px" />
        <SkeletonLoader height="16px" width="80%" />
        <SkeletonLoader height="16px" width="60%" />
        <SkeletonLoader height="40px" width="100%" />
      </div>
    ))}
  </div>
);

// Table skeleton for appointments list
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          {[...Array(cols)].map((_, i) => (
            <th key={i} className="p-4">
              <SkeletonLoader height="16px" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...Array(rows)].map((_, rowIdx) => (
          <tr key={rowIdx} className="border-b">
            {[...Array(cols)].map((_, colIdx) => (
              <td key={colIdx} className="p-4">
                <SkeletonLoader height="16px" width={`${80 + Math.random() * 20}%`} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-4">
          <SkeletonLoader height="16px" width="60%" className="mb-2" />
          <SkeletonLoader height="24px" width="40%" />
        </div>
      ))}
    </div>

    {/* Chart or content area */}
    <div className="bg-white rounded-lg shadow p-6">
      <SkeletonLoader height="300px" className="mb-4" />
    </div>

    {/* List items */}
    <CardSkeleton count={3} />
  </div>
);

// Form skeleton
export const FormSkeleton = () => (
  <div className="space-y-4">
    {[...Array(4)].map((_, i) => (
      <div key={i}>
        <SkeletonLoader height="16px" width="30%" className="mb-2" />
        <SkeletonLoader height="40px" width="100%" />
      </div>
    ))}
    <SkeletonLoader height="44px" width="100%" />
  </div>
);

export default SkeletonLoader;
