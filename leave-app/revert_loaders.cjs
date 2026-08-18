const fs = require('fs');
const files = [
  'd:/IGNITE/leave-app/src/pages/admin/Regions.jsx', 
  'd:/IGNITE/leave-app/src/pages/admin/Roles.jsx', 
  'd:/IGNITE/leave-app/src/pages/admin/Policies.jsx', 
  'd:/IGNITE/leave-app/src/pages/admin/Holidays.jsx', 
  'd:/IGNITE/leave-app/src/pages/admin/LeaveTypes.jsx',
  'd:/IGNITE/leave-app/src/pages/admin/Employees.jsx', 
  'd:/IGNITE/leave-app/src/pages/manager/Approvals.jsx', 
  'd:/IGNITE/leave-app/src/pages/employee/MyRequests.jsx',
  'd:/IGNITE/leave-app/src/pages/manager/Dashboard.jsx',
  'd:/IGNITE/leave-app/src/pages/employee/Dashboard.jsx',
  'd:/IGNITE/leave-app/src/pages/admin/Dashboard.jsx',
  'd:/IGNITE/leave-app/src/pages/manager/Calendar.jsx',
  'd:/IGNITE/leave-app/src/pages/employee/ApplyLeave.jsx',
  'd:/IGNITE/leave-app/src/pages/employee/Profile.jsx',
  'd:/IGNITE/leave-app/src/pages/manager/Team.jsx',
  'd:/IGNITE/leave-app/src/pages/employee/EligibleLeaveTypes.jsx'
];
for (const path of files) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/import (AdminSplitSkeleton|TableSkeleton|DashboardSkeleton|CalendarSkeleton|FormSkeleton) from ['\"].*?['\"];\n?/g, '');
  content = content.replace(/if\s*\(loading\)\s*\{\s*return\s*<(AdminSplitSkeleton|TableSkeleton|DashboardSkeleton|CalendarSkeleton|FormSkeleton) \/>;\s*\}/g, '');
  // Also replace 'if (!stats) return <DashboardSkeleton />;' in admin dashboard
  content = content.replace(/if\s*\(!stats\)\s*\{\s*return\s*<DashboardSkeleton \/>;\s*\}/g, '');
  
  // ensure ShimmerBlock is imported
  if (!content.includes('ShimmerBlock')) {
    content = content.replace(/import React(.*?)\bfrom ['"]react['"];/, "import React$1from 'react';\nimport ShimmerBlock from '../../components/ShimmerBlock';");
  }
  
  fs.writeFileSync(path, content);
  console.log('Reverted ' + path);
}
