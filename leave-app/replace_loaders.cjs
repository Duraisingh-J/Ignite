const fs = require('fs');

const adminFiles = ['Regions.jsx', 'Roles.jsx', 'Policies.jsx', 'Holidays.jsx', 'LeaveTypes.jsx'];
for (const file of adminFiles) {
  const path = 'd:/IGNITE/leave-app/src/pages/admin/' + file;
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('AdminSplitSkeleton')) {
    content = content.replace(/import React(.*?)\bfrom ['"]react['"];/, "import React$1from 'react';\nimport AdminSplitSkeleton from '../../components/skeletons/AdminSplitSkeleton';");
    content = content.replace(/if\s*\(loading\)\s*\{\s*return\s*<div[^>]*>Loading…<\/div>;\s*\}/, "if (loading) {\n    return <AdminSplitSkeleton />;\n  }");
    fs.writeFileSync(path, content);
    console.log('Updated ' + file);
  }
}

const tableFiles = [
  'd:/IGNITE/leave-app/src/pages/admin/Employees.jsx', 
  'd:/IGNITE/leave-app/src/pages/manager/Approvals.jsx', 
  'd:/IGNITE/leave-app/src/pages/employee/MyRequests.jsx'
];
for (const path of tableFiles) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('TableSkeleton')) {
    content = content.replace(/import React(.*?)\bfrom ['"]react['"];/, "import React$1from 'react';\nimport TableSkeleton from '../../components/skeletons/TableSkeleton';");
    content = content.replace(/if\s*\(loading\)\s*\{\s*return\s*<div[^>]*>Loading…<\/div>;\s*\}/, "if (loading) {\n    return <TableSkeleton />;\n  }");
    fs.writeFileSync(path, content);
    console.log('Updated ' + path);
  }
}

const dashboardFiles = [
  'd:/IGNITE/leave-app/src/pages/manager/Dashboard.jsx',
  'd:/IGNITE/leave-app/src/pages/employee/Dashboard.jsx'
];
for (const path of dashboardFiles) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('DashboardSkeleton')) {
    content = content.replace(/import React(.*?)\bfrom ['"]react['"];/, "import React$1from 'react';\nimport DashboardSkeleton from '../../components/skeletons/DashboardSkeleton';");
    content = content.replace(/if\s*\(loading\)\s*\{\s*return\s*<div[^>]*>Loading…<\/div>;\s*\}/, "if (loading) {\n    return <DashboardSkeleton />;\n  }");
    fs.writeFileSync(path, content);
    console.log('Updated ' + path);
  }
}

const calendarFiles = [
  'd:/IGNITE/leave-app/src/pages/manager/Calendar.jsx'
];
for (const path of calendarFiles) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('CalendarSkeleton')) {
    content = content.replace(/import React(.*?)\bfrom ['"]react['"];/, "import React$1from 'react';\nimport CalendarSkeleton from '../../components/skeletons/CalendarSkeleton';");
    content = content.replace(/if\s*\(loading\)\s*\{\s*return\s*<div[^>]*>Loading…<\/div>;\s*\}/, "if (loading) {\n    return <CalendarSkeleton />;\n  }");
    fs.writeFileSync(path, content);
    console.log('Updated ' + path);
  }
}

const formFiles = [
  'd:/IGNITE/leave-app/src/pages/employee/ApplyLeave.jsx',
  'd:/IGNITE/leave-app/src/pages/employee/Profile.jsx',
  'd:/IGNITE/leave-app/src/pages/manager/Team.jsx',
  'd:/IGNITE/leave-app/src/pages/employee/EligibleLeaveTypes.jsx'
];
for (const path of formFiles) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf8');
  if (!content.includes('FormSkeleton')) {
    content = content.replace(/import React(.*?)\bfrom ['"]react['"];/, "import React$1from 'react';\nimport FormSkeleton from '../../components/skeletons/FormSkeleton';");
    content = content.replace(/if\s*\(loading\)\s*\{\s*return\s*<div[^>]*>Loading…<\/div>;\s*\}/, "if (loading) {\n    return <FormSkeleton />;\n  }");
    fs.writeFileSync(path, content);
    console.log('Updated ' + path);
  }
}
